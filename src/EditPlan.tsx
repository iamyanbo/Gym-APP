import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import RNPickerSelect from 'react-native-picker-select';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { exercisesList } from './exercises';

/**
 * EditPlan component that allows editing of existing workout plans
 */
function EditPlan({ route }) {
  const navigation = useNavigation();
  const { fileUri, workoutData, workoutName } = route.params;
  
  // State variables
  const [editablePlan, setEditablePlan] = useState({
    type: workoutName || 'My Workout Plan',
    days: []
  });
  const [exerciseList, setExerciseList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [activeExercise, setActiveExercise] = useState(null);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [isAddDayModalVisible, setIsAddDayModalVisible] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [insertAtIndex, setInsertAtIndex] = useState(null);

  const EXERCISES_FILE_PATH = FileSystem.documentDirectory + 'exercises.txt';

  // Initialize the editable plan from the workout data passed via route params
  useEffect(() => {
    if (workoutData) {
      if (Array.isArray(workoutData)) {
        // Handle old array format - convert to new JSON format
        setEditablePlan({
          type: workoutName || 'My Workout Plan',
          days: [...workoutData]
        });
      } else if (typeof workoutData === 'object' && workoutData.days) {
        // Handle new JSON format directly
        setEditablePlan({
          type: workoutData.type || workoutName || 'My Workout Plan',
          days: [...workoutData.days]
        });
      } else {
        console.error('Invalid workout data format:', workoutData);
        Alert.alert('Error', 'Failed to load workout data for editing');
      }
      setIsLoading(false);
    } else {
      // Create a new empty plan if no data provided
      setEditablePlan({
        type: workoutName || 'My Workout Plan',
        days: []
      });
      setIsLoading(false);
    }
  }, [workoutData, workoutName]);

  // Load exercises from file on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Filter exercises based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredExercises([]);
      return;
    }
    
    const lowerSearchText = searchText.toLowerCase();
    const matches = exerciseList.filter(exercise => 
      exercise.toLowerCase().includes(lowerSearchText)
    );
    setFilteredExercises(matches);
  }, [searchText, exerciseList]);

  const loadExercises = async () => {
    try {
      // Check if file exists in app storage
      const fileInfo = await FileSystem.getInfoAsync(EXERCISES_FILE_PATH);
      
      if (!fileInfo.exists) {
        // Use the imported exercises
        setExerciseList(exercisesList);
        
        // Save to app storage for future edits
        await FileSystem.writeAsStringAsync(EXERCISES_FILE_PATH, exercisesList.join('\n'));
      } else {
        console.log('File exists, loading exercises...');
        // Read from existing file in app storage
        const content = await FileSystem.readAsStringAsync(EXERCISES_FILE_PATH);
        setExerciseList(content.split('\n').filter(exercise => exercise.trim() !== ''));
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Fallback to imported list
      setExerciseList(exercisesList);
    }
  };

  const handleSavePlan = async () => {
    try {
      // Validation checks
      if (editablePlan.days.length === 0) {
        Alert.alert("No workout days", "Please add at least one day to save the plan.");
        return;
      }
      
      if (editablePlan.days.every(day => day.exercises.length === 0)) {
        Alert.alert("No exercises", "Please add at least one exercise to save the plan.");
        return;
      }
      
      if (editablePlan.days.some(day => 
        day.exercises.some(exercise => exercise.name.trim() === '')
      )) {
        Alert.alert("Empty Exercise Name", "Please ensure all exercises have a name before saving.");
        return;
      }
      
      if (editablePlan.days.some(day => day.exercises.length === 0)) {
        Alert.alert("Empty Day", "Please ensure all days have at least one exercise before saving.");
        return;
      }
      
      // Prepare the data in the new JSON format
      const newPlanData = {
        type: editablePlan.type,
        days: editablePlan.days
      };
      
      const newPlan = JSON.stringify(newPlanData, null, 2);
      
      // If we're updating an existing file, use the same URI
      if (fileUri) {
        await FileSystem.writeAsStringAsync(fileUri, newPlan);
        console.log('Updated Plan Saved at:', fileUri);
        
        // Navigate back to WorkoutPage with the same fileUri
        navigation.navigate('WorkoutPage', { fileUri });
      } else {
        // If somehow we don't have a fileUri, create a new file
        const originalName = editablePlan.type;
        const safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const fileName = `${safeName.replace(/\s+/g, '_')}_plan.json`;
        const newFileUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.writeAsStringAsync(newFileUri, newPlan);
        console.log('New Plan Saved at:', newFileUri);
        
        navigation.navigate('WorkoutPage', { fileUri: newFileUri });
      }
      
      Alert.alert("Success", "Your workout plan has been updated!");
      
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert(
        "Save Error", 
        "Failed to save the workout plan. " + error.message
      );
    }
  };

  const saveNewExercise = async (exerciseName) => {
    if (exerciseName.trim() === '') return;
    
    try {
      // Check if exercise already exists
      if (exerciseList.includes(exerciseName.trim()) ||
          exerciseList.some(ex => ex.toLowerCase() === exerciseName.trim().toLowerCase())) {
        return;
      }
      // Add to state
      const updatedList = [...exerciseList, exerciseName.trim()];
      setExerciseList(updatedList);
      
      // Save to file
      await FileSystem.writeAsStringAsync(
        EXERCISES_FILE_PATH, 
        updatedList.join('\n')
      );
      
      // Use the new exercise in the current active field
      if (activeExercise) {
        updateExercise(activeExercise.dayIdx, activeExercise.exIdx, 'name', exerciseName.trim());
      }
      
      setIsSearchModalVisible(false); // Also close the search modal
    } catch (error) {
      console.error('Error saving new exercise:', error);
    }
  };

  const updateExercise = (dayIdx, exIdx, field, value) => {
    const updated = [...editablePlan.days];
    let parsedValue = value;
    
    // Handle the 'sets' field specially to avoid NaN
    if (field === 'sets') {
      // Convert to number only if value is not empty
      if (value.trim() === '') {
        parsedValue = 0; // Default to 0 if empty
      } else {
        const parsed = parseInt(value);
        // Check if parsing resulted in a valid number
        parsedValue = isNaN(parsed) ? 0 : parsed;
      }
    }
    
    const updatedExercise = { 
      ...updated[dayIdx].exercises[exIdx], 
      [field]: parsedValue 
    };
    updated[dayIdx].exercises[exIdx] = updatedExercise;
    setEditablePlan({ ...editablePlan, days: updated });
  };

  const updateLocation = (dayIdx, value) => {
    if (!value) return; // Guard against empty selection
    
    const updated = [...editablePlan.days];
    updated[dayIdx] = {
      ...updated[dayIdx],
      location: value
    };
    
    setEditablePlan({
      ...editablePlan,
      days: updated
    });
  };

  const deleteExercise = async (exerciseToDelete) => {
    try {
      // Confirm deletion
      Alert.alert(
        "Delete Exercise",
        `Are you sure you want to delete "${exerciseToDelete}"?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Remove from state
              const updatedList = exerciseList.filter(ex => ex !== exerciseToDelete);
              setExerciseList(updatedList);
              
              // Update filtered list
              setFilteredExercises(filteredExercises.filter(ex => ex !== exerciseToDelete));
              
              // Save to file
              await FileSystem.writeAsStringAsync(
                EXERCISES_FILE_PATH,
                updatedList.join('\n')
              );
              
              // Check if the deleted exercise is currently being used in the workout plan
              const planHasExercise = editablePlan.days.some(day => 
                day.exercises.some(ex => ex.name === exerciseToDelete)
              );
              if (planHasExercise) {
                // Remove from the workout plan
                const updatedPlan = { ...editablePlan };
                updatedPlan.days.forEach(day => {
                  day.exercises = day.exercises.filter(ex => ex.name !== exerciseToDelete);
                });
                Alert.alert(
                  "Exercise Deleted",
                  `"${exerciseToDelete}" has been removed from the workout plan.`,
                  [{ text: "OK" }]
                );
                setEditablePlan(updatedPlan);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const deleteWorkoutExercise = (dayIdx, exIdx) => {
    Alert.alert(
      "Delete Exercise",
      "Are you sure you want to remove this exercise from your workout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = [...editablePlan.days];
            // Filter out the exercise at the specified index
            updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, index) => index !== exIdx);
            setEditablePlan({ ...editablePlan, days: updated });
          }
        }
      ]
    );
  };

  const handleExerciseSelect = (dayIdx, exIdx, exerciseName) => {
    updateExercise(dayIdx, exIdx, 'name', exerciseName);
    setSearchText('');
    setIsSearchModalVisible(false);
  };

  const openExerciseSearch = (dayIdx, exIdx, currentName) => {
    setActiveExercise({dayIdx, exIdx});
    setSearchText(currentName);
    setIsSearchModalVisible(true);
  };

  const addExerciseToDay = (dayIdx) => {
    const updated = [...editablePlan.days];
    // Add new exercise with default values (3 sets, 8 reps, 0 weight)
    updated[dayIdx].exercises.push({
      name: "",
      sets: 3,
      reps: "8",
      weight: "0"
    });
    
    setEditablePlan({ ...editablePlan, days: updated });
    
    // Open the exercise search modal for the new exercise
    const newExerciseIdx = updated[dayIdx].exercises.length - 1;
    setTimeout(() => {
      openExerciseSearch(dayIdx, newExerciseIdx, "");
    }, 100);
  };

  // Function to open the "Add Day" modal with a specific index
  const openAddDayModal = (index = null) => {
    setInsertAtIndex(index);
    setNewDayName('');
    setIsAddDayModalVisible(true);
  };

  const addDay = () => {
    if (!newDayName.trim()) {
      Alert.alert("Invalid Day Name", "Please enter a valid day name");
      return;
    }
  
    if (editablePlan.days.some(day => day.day.toLowerCase() === newDayName.trim().toLowerCase())) {
      Alert.alert("Day Already Exists", "This day already exists in your plan");
      return;
    }
  
    const newDay = {
      day: newDayName.trim(),
      location: "Gym",
      exercises: [],
    };
  
    const updated = [...editablePlan.days];
    if (insertAtIndex !== null && insertAtIndex >= 0 && insertAtIndex <= updated.length) {
      updated.splice(insertAtIndex, 0, newDay);
    } else {
      updated.push(newDay);
    }
  
    setEditablePlan({ ...editablePlan, days: updated });
    setNewDayName('');
    setInsertAtIndex(null);
    setIsAddDayModalVisible(false);
  };

  const removeDay = (dayIdx) => {
    Alert.alert(
      "Remove Day",
      `Are you sure you want to remove ${editablePlan.days[dayIdx].day} from your plan?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updated = [...editablePlan.days];
            updated.splice(dayIdx, 1);
            setEditablePlan({ ...editablePlan, days: updated });
          }
        }
      ]
    );
  };

  const updateDayName = (dayIdx, value) => {
    const updated = [...editablePlan.days];
    updated[dayIdx] = {
      ...updated[dayIdx],
      day: value
    };
    
    setEditablePlan({
      ...editablePlan,
      days: updated
    });
  };

  const updatePlanName = (value) => {
    setEditablePlan({
      ...editablePlan,
      type: value
    });
  };

  const updateDayFocus = (dayIdx, value) => {
    const updated = [...editablePlan.days];
    updated[dayIdx] = {
      ...updated[dayIdx],
      focus: value
    };
    
    setEditablePlan({
      ...editablePlan,
      days: updated
    });
  };

  if (isLoading) {
    return (
      <View style={loadingContainer}>
        <Text>Loading plan data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ padding: 16, marginTop: 40 }}>
      <View style={titleContainer}>
        <TextInput
          style={planTitleInput}
          value={editablePlan.type}
          onChangeText={updatePlanName}
          placeholder="Plan Name"
        />
        <Text style={subtitleText}>Edit Workout Plan</Text>
        <View style={titleUnderline} />
      </View>

      {editablePlan.days.length === 0 ? (
        <View style={emptyPlanContainer}>
          <Text style={emptyPlanText}>No workout days yet. Add your first workout day!</Text>
        </View>
      ) : (
        <>
          {/* Add Day Button at the top */}
          <TouchableOpacity
            style={addDayButton}
            onPress={() => openAddDayModal(0)}
          >
            <Text style={addDayButtonText}>+ Insert Day Here</Text>
          </TouchableOpacity>
          
          {editablePlan.days.map((day, dayIdx) => (
            <View key={`day-section-${dayIdx}`}>
              {dayIdx > 0 && <View style={divider} />}
              
              <View style={daySection}>
                <View style={dayHeaderRow}>
                  <View>
                    <TextInput
                      style={dayTitleInput}
                      value={day.day}
                      onChangeText={(value) => updateDayName(dayIdx, value)}
                      placeholder="Day Name"
                    />
                  </View>
                  <TouchableOpacity
                    style={removeDayButton}
                    onPress={() => removeDay(dayIdx)}
                  >
                    <Text style={removeDayButtonText}>Remove Day</Text>
                  </TouchableOpacity>
                </View>
              
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: 'gray', marginRight: 6 }}>Location:</Text>
                  <View style={{ flex: 1 }}>
                    <RNPickerSelect
                      useNativeAndroidPickerStyle={false}
                      onValueChange={(value) => {
                        updateLocation(dayIdx, value);
                      }}
                      items={[
                        { label: 'Gym', value: 'Gym' },
                        { label: 'Home', value: 'Home' },
                      ]}
                      value={day.location}
                      style={locationPickerStyle}
                      placeholder={{}}
                      key={`location-picker-${dayIdx}-${Date.now()}`}
                    />
                  </View>
                </View>

                {/* Add Focus Field */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: 'gray', marginRight: 6 }}>Focus:</Text>
                  <TextInput
                    style={focusInput}
                    value={day.focus || ''}
                    onChangeText={(value) => updateDayFocus(dayIdx, value)}
                    placeholder="e.g. Upper Body, Legs, etc."
                  />
                </View>

                {day.exercises.map((exercise, exIdx) => (
                  <View key={`exercise-${dayIdx}-${exIdx}`} style={exerciseCard}>
                    <View style={cardHeaderRow}>
                      <Text style={cardTitle}>Exercise {exIdx + 1}</Text>
                      <TouchableOpacity
                        style={cardDeleteButton}
                        onPress={() => deleteWorkoutExercise(dayIdx, exIdx)}
                      >
                        <Text style={cardDeleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={inputLabel}>Exercise Name</Text>
                      <TouchableOpacity
                        style={inputField}
                        onPress={() => openExerciseSearch(dayIdx, exIdx, exercise.name)}
                      >
                        <Text>{exercise.name || "Select an exercise"}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={inputLabel}>Sets</Text>
                        <TextInput
                          style={inputField}
                          value={exercise.sets.toString()}
                          onChangeText={(text) => updateExercise(dayIdx, exIdx, 'sets', text)}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={inputLabel}>Reps/Seconds</Text>
                        <TextInput
                          style={inputField}
                          value={exercise.reps}
                          onChangeText={(text) => updateExercise(dayIdx, exIdx, 'reps', text)}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={inputLabel}>Weight</Text>
                        <TextInput
                          style={inputField}
                          value={exercise.weight || ''}
                          onChangeText={(text) => updateExercise(dayIdx, exIdx, 'weight', text)}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                ))}
                
                {/* Add Exercise Button */}
                <TouchableOpacity
                  style={addExerciseButton}
                  onPress={() => addExerciseToDay(dayIdx)}
                >
                  <Text style={addExerciseButtonText}>+ Add Exercise</Text>
                </TouchableOpacity>
              </View>

              {/* Add "Insert Day" button after each day */}
              <TouchableOpacity
                style={addDayButton}
                onPress={() => openAddDayModal(dayIdx + 1)}
              >
                <Text style={addDayButtonText}>+ Insert Day Here</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Search Modal - Separate from the ScrollView */}
      <Modal
        visible={isSearchModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSearchModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsSearchModalVisible(false)}>
          <View style={modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[modalContent, { maxHeight: '80%' }]}>
                <Text style={modalTitle}>Find Exercise</Text>

                {/* Search input row with + button */}
                <View style={searchInputRow}>
                  <TextInput
                    style={[modalInput, { flex: 1 }]}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search or type new exercise"
                    autoFocus
                  />
                  {searchText.trim() !== '' && (
                    <TouchableOpacity 
                      style={addButton}
                      onPress={() => saveNewExercise(searchText)}
                    >
                      <Text style={addButtonText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Exercise list */}
                <FlatList
                  data={filteredExercises}
                  keyExtractor={(item, index) => `exercise-option-${index}`}
                  style={dropdownList}
                  renderItem={({ item }) => (
                    <View style={dropdownItemContainer}>
                      <TouchableOpacity
                        style={dropdownItemContent}
                        onPress={() => activeExercise &&
                          handleExerciseSelect(activeExercise.dayIdx, activeExercise.exIdx, item)
                        }
                      >
                        <Text>{item}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={deleteButton}
                        onPress={() => deleteExercise(item)}
                      >
                        <Text style={deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={() => (
                    <View style={emptyListContainer}>
                      <Text style={{ textAlign: 'center', padding: 12, color: '#888' }}>
                        No matching exercises. Add it to the list!
                      </Text>
                    </View>
                  )}
                />

                <TouchableOpacity
                  style={closeDropdownButton}
                  onPress={() => {
                    setIsSearchModalVisible(false);
                    setSearchText('');
                  }}
                >
                  <Text style={closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add Day Modal */}
      <Modal
        visible={isAddDayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddDayModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAddDayModalVisible(false)}>
          <View style={modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[modalContent, { maxHeight: '50%' }]}>
                <Text style={modalTitle}>
                  {insertAtIndex !== null && insertAtIndex < editablePlan.days.length 
                    ? `Insert Day Before ${editablePlan.days[insertAtIndex]?.day || 'Next Day'}`
                    : insertAtIndex === 0
                      ? 'Add Day at Beginning'
                      : 'Add New Workout Day'}
                </Text>

                <TextInput
                  style={dayNameInput}
                  value={newDayName}
                  onChangeText={setNewDayName}
                  placeholder="Enter day name (e.g., Monday, Leg Day)"
                  autoFocus
                />

                <View style={modalButtonsRow}>
                  <TouchableOpacity
                    style={[modalButton, modalCancelButton]}
                    onPress={() => {
                      setNewDayName('');
                      setInsertAtIndex(null);
                      setIsAddDayModalVisible(false);
                    }}
                  >
                    <Text style={modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[modalButton, modalAddButton]}
                    onPress={addDay}
                  >
                    <Text style={modalAddButtonText}>
                      {insertAtIndex !== null ? 'Insert Day' : 'Add Day'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Action Buttons */}
      <View style={actionButtonsContainer}>
        <TouchableOpacity
          style={cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={saveButton}
          onPress={handleSavePlan}
        >
          <Text style={saveButtonText}>Update Plan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Styles

const loadingContainer = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 100,
};

const planTitleInput = {
  fontSize: 32,
  fontWeight: '800',
  color: '#222',
  textAlign: 'center',
  padding: 4,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
};

const focusInput = {
  flex: 1, 
  fontSize: 14,
  color: '#333',
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
  paddingVertical: 4,
};

const locationPickerStyle = {
  inputIOS: {
    fontSize: 16,
    color: '#333',
    textDecorationLine: 'underline',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  inputAndroid: {
    fontSize: 16,
    color: '#333',
    textDecorationLine: 'underline',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  placeholder: {
    color: '#333',
  }
};

const divider = {
  height: 1,
  backgroundColor: '#e0e0e0',
  marginVertical: 24,
};

const daySection = {
  paddingVertical: 8,
};

const dayHeaderRow = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
};

const dayTitleInput = {
  fontSize: 24,
  fontWeight: '700',
  color: '#222',
  paddingVertical: 4,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
};

const removeDayButton = {
  backgroundColor: '#fff0f0',
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: '#ffcccc',
};

const removeDayButtonText = {
  color: '#ff3b30',
  fontWeight: '600',
  fontSize: 14,
};

const addDayButton = {
  backgroundColor: '#e8f4ff',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#c8e0ff',
  marginBottom: 16,
  alignItems: 'center',
};

const addDayButtonText = {
  color: '#3a86ff',
  fontWeight: '600',
  fontSize: 16,
};

const actionButtonsContainer = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 30,
  marginBottom: 80,
  gap: 12,
};

const cancelButton = {
  flex: 1,
  backgroundColor: '#f0f0f0',
  paddingVertical: 16,
  borderRadius: 8,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#ddd',
};

const cancelButtonText = {
  color: '#666',
  fontSize: 16,
  fontWeight: '600',
};

const saveButton = {
  flex: 2,
  backgroundColor: '#3a86ff',
  paddingVertical: 16,
  borderRadius: 8,
  alignItems: 'center',
};

const saveButtonText = {
  color: 'white',
  fontSize: 18,
  fontWeight: '700',
};

const exerciseCard = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 16,
  marginVertical: 12,
  elevation: 1,
  borderWidth: 1,
  borderColor: '#e0e0e0',
};

// Empty plan state
const emptyPlanContainer = {
  padding: 20,
  backgroundColor: '#f5f5f5',
  borderRadius: 10,
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 20,
};

const emptyPlanText = {
  color: '#666',
  fontSize: 16,
  textAlign: 'center',
};

// Card header with delete button
const cardHeaderRow = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
};

const cardDeleteButton = {
  width: 26,
  height: 26,
  borderRadius: 13,
  backgroundColor: '#f8f8f8',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#ddd',
};

const cardDeleteButtonText = {
  color: '#ff3b30',
  fontSize: 18,
  fontWeight: 'bold',
  lineHeight: 22,
};

const cardTitle = {
  fontSize: 18,
  fontWeight: '600',
  color: '#333',
};

const inputField = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 10,
  backgroundColor: '#f9f9f9',
  textAlign: 'center',
  marginTop: 4,
};

const inputLabel = {
  fontSize: 10,
  color: 'gray',
  marginBottom: 2,
  marginTop: 6,
};

const titleContainer = {
  marginTop: 10,
  marginBottom: 20,
  alignItems: 'center',
};

const subtitleText = {
  fontSize: 18,
  color: '#666',
  marginTop: 4,
  fontWeight: '500',
};

const titleUnderline = {
  height: 3,
  width: 220,
  backgroundColor: '#3a86ff',
  borderRadius: 1.5,
  marginTop: 14,
};

// Add Exercise Button Styles
const addExerciseButton = {
  backgroundColor: '#f0f0f0',
  paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginTop: 16,
};

const addExerciseButtonText = {
  color: '#3a86ff',
  fontWeight: '600',
  fontSize: 16,
};

// Modal Styles
const modalOverlay = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
};

const modalContent = {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 20,
  width: '90%',
  maxHeight: '80%',
};

const modalTitle = {
  fontSize: 24,
  fontWeight: '700',
  color: '#333',
  marginBottom: 16,
};

const modalInput = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: '#f9f9f9',
  textAlign: 'left',
  height: 48,
  marginBottom: 0,
  flex: 1,
};

const searchInputRow = {
  flexDirection: 'row',
  alignItems: 'flex-end', // forces both elements to bottom-align
  marginBottom: 16,
};

const addButton = {
  backgroundColor: '#3a86ff',
  borderRadius: 8,
  height: 48,
  width: 48,
  marginLeft: 8,
  justifyContent: 'center',
  alignItems: 'center',
};

const addButtonText = {
  color: 'white',
  fontSize: 28,
  fontWeight: 'bold',
  lineHeight: 28,
  textAlign: 'center',
  paddingTop: 6, // Try values between 1–3 if needed
};

const dropdownList = {
  maxHeight: '50%',
  width: '100%',
  marginBottom: 16,
};

const dropdownItemContainer = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 8,
  paddingHorizontal: 12,
};

const dropdownItemContent = {
  flex: 1,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
};

const deleteButton = {
  backgroundColor: '#ffcccc',
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
};

const deleteButtonText = {
  color: '#ff3b30',
  fontSize: 16,
  fontWeight: '600',
};

const emptyListContainer = {
  padding: 20,
  alignItems: 'center',
};

const closeDropdownButton = {
  backgroundColor: '#3a86ff',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 16,
};

const closeButtonText = {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
};

const modalButtonsRow = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 8,
};

const modalButton = {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
};

const modalCancelButton = {
  backgroundColor: '#f0f0f0',
  borderWidth: 1,
  borderColor: '#ddd',
};

const modalCancelButtonText = {
  color: '#666',
  fontSize: 16,
  fontWeight: '600',
};

const modalAddButton = {
  backgroundColor: '#3a86ff',
};

const modalAddButtonText = {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
};

const dayNameInput = {
  borderWidth: 1,
  borderColor: '#bbb',
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: '#fefefe',
  fontSize: 18,
  height: 56,
  marginBottom: 20,
};

export default EditPlan;