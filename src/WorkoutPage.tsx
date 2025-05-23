import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Text } from './TextOverride';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkoutContext } from './WorkoutContext';
import { useTheme } from './ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COMPLETED_WORKOUTS_FILE = FileSystem.documentDirectory + 'CompletedWorkouts.json';

const COLORS = {
  primary: '#3a86ff',
  primaryDark: '#2b68cc',
  secondary: '#4361ee',
  current: '#e8f4ff',
  other: '#fff3e0',
  white: '#ffffff',
  light: '#f5f7fa',
  border: '#eaeaea',
  text: {
    dark: '#333333',
    medium: '#666666',
    light: '#aaaaaa',
  },
  gradient: {
    start: '#3a86ff',
    end: '#4361ee'
  },
  accent: '#ff9e43',
  shadow: 'rgba(0, 0, 0, 0.1)'
};

function WorkoutPage({ route }) {
  const { setWorkoutFile, setCurrentCycle } = useContext(WorkoutContext);
  const { theme } = useTheme();
  
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
  const [dropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    navigationParamRef.current = route?.params?.refreshCycle;
  }, [route?.params?.refreshCycle]);

  useEffect(() => {
    if (fileUri) {
      const fileName = fileUri.split('/').pop().replace('.json', '');
      setPlanFileName(fileName);
    }
  }, [fileUri]);

  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.refreshCycle && planFileName) {
        loadCompletedWorkoutsForPlan(planFileName);
        
        navigation.setParams({ refreshCycle: null });
      }
    }, [route?.params?.refreshCycle, planFileName])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (planFileName) {
        loadCompletedWorkoutsForPlan(planFileName);
      }
    }, [planFileName])
  );

  const loadCompletedWorkoutsForPlan = async (fileName) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(COMPLETED_WORKOUTS_FILE);
      
      if (!fileInfo.exists) {
        setCompletedWorkouts([]);
        setLastCycleWorkouts([]);
        await loadCurrentCycleNumber(fileName);
        return;
      }
      
      const fileContent = await FileSystem.readAsStringAsync(COMPLETED_WORKOUTS_FILE);
      const allWorkouts = JSON.parse(fileContent);
      
      const planWorkouts = allWorkouts.filter(workout => workout.workoutFile === fileName);
      
      const cycleNumber = await loadCurrentCycleNumber(fileName);
      
      if (planWorkouts.length === 0) {
        setCompletedWorkouts([]);
        setLastCycleWorkouts([]);
        return;
      }
      
      const currentCycleWorkouts = planWorkouts.filter(w => (w.cycle || 1) === cycleNumber);
      
      const lastCycle = cycleNumber > 1 ? cycleNumber - 1 : 0;
      const previousCycleWorkouts = planWorkouts.filter(w => (w.cycle || 1) === lastCycle);
      
      setCompletedWorkouts(currentCycleWorkouts);
      setLastCycleWorkouts(previousCycleWorkouts);
    } catch (error) {
      setCompletedWorkouts([]);
      setLastCycleWorkouts([]);
    }
  };

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
  
        const fileName = planUri.split('/').pop().replace('.json', '');
        setPlanFileName(fileName);
  
        const content = await FileSystem.readAsStringAsync(planUri);
        const parsed = JSON.parse(content);
  
        if (parsed && parsed.days?.length > 0) {
          setWorkoutName(parsed.type || 'My Workout');
          setWorkoutData(parsed.days);
          
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
  
  const isWorkoutCompleted = (dayName) => {
    return completedWorkouts.some(workout => workout.dayName === dayName);
  };

  const getCompletedWorkoutData = (dayName) => {
    return completedWorkouts.find(workout => workout.dayName === dayName);
  };

  const getLastCycleWorkoutData = (dayName) => {
    return lastCycleWorkouts.find(workout => workout.dayName === dayName);
  };

  const findCompletedExerciseData = (exerciseName, dayName) => {
    const completedWorkout = getCompletedWorkoutData(dayName);
    if (!completedWorkout || !completedWorkout.exercises) return null;
    
    const exercise = completedWorkout.exercises.find(ex => ex.name === exerciseName);
    
    if (exercise) {
      return {
        ...exercise,
        completedSets: exercise.sets || 0,
        completedReps: exercise.reps || 0,
        completedWeight: exercise.weight || 0,
      };
    }
    
    return null;
  };

  const findLastCycleExerciseData = (exerciseName, dayName) => {
    const lastCycleWorkout = getLastCycleWorkoutData(dayName);
    if (!lastCycleWorkout || !lastCycleWorkout.exercises) return null;
    
    const exercise = lastCycleWorkout.exercises.find(ex => ex.name === exerciseName);
    
    if (exercise) {
      return {
        ...exercise,
        lastCycleSets: exercise.sets || 0,
        lastCycleReps: exercise.reps || 0,
        lastCycleWeight: exercise.weight || 0,
      };
    }
    
    return null;
  };
  
  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    if (SCREEN_WIDTH > 0) {
      const index = Math.round(contentOffsetX / SCREEN_WIDTH);
      if (index >= 0 && index !== currentPageIndex) {
        setCurrentPageIndex(index);
      }
    }
  };

  const handleScrollBegin = () => {
    setIsScrolling(true);
  };

  const handleScrollEnd = (event) => {
    handleScroll(event);
    setIsScrolling(false);
  };

  const goToDay = (index) => {
    if (scrollViewRef.current && index >= 0 && index < workoutData.length) {
      setIsScrolling(true);
      scrollViewRef.current.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true
      });
      setCurrentPageIndex(index);
      
      setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    }
  };

  const areAllDaysCompleted = () => {
    return workoutData.length > 0 && completedWorkouts.length >= workoutData.length;
  };

  const readCompletedWorkouts = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(COMPLETED_WORKOUTS_FILE);
      
      if (!fileInfo.exists) {
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

  const writeCompletedWorkouts = async (data) => {
    try {
      await FileSystem.writeAsStringAsync(COMPLETED_WORKOUTS_FILE, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to completed workouts file:', error);
      throw error;
    }
  };

  const readLatestCycle = async (workoutFileName) => {
    const cycleFile = FileSystem.documentDirectory + `latestCycle_${workoutFileName}.json`;
    try {
      const fileInfo = await FileSystem.getInfoAsync(cycleFile);
      
      if (!fileInfo.exists) {
        return 1;
      }
      
      const fileContent = await FileSystem.readAsStringAsync(cycleFile);
      return parseInt(JSON.parse(fileContent).cycle) || 1;
    } catch (error) {
      console.error('Error reading latest cycle file:', error);
      return 1;
    }
  };

  const writeLatestCycle = async (workoutFileName, cycle) => {
    const cycleFile = FileSystem.documentDirectory + `latestCycle_${workoutFileName}.json`;
    try {
      await FileSystem.writeAsStringAsync(cycleFile, JSON.stringify({ cycle }));
    } catch (error) {
      console.error('Error writing latest cycle file:', error);
      throw error;
    }
  };

  const startNewCycle = async () => {
    try {
      if (!planFileName) {
        Alert.alert('Error', 'Could not determine workout plan name.');
        return;
      }
  
      const allWorkouts = await readCompletedWorkouts();
      const planWorkouts = allWorkouts.filter(w => w.workoutFile === planFileName);
      
      const latestCycle = planWorkouts.length > 0
        ? Math.max(...planWorkouts.map(w => w.cycle || 1))
        : 1;
      
      const newCycle = latestCycle + 1;
      await writeLatestCycle(planFileName, newCycle);
      
      setCurrentCycleNumber(newCycle);
      setLastCycleWorkouts(completedWorkouts);
      setCompletedWorkouts([]);
  
      goToDay(0);
  
      Alert.alert('Cycle Restarted', `Now starting Cycle ${newCycle}.`);
    } catch (err) {
      console.error('Error starting new cycle:', err);
      Alert.alert('Error', 'Could not start new cycle.');
    }
  };

  useEffect(() => {
    if (planFileName) {
      setWorkoutFile(planFileName);
    }
  }, [planFileName, setWorkoutFile]);

  useEffect(() => {
    setCurrentCycle(currentCycleNumber);
  }, [currentCycleNumber, setCurrentCycle]);

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.actionButtonsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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

      <View style={[styles.dayIndicatorsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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
          
          const lastCycleData = getLastCycleWorkoutData(day.day);
          const hasLastCycleData = lastCycleData && lastCycleData.exercises && lastCycleData.exercises.length > 0;

          return (
            <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]} key={`day-${dayIndex}`}>
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.dayHeader, { borderBottomColor: theme.border }]}>
                  <View style={styles.dayHeaderRow}>
                    <Text style={[styles.dayTitle, { color: theme.text.dark }]}>{day.day}</Text>
                    <View style={styles.dayMeta}>
                      <Text style={[styles.dayLocation, { color: theme.text.medium }]}>{day.location}</Text>
                      {day.focus && <Text style={[styles.dayFocus, { color: theme.text.medium }]}> • {day.focus}</Text>}
                    </View>
                  </View>
                </View>

                <ScrollView style={styles.exercisesContainer}>
                  {dayCompleted && (
                    <View style={styles.completedBanner}>
                      <Text style={styles.completedText}>✅ Workout Completed</Text>
                      <Text style={styles.completedDate}>
                        {completedData?.date ? format(new Date(completedData.date), 'MMM dd, yyyy') : ''}
                      </Text>
                    </View>
                  )}

                  {day.exercises.map((exercise, exIndex) => {
                    const completedExercise = dayCompleted ? 
                      findCompletedExerciseData(exercise.name, day.day) : null;
                      
                    const lastCycleExercise = hasLastCycleData ? 
                      findLastCycleExerciseData(exercise.name, day.day) : null;
                      
                    return (
                      <View 
                        style={[
                          styles.exerciseItem, 
                          { backgroundColor: theme.isDark ? theme.card : '#f9f9fb', borderColor: theme.border },
                          completedExercise && styles.completedExerciseItem
                        ]} 
                        key={`exercise-${dayIndex}-${exIndex}`}
                      >
                        <Text style={[styles.exerciseName, { color: theme.text.dark }]}>{exercise.name}</Text>
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

      <View style={[styles.startWorkoutContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {areAllDaysCompleted() ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.cycleButton]}
            onPress={startNewCycle}
          >
            <Text style={styles.actionButtonText}>Start New Cycle</Text>
          </TouchableOpacity>
        ) : isWorkoutCompleted(workoutData[currentPageIndex]?.day) ? (
          <View style={[styles.actionButton, styles.navButtonDisabled]}>
            <Text style={styles.actionButtonText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
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
                refreshCycle: true
              });
            }}
          >
            <Text style={styles.actionButtonText}>Start Workout</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.navBarSpacer} />
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
    paddingHorizontal: 12,
    paddingTop: 16,
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  dayHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLocation: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  dayFocus: {
    fontSize: 13,
    color: '#666',
  },
  exercisesContainer: {
    flex: 1,
    marginTop: 4,
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
    marginBottom: 8,
    height: 90,
  },
  completedBanner: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#388E3C',
  },
  completedDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerContainer: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 24,
  }, 
  headerRight: {
    width: 24,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#3a86ff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default WorkoutPage;