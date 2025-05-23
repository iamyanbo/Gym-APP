import { workoutPlans } from './workoutPlans';
import { View, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Text } from './TextOverride';
import RNPickerSelect from 'react-native-picker-select';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { exercisesList } from './exercises';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';

type Exercise = {
    name: string;
    sets: number;
    reps: string;
    weight: string;
};

type WorkoutDay = {
    day: string;
    location: string;
    focus?: string;
    exercises: Exercise[];
};

type WorkoutPlan = {
    type: string;
    days: WorkoutDay[];
};

const plans = Object.keys(workoutPlans);
const EXERCISES_FILE_PATH = FileSystem.documentDirectory + 'exercises.txt';

function WorkoutPlanViewer() {
    const { theme, isDark } = useTheme();
    const [selectedPlan, setSelectedPlan] = useState(plans[0]);
    const [editablePlan, setEditablePlan] = useState<WorkoutPlan>(JSON.parse(JSON.stringify(workoutPlans[selectedPlan])));
    const [exerciseList, setExerciseList] = useState<string[]>([]);
    const [searchText, setSearchText] = useState('');
    const [filteredExercises, setFilteredExercises] = useState<string[]>([]);
    const [activeExercise, setActiveExercise] = useState<{dayIdx: number, exIdx: number} | null>(null);
    const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
    const [isAddDayModalVisible, setIsAddDayModalVisible] = useState(false);
    const [newDayName, setNewDayName] = useState('');
    const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const navigation = useNavigation();

    const handleSavePlan = async () => {
      try {
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
        
        const jsonString = JSON.stringify(editablePlan, null, 2);
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const originalName = editablePlan.type;
        const safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const fileName = `${safeName.replace(/\s+/g, '_')}_${timestamp}.json`;
        const fileUri = FileSystem.documentDirectory + fileName;

        await FileSystem.writeAsStringAsync(fileUri, jsonString);
        navigation.navigate('WorkoutPage', { fileUri });
      } catch (error) {
        console.error('Error saving plan:', error);
        Alert.alert(
          "Save Error", 
          "Failed to save the workout plan. " + error.message
        );
      }
    };

    useEffect(() => {
        loadExercises();
    }, []);

    useEffect(() => {
        setEditablePlan(JSON.parse(JSON.stringify(workoutPlans[selectedPlan])));
    }, [selectedPlan]);

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

    useEffect(() => {
        const checkFirstVisit = async () => {
            try {
                const hasVisited = await AsyncStorage.getItem('hasVisitedWorkoutPlanner');
                if (hasVisited) {
                    setIsFirstVisit(false);
                } else {
                    await AsyncStorage.setItem('hasVisitedWorkoutPlanner', 'true');
                }
            } catch (error) {
                console.error('Error checking first visit status:', error);
            }
        };
        
        checkFirstVisit();
    }, []);

    const loadExercises = async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(EXERCISES_FILE_PATH);
        
        if (!fileInfo.exists) {
          setExerciseList(exercisesList);
          await FileSystem.writeAsStringAsync(EXERCISES_FILE_PATH, exercisesList.join('\n'));
        } else {
          const content = await FileSystem.readAsStringAsync(EXERCISES_FILE_PATH);
          setExerciseList(content.split('\n').filter(exercise => exercise.trim() !== ''));
        }
      } catch (error) {
        console.error('Error loading exercises:', error);
        setExerciseList(exercisesList);
      }
    };

    const saveNewExercise = async (exerciseName: string) => {
        if (exerciseName.trim() === '') return;
        
        try {
            if (exerciseList.includes(exerciseName.trim()) ||
                exerciseList.some(ex => ex.toLowerCase() === exerciseName.trim().toLowerCase())) {
                return;
            }
            const updatedList = [...exerciseList, exerciseName.trim()];
            setExerciseList(updatedList);
            
            await FileSystem.writeAsStringAsync(
                EXERCISES_FILE_PATH, 
                updatedList.join('\n')
            );
            
            if (activeExercise) {
                updateExercise(activeExercise.dayIdx, activeExercise.exIdx, 'name', exerciseName.trim());
            }
            
            setIsSearchModalVisible(false);
        } catch (error) {
            console.error('Error saving new exercise:', error);
        }
    };

    const updateExercise = (dayIdx: number, exIdx: number, field: keyof Exercise, value: string) => {
        const updated = [...editablePlan.days];
        let parsedValue = value;
        
        if (field === 'sets') {
          if (value.trim() === '') {
            parsedValue = '0';
          } else {
            const parsed = parseInt(value);
            parsedValue = isNaN(parsed) ? '0' : parsed.toString();
          }
        }
        
        const updatedExercise = { 
            ...updated[dayIdx].exercises[exIdx], 
            [field]: field === 'sets' ? parseInt(parsedValue) : parsedValue 
        };
        updated[dayIdx].exercises[exIdx] = updatedExercise;
        setEditablePlan({ ...editablePlan, days: updated });
    };

    const updateLocation = (dayIdx: number, value: string) => {
        if (!value) return;
        
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

    const updateDayFocus = (dayIdx: number, value: string) => {
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

    const deleteExercise = async (exerciseToDelete: string) => {
      try {
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
                          const updatedList = exerciseList.filter(ex => ex !== exerciseToDelete);
                          setExerciseList(updatedList);
                          
                          setFilteredExercises(filteredExercises.filter(ex => ex !== exerciseToDelete));
                          
                          await FileSystem.writeAsStringAsync(
                              EXERCISES_FILE_PATH,
                              updatedList.join('\n')
                          );
                          
                          const planHasExercise = editablePlan.days.some(day => 
                              day.exercises.some(ex => ex.name === exerciseToDelete)
                          );
                          if (planHasExercise) {
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

    const deleteWorkoutExercise = (dayIdx: number, exIdx: number) => {
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
                        updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, index) => index !== exIdx);
                        setEditablePlan({ ...editablePlan, days: updated });
                    }
                }
            ]
        );
    };

    const handleExerciseSelect = (dayIdx: number, exIdx: number, exerciseName: string) => {
        updateExercise(dayIdx, exIdx, 'name', exerciseName);
        setSearchText('');
        setIsSearchModalVisible(false);
    };

    const openExerciseSearch = (dayIdx: number, exIdx: number, currentName: string) => {
        setActiveExercise({dayIdx, exIdx});
        setSearchText(currentName);
        setIsSearchModalVisible(true);
    };

    const addExerciseToDay = (dayIdx: number) => {
        const updated = [...editablePlan.days];
        updated[dayIdx].exercises.push({
            name: "",
            sets: 3,
            reps: "8",
            weight: "0"
        });
        
        setEditablePlan({ ...editablePlan, days: updated });
        
        const newExerciseIdx = updated[dayIdx].exercises.length - 1;
        setTimeout(() => {
            openExerciseSearch(dayIdx, newExerciseIdx, "");
        }, 100);
    };

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

    const removeDay = (dayIdx: number) => {
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

    const updateDayName = (dayIdx: number, value: string) => {
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

    return (
        <ScrollView style={{ padding: 16, backgroundColor: theme.background }}>
            <TouchableOpacity
              style={[customPickerButton, {
                borderColor: theme.border,
                backgroundColor: theme.card,
              }]}
              onPress={() => setIsPlanModalVisible(true)}
            >
              <Text style={[customPickerButtonText, { color: theme.text.dark }]}>
                {workoutPlans[selectedPlan]?.type || "Select a Plan"}
              </Text>
            </TouchableOpacity>

            <View style={titleContainer}>
              <TextInput
                style={[mainTitle, { 
                  textAlign: 'center', 
                  borderBottomWidth: 1, 
                  borderColor: theme.border,
                  color: theme.text.dark,
                  paddingVertical: 4 
                }]}
                value={editablePlan.type}
                onChangeText={(text) => setEditablePlan({ ...editablePlan, type: text })}
                placeholder="Enter Plan Name"
                placeholderTextColor={theme.text.light}
              />
              <Text style={[subtitleText, { color: theme.text.medium }]}>Workout Plan</Text>
              <View style={[titleUnderline, { backgroundColor: theme.primary }]} />
            </View>

            {editablePlan.days.length === 0 ? (
              <View style={[emptyPlanContainer, { backgroundColor: isDark ? theme.card : '#f5f5f5' }]}>
                <Text style={[emptyPlanText, { color: theme.text.medium }]}>No workout days yet. Add your first workout day!</Text>
                <TouchableOpacity
                  style={[addDayButton, { 
                    backgroundColor: isDark ? theme.card : '#e8f4ff',
                    borderColor: isDark ? theme.border : '#c8e0ff'
                  }]}
                  onPress={() => openAddDayModal(0)}
                >
                  <Text style={[addDayButtonText, { color: theme.primary }]}>+ Add First Day</Text>
                </TouchableOpacity>
              </View>
            ) : (
                <>
                    <TouchableOpacity
                        style={[addDayButton, { 
                          backgroundColor: isDark ? theme.card : '#e8f4ff',
                          borderColor: isDark ? theme.border : '#c8e0ff'
                        }]}
                        onPress={() => openAddDayModal(0)}
                    >
                        <Text style={[addDayButtonText, { color: theme.primary }]}>+ Insert Day Here</Text>
                    </TouchableOpacity>

                    {editablePlan.days.map((day, dayIdx) => (
                        <View key={`day-section-${dayIdx}`}>
                            {dayIdx > 0 && <View style={[divider, { backgroundColor: theme.border }]} />}
                            
                            <View style={daySection}>
                                <View style={dayHeaderRow}>
                                    <View>
                                        <TextInput
                                            style={[dayTitleInput, { 
                                              color: theme.text.dark,
                                              borderBottomColor: theme.border 
                                            }]}
                                            value={day.day}
                                            onChangeText={(value) => updateDayName(dayIdx, value)}
                                            placeholder="Day Name"
                                            placeholderTextColor={theme.text.light}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[removeDayButton, { 
                                          backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : '#fff0f0',
                                          borderColor: isDark ? 'rgba(255, 59, 48, 0.3)' : '#ffcccc' 
                                        }]}
                                        onPress={() => removeDay(dayIdx)}
                                    >
                                        <Text style={removeDayButtonText}>Remove Day</Text>
                                    </TouchableOpacity>
                                </View>
                            
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 14, color: theme.text.medium, marginRight: 6 }}>Location:</Text>
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
                                            style={{
                                              inputIOS: {
                                                fontSize: 16,
                                                color: theme.text.dark,
                                                textDecorationLine: 'underline',
                                                paddingVertical: 4,
                                                paddingHorizontal: 0,
                                              },
                                              inputAndroid: {
                                                fontSize: 16,
                                                color: theme.text.dark,
                                                textDecorationLine: 'underline',
                                                paddingVertical: 4,
                                                paddingHorizontal: 0,
                                              },
                                              placeholder: {
                                                color: theme.text.light,
                                              }
                                            }}
                                            placeholder={{}}
                                            key={`location-picker-${dayIdx}-${Date.now()}`}
                                        />
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 14, color: theme.text.medium, marginRight: 6 }}>Focus:</Text>
                                    <TextInput
                                        style={[focusInput, { 
                                          color: theme.text.dark,
                                          borderBottomColor: theme.border
                                        }]}
                                        value={day.focus || ''}
                                        onChangeText={(value) => updateDayFocus(dayIdx, value)}
                                        placeholder="e.g. Upper Body, Legs, etc."
                                        placeholderTextColor={theme.text.light}
                                    />
                                </View>

                                {day.exercises.map((exercise, exIdx) => (
                                    <View 
                                      key={`exercise-${dayIdx}-${exIdx}`} 
                                      style={[exerciseCard, { 
                                        backgroundColor: theme.card,
                                        borderColor: theme.border
                                      }]}
                                    >
                                        <View style={cardHeaderRow}>
                                            <Text style={[cardTitle, { color: theme.text.dark }]}>Exercise {exIdx + 1}</Text>
                                            <TouchableOpacity
                                                style={[cardDeleteButton, {
                                                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f8f8',
                                                  borderColor: theme.border
                                                }]}
                                                onPress={() => deleteWorkoutExercise(dayIdx, exIdx)}
                                            >
                                                <Text style={cardDeleteButtonText}>×</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{ marginBottom: 12 }}>
                                            <Text style={[inputLabel, { color: theme.text.medium }]}>Exercise Name</Text>
                                            <TouchableOpacity
                                                style={[inputField, {
                                                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9',
                                                  borderColor: theme.border
                                                }]}
                                                onPress={() => openExerciseSearch(dayIdx, exIdx, exercise.name)}
                                            >
                                                <Text style={{ color: theme.text.dark }}>
                                                  {exercise.name || "Select an exercise"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[inputLabel, { color: theme.text.medium }]}>Sets</Text>
                                                <TextInput
                                                    style={[inputField, {
                                                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9',
                                                      borderColor: theme.border,
                                                      color: theme.text.dark
                                                    }]}
                                                    value={exercise.sets.toString()}
                                                    onChangeText={(text) => updateExercise(dayIdx, exIdx, 'sets', text)}
                                                    placeholder="0"
                                                    placeholderTextColor={theme.text.light}
                                                    keyboardType="numeric"
                                                />
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text style={[inputLabel, { color: theme.text.medium }]}>Reps/Seconds</Text>
                                                <TextInput
                                                    style={[inputField, {
                                                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9',
                                                      borderColor: theme.border,
                                                      color: theme.text.dark
                                                    }]}
                                                    value={exercise.reps}
                                                    onChangeText={(text) => updateExercise(dayIdx, exIdx, 'reps', text)}
                                                    placeholder="0"
                                                    placeholderTextColor={theme.text.light}
                                                    keyboardType="numeric"
                                                />
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text style={[inputLabel, { color: theme.text.medium }]}>Weight</Text>
                                                <TextInput
                                                    style={[inputField, {
                                                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9',
                                                      borderColor: theme.border,
                                                      color: theme.text.dark
                                                    }]}
                                                    value={exercise.weight}
                                                    onChangeText={(text) => updateExercise(dayIdx, exIdx, 'weight', text)}
                                                    placeholder="0"
                                                    placeholderTextColor={theme.text.light}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                ))}
                                
                                <TouchableOpacity
                                  style={[addExerciseButton, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
                                    borderColor: theme.border
                                  }]}
                                  onPress={() => addExerciseToDay(dayIdx)}
                                >
                                  <Text style={[addExerciseButtonText, { color: theme.primary }]}>+ Add Exercise</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[addDayButton, { 
                                  backgroundColor: isDark ? theme.card : '#e8f4ff',
                                  borderColor: isDark ? theme.border : '#c8e0ff'
                                }]}
                                onPress={() => openAddDayModal(dayIdx + 1)}
                            >
                                <Text style={[addDayButtonText, { color: theme.primary }]}>+ Insert Day Here</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </>
            )}
            
            <Modal
              visible={isSearchModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsSearchModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={() => setIsSearchModalVisible(false)}>
                <View style={modalOverlay}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={[modalContent, { 
                      maxHeight: '80%',
                      backgroundColor: theme.card 
                    }]}
                    >
                      <Text style={[modalTitle, { color: theme.text.dark }]}>Find Exercise</Text>

                      <View style={searchInputRow}>
                        <TextInput
                          style={[modalInput, { 
                            flex: 1,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: theme.border,
                            color: theme.text.dark
                          }]}
                          value={searchText}
                          onChangeText={setSearchText}
                          placeholder="Search or type new exercise"
                          placeholderTextColor={theme.text.light}
                          autoFocus
                        />
                        {searchText.trim() !== '' && (
                          <TouchableOpacity 
                            style={[addButton, { backgroundColor: theme.primary }]}
                            onPress={() => saveNewExercise(searchText)}
                          >
                            <Text style={addButtonText}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <FlatList
                        data={filteredExercises}
                        keyExtractor={(item, index) => `exercise-option-${index}`}
                        style={dropdownList}
                        renderItem={({ item }) => (
                          <View style={[dropdownItemContainer, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity
                              style={dropdownItemContent}
                              onPress={() => activeExercise &&
                                handleExerciseSelect(activeExercise.dayIdx, activeExercise.exIdx, item)
                              }
                            >
                              <Text style={{ color: theme.text.dark }}>{item}</Text>
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
                            <Text style={{ textAlign: 'center', padding: 12, color: theme.text.medium }}>
                              No matching exercises. Add it to the list!.
                            </Text>
                          </View>
                        )}
                      />

                      <TouchableOpacity
                        style={[closeDropdownButton, { borderTopColor: theme.border }]}
                        onPress={() => {
                          setIsSearchModalVisible(false);
                          setSearchText('');
                        }}
                      >
                        <Text style={[closeButtonText, { color: theme.text.medium }]}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

            <Modal
              visible={isPlanModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsPlanModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={() => setIsPlanModalVisible(false)}>
                <View style={modalOverlay}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={[modalContent, { 
                      maxHeight: '60%',
                      backgroundColor: theme.card 
                    }]}
                    >
                      <Text style={[modalTitle, { color: theme.text.dark }]}>Select Workout Plan</Text>

                      <FlatList
                        data={plans}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[dropdownItem, { borderBottomColor: theme.border }]}
                            onPress={() => {
                              setSelectedPlan(item);
                              setIsPlanModalVisible(false);
                            }}
                          >
                            <Text style={{ color: theme.text.dark }}>{workoutPlans[item].type}</Text>
                          </TouchableOpacity>
                        )}
                      />
                      <TouchableOpacity
                        style={[closeDropdownButton, { borderTopColor: theme.border }]}
                        onPress={() => setIsPlanModalVisible(false)}
                      >
                        <Text style={[closeButtonText, { color: theme.text.medium }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

            <Modal
              visible={isAddDayModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsAddDayModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={() => setIsAddDayModalVisible(false)}>
                <View style={modalOverlay}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={[modalContent, { 
                      maxHeight: '50%',
                      backgroundColor: theme.card 
                    }]}
                    >
                      <Text style={[modalTitle, { color: theme.text.dark }]}>
                        {insertAtIndex !== null && insertAtIndex < editablePlan.days.length 
                          ? `Insert Day Before ${editablePlan.days[insertAtIndex]?.day || 'Next Day'}`
                          : insertAtIndex === 0
                            ? 'Add Day at Beginning'
                            : 'Add New Workout Day'}
                      </Text>

                      <TextInput
                        style={[dayNameInput, {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fefefe',
                          borderColor: theme.border,
                          color: theme.text.dark
                        }]}
                        value={newDayName}
                        onChangeText={setNewDayName}
                        placeholder="Enter day name (e.g., Monday, Leg Day)"
                        placeholderTextColor={theme.text.light}
                        autoFocus
                      />

                      <View style={modalButtonsRow}>
                        <TouchableOpacity
                          style={[modalButton, modalCancelButton, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
                            borderColor: theme.border
                          }]}
                          onPress={() => {
                            setNewDayName('');
                            setInsertAtIndex(null);
                            setIsAddDayModalVisible(false);
                          }}
                        >
                          <Text style={[modalCancelButtonText, { color: theme.text.medium }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[modalButton, modalAddButton, { backgroundColor: theme.primary }]}
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

          <View style={actionButtonsContainer}>
            {!isFirstVisit && (
                <TouchableOpacity
                  style={[cancelButton, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
                    borderColor: theme.border
                  }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={[cancelButtonText, { color: theme.text.medium }]}>Cancel</Text>
                </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[saveButton, isFirstVisit && { flex: 1 }, { backgroundColor: theme.primary }]}
              onPress={handleSavePlan}
            >
              <Text style={saveButtonText}>Update Plan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    );
}

const customPickerButton = {
  borderWidth: 1,
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginVertical: 10,
  alignItems: 'center',
};

const customPickerButtonText = {
  fontSize: 16,
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

const dayTitle = {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
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
    color: 'black',
};

const inputLabel = {
    fontSize: 10,
    color: 'gray',
    marginBottom: 2,
    marginTop: 6,
};

const titleContainer = {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
};

const mainTitle = {
    fontSize: 32,
    fontWeight: '800',
    color: '#222',
    letterSpacing: 0.5,
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

const addExerciseButton = {
  backgroundColor: '#f0f0f0',
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ddd',
  borderStyle: 'dashed',
  marginVertical: 10,
  alignItems: 'center',
};

const addExerciseButtonText = {
  color: '#3a86ff',
  fontWeight: '600',
  fontSize: 16,
};

const dropdownList = {
  maxHeight: 300,
};

const dropdownItem = {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
};

const emptyListContainer = {
  padding: 8,
  alignItems: 'center',
};

const closeDropdownButton = {
  padding: 12,
  borderTopWidth: 1,
  borderTopColor: '#eee',
  alignItems: 'center',
};

const closeButtonText = {
  color: '#666',
  fontWeight: '500',
};

const modalOverlay = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
};

const modalContent = {
  width: '85%',
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 20,
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
};

const modalTitle = {
  fontSize: 20,
  fontWeight: '600',
  marginBottom: 16,
  textAlign: 'center',
};

const modalInput = {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  marginBottom: 20,
  color: 'black',
};

const searchInputRow = {
flexDirection: 'row',
alignItems: 'center',
};

const addButton = {
marginLeft: 8,
backgroundColor: '#3a86ff',
width: 40,
height: 40,
borderRadius: 20,
marginTop: -20,
justifyContent: 'center',
alignItems: 'center',
};

const addButtonText = {
color: 'white',
fontSize: 24,
fontWeight: 'bold',
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
  paddingHorizontal: 12,
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
  paddingHorizontal: 16,
  borderRadius: 8,
  alignItems: 'center',
};

const saveButtonText = {
  color: 'white',
  fontSize: 18,
  fontWeight: '700',
};

const dropdownItemContainer = {
flexDirection: 'row',
alignItems: 'center',
borderBottomWidth: 1,
borderBottomColor: '#eee',
};

const dropdownItemContent = {
flex: 1,
padding: 12,
};

const deleteButton = {
padding: 12,
paddingHorizontal: 16,
justifyContent: 'center',
alignItems: 'center',
};

const deleteButtonText = {
color: '#ff3b30',
fontSize: 20,
fontWeight: 'bold',
};

const modalButtonsRow = {
flexDirection: 'row',
justifyContent: 'space-between',
gap: 12,
};

const modalButton = {
flex: 1,
paddingVertical: 10,
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
fontWeight: '500',
};

const modalAddButton = {
backgroundColor: '#3a86ff',
};

const modalAddButtonText = {
color: 'white',
fontWeight: '600',
};

const focusInput = {
  flex: 1, 
  fontSize: 14,
  color: '#333',
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
  paddingVertical: 4,
  color: 'black'
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
  color: 'black',
};

export default WorkoutPlanViewer;