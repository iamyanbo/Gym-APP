import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for file paths
const COMPLETED_WORKOUTS_FILE = FileSystem.documentDirectory + 'CompletedWorkouts.json';

/**
 * WorkoutPage component that displays a workout plan with swipeable day cards
 */
function WorkoutPage({ route }) {
  const fileUri = route?.params?.fileUri;
  const [isLoading, setIsLoading] = useState(true);
  const [workoutData, setWorkoutData] = useState([]);
  const [workoutName, setWorkoutName] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [lastCycleWorkouts, setLastCycleWorkouts] = useState([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasNoPlan, setHasNoPlan] = useState(false);
  const [planFileName, setPlanFileName] = useState('');
  const [currentCycleNumber, setCurrentCycleNumber] = useState(1);
  const navigationParamRef = useRef(null);

  // Store route navigation parameter to detect changes
  useEffect(() => {
    navigationParamRef.current = route?.params?.refreshCycle;
  }, [route?.params?.refreshCycle]);

  // Extract the filename from URI for tracking completed workouts
  useEffect(() => {
    if (fileUri) {
      const fileName = fileUri.split('/').pop().replace('.json', '');
      setPlanFileName(fileName);
    }
  }, [fileUri]);

  // Check for navigation param to force refresh
  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.refreshCycle && planFileName) {
        loadCompletedWorkoutsForPlan(planFileName);
        
        // Clear the parameter after use
        navigation.setParams({ refreshCycle: null });
      }
    }, [route?.params?.refreshCycle, planFileName])
  );

  // Load completed workouts whenever the component gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (planFileName) {
        loadCompletedWorkoutsForPlan(planFileName);
      }
    }, [planFileName])
  );

  // Function to load completed workouts for a specific plan
  const loadCompletedWorkoutsForPlan = async (fileName) => {
    try {
      
      // Check if completed workouts file exists
      const fileInfo = await FileSystem.getInfoAsync(COMPLETED_WORKOUTS_FILE);
      
      if (!fileInfo.exists) {
        setCompletedWorkouts([]);
        setLastCycleWorkouts([]);
        await loadCurrentCycleNumber(fileName);
        return;
      }
      
      // Read and parse the file
      const fileContent = await FileSystem.readAsStringAsync(COMPLETED_WORKOUTS_FILE);
      const allWorkouts = JSON.parse(fileContent);
      
      // Filter workouts for this specific workout plan
      const planWorkouts = allWorkouts.filter(workout => workout.workoutFile === fileName);
      
      // First load the current cycle number
      const cycleNumber = await loadCurrentCycleNumber(fileName);
      
      if (planWorkouts.length === 0) {
        setCompletedWorkouts([]);
        setLastCycleWorkouts([]);
        return;
      }
      
      // Filter workouts from the current cycle
      const currentCycleWorkouts = planWorkouts.filter(w => (w.cycle || 1) === cycleNumber);
      
      // Filter workouts from the previous cycle (if any)
      const lastCycle = cycleNumber > 1 ? cycleNumber - 1 : 0;
      const previousCycleWorkouts = planWorkouts.filter(w => (w.cycle || 1) === lastCycle);
      
      setCompletedWorkouts(currentCycleWorkouts);
      setLastCycleWorkouts(previousCycleWorkouts);
    } catch (error) {
      setCompletedWorkouts([]);
      setLastCycleWorkouts([]);
    }
  };

  // Function to load current cycle number
  const loadCurrentCycleNumber = async (fileName) => {
    try {
      const cycleNumber = await readLatestCycle(fileName);
      setCurrentCycleNumber(cycleNumber);
      return cycleNumber;
    } catch (error) {
      setCurrentCycleNumber(1);
      return 1;
    }
  };

  const findLatestWorkoutPlan = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
  
      // Match files ending in .json but not CompletedWorkouts.json
      const workoutFiles = files.filter(file =>
        file.endsWith('.json') && 
        file !== 'CompletedWorkouts.json' &&
        !file.startsWith('latestCycle_')
      );
  
      if (workoutFiles.length === 0) return null;
  
      const fileStats = await Promise.all(
        workoutFiles.map(async (file) => {
          const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory + file);
          return { file, modTime: info.modificationTime || 0 };
        })
      );
  
      const latest = fileStats.reduce((a, b) => (a.modTime > b.modTime ? a : b));
      return FileSystem.documentDirectory + latest.file;
    } catch (err) {
      console.error('Error finding latest workout plan:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadWorkoutData = async () => {
      try {
        setIsLoading(true);
        let planUri = fileUri;
  
        if (!planUri) {
          planUri = await findLatestWorkoutPlan();
          if (!planUri) {
            setHasNoPlan(true);
            setIsLoading(false);
            return;
          }
        }
  
        // Extract file name
        const fileName = planUri.split('/').pop().replace('.json', '');
        setPlanFileName(fileName);
  
        const content = await FileSystem.readAsStringAsync(planUri);
        const parsed = JSON.parse(content);
  
        if (parsed && parsed.days?.length > 0) {
          setWorkoutName(parsed.type || 'My Workout');
          setWorkoutData(parsed.days);
          
          // Load the cycle data
          await loadCompletedWorkoutsForPlan(fileName);
        } else {
          Alert.alert('Error', 'Unable to load workout data');
        }
      } catch (error) {
        console.error('Error loading workout file:', error);
        Alert.alert('Error', 'Failed to load workout data');
      } finally {
        setIsLoading(false);
      }
    };
  
    loadWorkoutData();
  }, [fileUri]);
  
  
  // Check if a day's workout is completed
  const isWorkoutCompleted = (dayName) => {
    return completedWorkouts.some(workout => workout.dayName === dayName);
  };

  // Get completed workout data for a day
  const getCompletedWorkoutData = (dayName) => {
    return completedWorkouts.find(workout => workout.dayName === dayName);
  };

  // Get last cycle's workout data for a day
  const getLastCycleWorkoutData = (dayName) => {
    return lastCycleWorkouts.find(workout => workout.dayName === dayName);
  };

  // Find completed exercise data by name for a specific day
  const findCompletedExerciseData = (exerciseName, dayName) => {
    const completedWorkout = getCompletedWorkoutData(dayName);
    if (!completedWorkout || !completedWorkout.exercises) return null;
    
    // Find the exercise by name
    const exercise = completedWorkout.exercises.find(ex => ex.name === exerciseName);
    
    // If found, return with proper field mapping
    if (exercise) {
      return {
        ...exercise,
        // Map the regular fields to the "completed" prefix fields that the component expects
        completedSets: exercise.sets || 0,
        completedReps: exercise.reps || 0,
        completedWeight: exercise.weight || 0,
      };
    }
    
    return null;
  };

  // Find last cycle's exercise data by name for a specific day
  const findLastCycleExerciseData = (exerciseName, dayName) => {
    const lastCycleWorkout = getLastCycleWorkoutData(dayName);
    if (!lastCycleWorkout || !lastCycleWorkout.exercises) return null;
    
    // Find the exercise by name
    const exercise = lastCycleWorkout.exercises.find(ex => ex.name === exerciseName);
    
    // If found, return with proper field mapping
    if (exercise) {
      return {
        ...exercise,
        // Map the regular fields to the "lastCycle" prefix fields
        lastCycleSets: exercise.sets || 0,
        lastCycleReps: exercise.reps || 0,
        lastCycleWeight: exercise.weight || 0,
      };
    }
    
    return null;
  };
  
  // Handle scroll events to update current page index
  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    if (SCREEN_WIDTH > 0) {
      const index = Math.round(contentOffsetX / SCREEN_WIDTH);
      if (index >= 0 && index !== currentPageIndex) {
        setCurrentPageIndex(index);
      }
    }
  };

  // Handle when scroll begins
  const handleScrollBegin = () => {
    setIsScrolling(true);
  };

  // Handle when scroll ends
  const handleScrollEnd = (event) => {
    handleScroll(event);
    setIsScrolling(false);
  };

  // Navigate to specific day
  const goToDay = (index) => {
    if (scrollViewRef.current && index >= 0 && index < workoutData.length) {
      setIsScrolling(true);
      scrollViewRef.current.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true
      });
      setCurrentPageIndex(index);
      
      // Set scrolling back to false after animation completes
      setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    }
  };

  // Check if all days are completed
  const areAllDaysCompleted = () => {
    return workoutData.length > 0 && completedWorkouts.length >= workoutData.length;
  };

  // Function to read existing data from the CompletedWorkouts.json file
  const readCompletedWorkouts = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(COMPLETED_WORKOUTS_FILE);
      
      if (!fileInfo.exists) {
        // Create the file with an empty array if it doesn't exist
        await FileSystem.writeAsStringAsync(COMPLETED_WORKOUTS_FILE, JSON.stringify([]));
        return [];
      }
      
      const fileContent = await FileSystem.readAsStringAsync(COMPLETED_WORKOUTS_FILE);
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading completed workouts file:', error);
      return [];
    }
  };

  // Function to write data to the CompletedWorkouts.json file
  const writeCompletedWorkouts = async (data) => {
    try {
      await FileSystem.writeAsStringAsync(COMPLETED_WORKOUTS_FILE, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to completed workouts file:', error);
      throw error;
    }
  };

  // Read the latest cycle from a specific file
  const readLatestCycle = async (workoutFileName) => {
    const cycleFile = FileSystem.documentDirectory + `latestCycle_${workoutFileName}.json`;
    try {
      const fileInfo = await FileSystem.getInfoAsync(cycleFile);
      
      if (!fileInfo.exists) {
        return 1; // Default to cycle 1 if file doesn't exist
      }
      
      const fileContent = await FileSystem.readAsStringAsync(cycleFile);
      return parseInt(JSON.parse(fileContent).cycle) || 1;
    } catch (error) {
      console.error('Error reading latest cycle file:', error);
      return 1; // Default to cycle 1 if there's an error
    }
  };

  // Write the latest cycle to a specific file
  const writeLatestCycle = async (workoutFileName, cycle) => {
    const cycleFile = FileSystem.documentDirectory + `latestCycle_${workoutFileName}.json`;
    try {
      await FileSystem.writeAsStringAsync(cycleFile, JSON.stringify({ cycle }));
    } catch (error) {
      console.error('Error writing latest cycle file:', error);
      throw error;
    }
  };

  // Start a new cycle
  const startNewCycle = async () => {
    try {
      if (!planFileName) {
        Alert.alert('Error', 'Could not determine workout plan name.');
        return;
      }
  
      // Read existing workouts
      const allWorkouts = await readCompletedWorkouts();
      const planWorkouts = allWorkouts.filter(w => w.workoutFile === planFileName);
      
      // Get the latest cycle number
      const latestCycle = planWorkouts.length > 0
        ? Math.max(...planWorkouts.map(w => w.cycle || 1))
        : 1;
      
      // Increment cycle number and save it
      const newCycle = latestCycle + 1;
      await writeLatestCycle(planFileName, newCycle);
      
      // Update state with new cycle information
      setCurrentCycleNumber(newCycle);
      setLastCycleWorkouts(completedWorkouts);
      setCompletedWorkouts([]);
  
      // Go back to the first day in the scroll view
      goToDay(0);
  
      Alert.alert('Cycle Restarted', `Now starting Cycle ${newCycle}.`);
    } catch (err) {
      console.error('Error starting new cycle:', err);
      Alert.alert('Error', 'Could not start new cycle.');
    }
  };

  if (hasNoPlan) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.workoutTitle}>Let's Get You Started</Text>
        <TouchableOpacity
          style={styles.createPlanButton}
          onPress={() => navigation.navigate('WorkoutPlanViewer')}
        >
          <Text style={styles.createPlanButtonText}>Create New Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3a86ff" />
        <Text style={styles.loadingText}>Loading workout plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Title only */}
      <LinearGradient
        colors={['#3a86ff', '#4361ee']}
        style={styles.headerContainer}
      >
        <Text style={styles.headerTitle}>{workoutName}</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('WorkoutStats', { workoutFile: planFileName })}
            style={{ marginLeft: 12 }}
          >
            <Icon name="bar-chart-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
      </LinearGradient>

      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.editPlanButton}
          onPress={() => navigation.navigate('EditPlan', { 
            fileUri, 
            workoutData: { days: workoutData, type: workoutName },
            workoutName 
          })}
        >
          <Text style={styles.editPlanButtonText}>Edit Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.newPlanButton}
          onPress={() => navigation.navigate('WorkoutPlanViewer')}
        >
          <Text style={styles.newPlanButtonText}>New Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Day Indicators */}
      <View style={styles.dayIndicatorsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayIndicators}
        >
          {workoutData.map((day, index) => (
            <TouchableOpacity
              key={`indicator-${index}`}
              style={[
                styles.dayIndicator,
                currentPageIndex === index && styles.activeDayIndicator,
                isWorkoutCompleted(day.day) && styles.completedDayIndicator
              ]}
              onPress={() => goToDay(index)}
            >
              <Text 
                style={[
                  styles.dayIndicatorText,
                  currentPageIndex === index && styles.activeDayIndicatorText,
                  isWorkoutCompleted(day.day) && styles.completedDayIndicatorText
                ]}
              >
                {day.day} {isWorkoutCompleted(day.day) ? "✓" : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Day Cards */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={handleScrollBegin}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {workoutData.map((day, dayIndex) => {
          const dayCompleted = isWorkoutCompleted(day.day);
          const completedData = dayCompleted ? getCompletedWorkoutData(day.day) : null;
          
          // Get the last cycle data for this day (if it exists)
          const lastCycleData = getLastCycleWorkoutData(day.day);
          const hasLastCycleData = lastCycleData && lastCycleData.exercises && lastCycleData.exercises.length > 0;

          return (
            <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]} key={`day-${dayIndex}`}>
              <View style={styles.card}>
                {/* Day Header */}
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{day.day}</Text>
                  <View style={styles.dayMeta}>
                    <Text style={styles.dayLocation}>{day.location}</Text>
                    {day.focus && <Text style={styles.dayFocus}> • {day.focus}</Text>}
                  </View>
                </View>

                {/* Status indicator - show if completed */}
                {dayCompleted && (
                  <View style={styles.completedBanner}>
                    <Text style={styles.completedText}>✅ Workout Completed</Text>
                    <Text style={styles.completedDate}>
                      {completedData?.date ? format(new Date(completedData.date), 'MMM dd, yyyy') : ''}
                    </Text>
                  </View>
                )}

                {/* Exercises */}
                <ScrollView style={styles.exercisesContainer}>
                  {day.exercises.map((exercise, exIndex) => {
                    const completedExercise = dayCompleted ? 
                      findCompletedExerciseData(exercise.name, day.day) : null;
                      
                    const lastCycleExercise = hasLastCycleData ? 
                      findLastCycleExerciseData(exercise.name, day.day) : null;
                      
                    return (
                      <View 
                        style={[
                          styles.exerciseItem, 
                          completedExercise && styles.completedExerciseItem
                        ]} 
                        key={`exercise-${dayIndex}-${exIndex}`}
                      >
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <View style={styles.exerciseDetails}>
                          <View style={styles.detailBox}>
                            <Text style={styles.detailLabel}>Sets</Text>
                            <Text style={styles.detailValue}>
                              {completedExercise ? completedExercise.completedSets : exercise.sets || '0'}
                            </Text>
                            {completedExercise && (
                              <Text style={styles.planValue}>Plan: {exercise.sets || '0'}</Text>
                            )}
                            {!completedExercise && lastCycleExercise && (
                              <Text style={styles.lastCycleValue}>Last: {lastCycleExercise.lastCycleSets}</Text>
                            )}
                          </View>
                          <View style={styles.detailBox}>
                            <Text style={styles.detailLabel}>Rep/Secs</Text>
                            <Text style={styles.detailValue}>
                              {completedExercise ? completedExercise.completedReps : exercise.reps || '0'}
                            </Text>
                            {completedExercise && (
                              <Text style={styles.planValue}>Plan: {exercise.reps || '0'}</Text>
                            )}
                            {!completedExercise && lastCycleExercise && (
                              <Text style={styles.lastCycleValue}>Last: {lastCycleExercise.lastCycleReps}</Text>
                            )}
                          </View>
                          <View style={styles.detailBox}>
                            <Text style={styles.detailLabel}>Weight</Text>
                            <Text style={styles.detailValue}>
                              {completedExercise ? completedExercise.completedWeight : exercise.weight || '0'}
                            </Text>
                            {completedExercise && (
                              <Text style={styles.planValue}>Plan: {exercise.weight || '0'}</Text>
                            )}
                            {!completedExercise && lastCycleExercise && (
                              <Text style={styles.lastCycleValue}>Last: {lastCycleExercise.lastCycleWeight}</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Page Indicator */}
      <View style={styles.paginationContainer}>
        {workoutData.map((day, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.paginationDot,
              currentPageIndex === index && styles.paginationDotActive,
              isWorkoutCompleted(day.day) && styles.completedPaginationDot
            ]}
          />
        ))}
      </View>

      {/* Bottom Button - Start Workout or Completed or Start New Cycle */}
      <View style={styles.startWorkoutContainer}>
        {areAllDaysCompleted() ? (
          <TouchableOpacity
            style={[styles.navButton, styles.cycleButton]}
            onPress={startNewCycle}
          >
            <Text style={styles.navButtonText}>Start New Cycle</Text>
          </TouchableOpacity>
        ) : isWorkoutCompleted(workoutData[currentPageIndex]?.day) ? (
          <View style={[styles.navButton, styles.navButtonDisabled]}>
            <Text style={styles.navButtonText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              // Get last cycle data for this day
              const dayName = workoutData[currentPageIndex]?.day;
              const lastCycleWorkoutData = getLastCycleWorkoutData(dayName);
              
              navigation.navigate('WorkoutDayViewer', {
                dayData: workoutData[currentPageIndex],
                dayIndex: currentPageIndex,
                workoutName: workoutName || 'My Workout',
                workoutFile: planFileName,
                totalDays: workoutData.length,
                lastCycleData: lastCycleWorkoutData || null,
                currentCycle: currentCycleNumber,
                refreshCycle: true // Add a flag to force refresh when coming back
              });
            }}
          >
            <Text style={styles.navButtonText}>Start Workout</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lastCycleValue: {
    fontSize: 10,
    color: '#3a86ff',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 42,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  workoutTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },
  editPlanButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#e8f4ff',
    borderWidth: 1,
    borderColor: '#3a86ff',
    marginRight: 12,
  },
  editPlanButtonText: {
    fontSize: 14,
    color: '#3a86ff',
    fontWeight: '500',
  },
  newPlanButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  newPlanButtonText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  dayIndicatorsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  dayIndicators: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeDayIndicator: {
    backgroundColor: '#3a86ff',
  },
  completedDayIndicator: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dayIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeDayIndicatorText: {
    color: '#fff',
  },
  completedDayIndicatorText: {
    color: '#4CAF50',
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 20,
  },
  dayHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 16,
  },
  dayTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#222',
    marginBottom: 4,
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLocation: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  dayFocus: {
    fontSize: 16,
    color: '#666',
  },
  exercisesContainer: {
    flex: 1,
  },
  exerciseItem: {
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  completedExerciseItem: {
    borderColor: '#4CAF50',
    borderWidth: 1,
    backgroundColor: '#f0fff0',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  detailLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3a86ff',
  },
  planValue: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#3a86ff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  completedPaginationDot: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  navButton: {
    backgroundColor: '#3a86ff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cycleButton: {
    backgroundColor: '#4CAF50',
  },
  navButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  createPlanButton: {
    backgroundColor: '#3a86ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  createPlanButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  startWorkoutContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  completedBanner: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  completedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#388E3C',
  },
  completedDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerContainer: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default WorkoutPage;