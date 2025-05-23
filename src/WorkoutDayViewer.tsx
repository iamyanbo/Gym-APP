import React, { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { format } from 'date-fns';
import { Text } from './TextOverride';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';

const COMPLETED_WORKOUTS_FILE = FileSystem.documentDirectory + 'CompletedWorkouts.json';

const WorkoutDayViewer = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { dayData, dayIndex, workoutName, workoutFile, lastCycleData, totalDays } = route.params;
  
  const exercisesData = (dayData?.exercises || []).filter(ex => ex !== undefined);
  
  const [exercises, setExercises] = useState(
    exercisesData.map(ex => ({
      name: ex?.name || '',
      sets: ex?.sets ?? 0,
      reps: ex?.reps ?? 0,
      weight: ex?.weight ?? 0,
      completedSets: '',
      completedReps: '',
      completedWeight: '',
    }))
  );
  
  const getLastCycleExerciseData = (exerciseName) => {
    if (!lastCycleData || !lastCycleData.exercises) return null;
    return lastCycleData.exercises.find(ex => ex?.name === exerciseName);
  };
  
  const handleInputChange = (index, field, value) => {
    const updatedExercises = [...exercises];
    updatedExercises[index][field] = value;
    setExercises(updatedExercises);
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

  const handleCompleteWorkout = async () => {
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const timestamp = now.toISOString();
      const fileName = workoutFile;
  
      const existingData = await readCompletedWorkouts();
  
      const planWorkouts = existingData.filter(w => w.workoutFile === fileName);
  
      const latestCycle = await readLatestCycle(fileName);

      const currentCycleWorkouts = planWorkouts.filter(w => (w.cycle || 1) === latestCycle);
      const daysInCurrentCycle = new Set(currentCycleWorkouts.map(w => w.dayName));

      let currentCycle = latestCycle;
      const totalDaysInCycle = totalDays || 1;
      if (daysInCurrentCycle.size >= totalDaysInCycle) {
        currentCycle = latestCycle + 1;
        await writeLatestCycle(fileName, currentCycle);
      }
      
      const workoutEntry = {
        date: today,
        timestamp: timestamp,
        workoutFile: fileName,
        workoutName: workoutName,
        dayName: dayData?.day || `Day ${dayIndex + 1}`,
        dayIndex: dayIndex,
        cycle: currentCycle,
        exercises: exercises.map(ex => ({
          name: ex.name,
          sets: parseInt(ex.completedSets || ex.sets) || 0,
          reps: parseInt(ex.completedReps || ex.reps) || 0,
          weight: parseFloat(ex.completedWeight || ex.weight) || 0,
        }))
      };
  
      await writeCompletedWorkouts([...existingData, workoutEntry]);
  
      Alert.alert('Success', 'Workout completed and saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save your workout.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.headerContainer}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{workoutName || 'Workout'}</Text>
        </LinearGradient>

        {exercises.length > 0 ? (
          exercises.map((exercise, index) => {
            const lastCycleExercise = getLastCycleExerciseData(exercise.name);
            const hasLastCycleData = lastCycleExercise != null;
            return (
              <View 
                key={index} 
                style={[
                  styles.exerciseItem, 
                  { backgroundColor: theme.card, borderColor: theme.border }
                ]}
              >
                <Text style={[styles.exerciseName, { color: theme.text.dark }]}>
                  {exercise.name || `Exercise ${index + 1}`}
                </Text>

                <View style={styles.exerciseDetails}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Sets</Text>
                    <TextInput
                      style={styles.detailInput}
                      keyboardType="numeric"
                      value={exercise.completedSets}
                      onChangeText={(text) => handleInputChange(index, 'completedSets', text)}
                      placeholder={`${exercise.sets || "0"}`}
                      placeholderTextColor="#aaa"
                    />
                    <View style={styles.referenceContainer}>
                      <Text style={styles.planValue}>Plan: {exercise.sets || "0"}</Text>
                      {hasLastCycleData && (
                        <Text style={styles.lastCycleValue}>Last: {lastCycleExercise.sets || "0"}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Reps/Secs</Text>
                    <TextInput
                      style={styles.detailInput}
                      keyboardType="numeric"
                      value={exercise.completedReps}
                      onChangeText={(text) => handleInputChange(index, 'completedReps', text)}
                      placeholder={`${exercise.reps || "0"}`}
                      placeholderTextColor="#aaa"
                    />
                    <View style={styles.referenceContainer}>
                      <Text style={styles.planValue}>Plan: {exercise.reps || "0"}</Text>
                      {hasLastCycleData && (
                        <Text style={styles.lastCycleValue}>Last: {lastCycleExercise.reps || "0"}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Weight</Text>
                    <TextInput
                      style={styles.detailInput}
                      keyboardType="numeric"
                      value={exercise.completedWeight}
                      onChangeText={(text) => handleInputChange(index, 'completedWeight', text)}
                      placeholder={`${exercise.weight || "0"}`}
                      placeholderTextColor="#aaa"
                    />
                    <View style={styles.referenceContainer}>
                      <Text style={styles.planValue}>Plan: {exercise.weight || "0"}</Text>
                      {hasLastCycleData && (
                        <Text style={styles.lastCycleValue}>Last: {lastCycleExercise.weight || "0"}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={[styles.noExercisesContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.noExercisesText, { color: theme.text.medium }]}>
              No exercises found for this workout day.
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.startButton} onPress={handleCompleteWorkout}>
        <Text style={styles.startButtonText}>Complete Workout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 15,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  exerciseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailBox: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  detailInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
    color: 'black',
  },
  referenceContainer: {
    width: '100%',
    alignItems: 'center',
  },
  planValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  lastCycleValue: {
    fontSize: 12,
    color: '#3a86ff',
    marginTop: 2,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  noExercisesContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  noExercisesText: {
    color: '#666',
    fontSize: 16,
  }
});

export default WorkoutDayViewer;