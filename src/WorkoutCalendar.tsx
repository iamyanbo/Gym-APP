import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  Dimensions,
  FlatList,
  Animated,
  Image
} from 'react-native';
import { Text } from './TextOverride';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  addDays,
  subMonths,
  addMonths,
  isSameDay,
  parseISO,
  isToday,
  isSameMonth
} from 'date-fns';
import { WorkoutContext } from './WorkoutContext';
import { useTheme } from './ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

function WorkoutCalendar({ route }) {
  const navigation = useNavigation();
  const { workoutFile } = useContext(WorkoutContext);
  const { theme } = useTheme();
  const horizontalScrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const calendarScaleAnim = useRef(new Animated.Value(0.95)).current;
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [months, setMonths] = useState([]);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeWorkoutTypes, setActiveWorkoutTypes] = useState({
    current: true,
    other: true
  });
  const [workoutStats, setWorkoutStats] = useState({
    thisMonth: 0,
    streak: 0,
    total: 0
  });

  useEffect(() => {
    const today = new Date();
    const prevMonth = subMonths(today, 1);
    const nextMonth = addMonths(today, 1);
    
    setMonths([prevMonth, today, nextMonth]);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(calendarScaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (workoutFile) {
      loadCompletedWorkouts();
    }
  }, [workoutFile]);

  useEffect(() => {
    if (completedWorkouts.length > 0) {
      calculateWorkoutStats();
    }
  }, [completedWorkouts]);

  const calculateWorkoutStats = () => {
    const today = new Date();
    const thisMonth = startOfMonth(today);
    
    const thisMonthWorkouts = completedWorkouts.filter(workout => {
      const workoutDate = parseISO(workout.date);
      return isSameMonth(workoutDate, today);
    }).length;
    
    let streak = 0;
    let currentDate = today;
    let hasWorkout = true;
    
    while (hasWorkout) {
      const workoutsOnDay = completedWorkouts.filter(workout => {
        const workoutDate = parseISO(workout.date);
        return isSameDay(workoutDate, currentDate);
      });
      
      if (workoutsOnDay.length > 0) {
        streak++;
        currentDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
      } else {
        hasWorkout = false;
      }
    }
    
    setWorkoutStats({
      thisMonth: thisMonthWorkouts,
      streak: streak,
      total: completedWorkouts.length
    });
  };

  const generateCalendarDays = (date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDate = monthStart;
    const endDate = monthEnd;

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    const startDay = getDay(monthStart);
    let prevDays = [];
    for (let i = 0; i < startDay; i++) {
      prevDays.push({ date: addDays(monthStart, -1 * (startDay - i)), inMonth: false });
    }
    
    const currentDays = daysInMonth.map(day => ({ date: day, inMonth: true }));
    
    const lastDay = getDay(monthEnd);
    let nextDays = [];
    for (let i = 1; i < (7 - lastDay); i++) {
      nextDays.push({ date: addDays(monthEnd, i), inMonth: false });
    }
    
    return [...prevDays, ...currentDays, ...nextDays];
  };

  const loadCompletedWorkouts = async () => {
    try {
      setIsLoading(true);
      
      const fileInfo = await FileSystem.getInfoAsync(COMPLETED_WORKOUTS_FILE);
      
      if (!fileInfo.exists) {
        setCompletedWorkouts([]);
        setIsLoading(false);
        return;
      }
      
      const fileContent = await FileSystem.readAsStringAsync(COMPLETED_WORKOUTS_FILE);
      const allWorkouts = JSON.parse(fileContent);
      
      allWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setCompletedWorkouts(allWorkouts);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading completed workouts:', error);
      setCompletedWorkouts([]);
      setIsLoading(false);
    }
  };

  const handleMonthChange = (index) => {
    if (index === 0) {
      const newMonth = subMonths(months[0], 1);
      setMonths([newMonth, ...months]);
      setCurrentMonthIndex(1);
      horizontalScrollRef.current?.scrollToIndex({ index: 1, animated: false });
    } else if (index === months.length - 1) {
      const newMonth = addMonths(months[months.length - 1], 1);
      setMonths([...months, newMonth]);
      setCurrentMonthIndex(index);
    } else {
      setCurrentMonthIndex(index);
    }
  };

  const getWorkoutsForDate = (date) => {
    return completedWorkouts.filter(workout => {
      const workoutDate = parseISO(workout.date);
      return isSameDay(workoutDate, date);
    });
  };

  const isCurrentPlanWorkout = (workout) => {
    return workout.workoutFile === workoutFile;
  };

  const getWorkoutTypesForDate = (date) => {
    const workoutsOnDay = getWorkoutsForDate(date);
    const types = {
      current: workoutsOnDay.some(isCurrentPlanWorkout),
      other: workoutsOnDay.some(workout => !isCurrentPlanWorkout(workout))
    };
    return types;
  };

  const handleDayPress = (day) => {
    const workoutsOnDay = getWorkoutsForDate(day.date);
    if (workoutsOnDay.length > 0) {
      const filteredWorkouts = workoutsOnDay.filter(workout => {
        const isCurrent = isCurrentPlanWorkout(workout);
        return (isCurrent && activeWorkoutTypes.current) || (!isCurrent && activeWorkoutTypes.other);
      });
      
      if (filteredWorkouts.length > 0) {
        setSelectedWorkouts(filteredWorkouts);
        setSelectedDate(day.date);
        setModalVisible(true);
      }
    }
  };

  const toggleWorkoutTypeFilter = (type) => {
    setActiveWorkoutTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const renderMonth = ({ item, index }) => {
    const calendarDays = generateCalendarDays(item);
    
    return (
      <View style={styles.monthPage}>
        <Text style={styles.monthTitle}>{format(item, 'MMMM yyyy')}</Text>
        
        {/* Calendar Header (Days of Week) */}
        <View style={styles.weekdayContainer}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
            <View style={styles.weekdayItem} key={`weekday-${dayIndex}`}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Days */}
        <View style={styles.daysGrid}>
          {calendarDays.map((day, dayIndex) => {
            const workoutsOnDay = getWorkoutsForDate(day.date);
            const hasWorkouts = workoutsOnDay.length > 0;
            const workoutTypes = getWorkoutTypesForDate(day.date);
            const dayToday = isToday(day.date);
            
            return (
              <TouchableOpacity
                key={`day-${dayIndex}`}
                style={[
                  styles.dayCell,
                  !day.inMonth && styles.outOfMonthDay,
                  workoutTypes.current && workoutTypes.other && styles.mixedWorkoutDay,
                  workoutTypes.current && !workoutTypes.other && styles.currentWorkoutDay,
                  workoutTypes.other && !workoutTypes.current && styles.otherWorkoutDay,
                  dayToday && styles.todayCell
                ]}
                onPress={() => handleDayPress(day)}
                disabled={!hasWorkouts}
              >
                <Text style={[
                  styles.dayNumber,
                  !day.inMonth && styles.outOfMonthText,
                  hasWorkouts && styles.workoutDayText,
                  dayToday && styles.todayText
                ]}>
                  {format(day.date, 'd')}
                </Text>
                
                {hasWorkouts && (
                  <View style={styles.workoutIndicatorContainer}>
                    {workoutTypes.current && (
                      <View style={[
                        styles.workoutIndicator,
                        styles.currentWorkoutIndicator,
                        workoutTypes.other && styles.halfWorkoutIndicator
                      ]}>
                        {workoutsOnDay.filter(isCurrentPlanWorkout).length > 1 && (
                          <Text style={styles.workoutCountText}>
                            {workoutsOnDay.filter(isCurrentPlanWorkout).length}
                          </Text>
                        )}
                      </View>
                    )}
                    
                    {workoutTypes.other && (
                      <View style={[
                        styles.workoutIndicator,
                        styles.otherWorkoutIndicator,
                        workoutTypes.current && styles.halfWorkoutIndicator
                      ]}>
                        {workoutsOnDay.filter(workout => !isCurrentPlanWorkout(workout)).length > 1 && (
                          <Text style={styles.workoutCountText}>
                            {workoutsOnDay.filter(workout => !isCurrentPlanWorkout(workout)).length}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWorkoutDetails = (workout, index) => {
    const isCurrentPlan = isCurrentPlanWorkout(workout);
    
    return (
      <View 
        key={`workout-${index}`} 
        style={[
          styles.workoutCard,
          { backgroundColor: theme.card },
          isCurrentPlan ? styles.currentWorkoutCard : styles.otherWorkoutCard
        ]}
      >
        <View style={styles.workoutCardHeader}>
          <View style={styles.workoutTitleArea}>
            <Text style={[styles.workoutName, { color: theme.text.dark }]} numberOfLines={1}>
              {workout.workoutName || 'Workout'}
            </Text>
            {workout.dayName && (
              <Text style={[styles.dayName, { color: theme.text.medium }]}>{workout.dayName}</Text>
            )}
          </View>
          
          <View style={styles.workoutMetaArea}>
            {workout.cycle && (
              <Text style={[styles.workoutCycle, { color: theme.text.medium }]}>
                Cycle {workout.cycle}
              </Text>
            )}
            
            <View style={[
              styles.planIndicator, 
              isCurrentPlan ? styles.currentPlanIndicator : styles.otherPlanIndicator
            ]}>
              <Text style={[
                styles.planIndicatorText,
                { color: isCurrentPlan ? COLORS.primary : COLORS.accent }
              ]}>
                {isCurrentPlan ? 'Current Plan' : 'Other Plan'}
              </Text>
            </View>
          </View>
        </View>
        
        {workout.exercises && workout.exercises.length > 0 && (
          <View style={[styles.exercisesContainer, { borderTopColor: theme.border }]}>
            {workout.exercises.map((exercise, exIndex) => (
              <View key={`exercise-${exIndex}`} style={styles.exerciseItem}>
                <Text style={[styles.exerciseName, { color: theme.text.dark }]}>{exercise.name}</Text>
                
                <View style={styles.exerciseStats}>
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.statLabel, { color: theme.text.medium }]}>SETS</Text>
                    <Text style={[
                      styles.statValue,
                      { color: isCurrentPlan ? COLORS.primary : COLORS.accent }
                    ]}>{exercise.sets || 0}</Text>
                  </View>
                  
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.statLabel, { color: theme.text.medium }]}>REPS</Text>
                    <Text style={[
                      styles.statValue,
                      { color: isCurrentPlan ? COLORS.primary : COLORS.accent }
                    ]}>{exercise.reps || 0}</Text>
                  </View>
                  
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.statLabel, { color: theme.text.medium }]}>WEIGHT</Text>
                    <Text style={[
                      styles.statValue,
                      { color: isCurrentPlan ? COLORS.primary : COLORS.accent }
                    ]}>{exercise.weight || 0}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {workout.timestamp && (
          <View style={[styles.workoutTimeContainer, { borderTopColor: theme.border }]}>
            <Icon name="time-outline" size={14} color={theme.text.secondary || theme.text.medium} />
            <Text style={[styles.workoutTime, { color: theme.text.secondary || theme.text.medium }]}>
              Completed at {format(new Date(workout.timestamp), 'h:mm a')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading workout calendar...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Statistics Panel */}
      <Animated.View 
        style={[
          styles.statsContainer,
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0]
            })}]
          }
        ]}
      >
        <View style={styles.statItem}>
          <Icon name="calendar" size={22} color={COLORS.primary} />
          <Text style={styles.statValue}>{workoutStats.thisMonth}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Icon name="flame" size={22} color={COLORS.accent} />
          <Text style={styles.statValue}>{workoutStats.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Icon name="fitness" size={22} color={COLORS.secondary} />
          <Text style={styles.statValue}>{workoutStats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </Animated.View>

      {/* Filters */}
      <Animated.View 
        style={[
          styles.filtersContainer, 
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [5, 0]
            })}]
          }
        ]}
      >
        <Text style={[styles.filtersTitle, { color: theme.text.medium }]}>Show workouts:</Text>
        <View style={styles.filterButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeWorkoutTypes.current && styles.activeFilter,
              activeWorkoutTypes.current && { backgroundColor: COLORS.current }
            ]}
            onPress={() => toggleWorkoutTypeFilter('current')}
          >
            <View style={[styles.filterIcon, { backgroundColor: COLORS.primary }]} />
            <Text style={[styles.filterText, { color: theme.text.medium }]}>Current Plan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeWorkoutTypes.other && styles.activeFilter,
              activeWorkoutTypes.other && { backgroundColor: COLORS.other }
            ]}
            onPress={() => toggleWorkoutTypeFilter('other')}
          >
            <View style={[styles.filterIcon, { backgroundColor: COLORS.secondary }]} />
            <Text style={[styles.filterText, { color: theme.text.medium }]}>Other Plans</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Calendar */}
      <Animated.View 
        style={[
          styles.calendarContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: calendarScaleAnim }]
          }
        ]}
      >
        <FlatList
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={months}
          renderItem={renderMonth}
          keyExtractor={(item, index) => `month-${index}`}
          onMomentumScrollEnd={(event) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const index = Math.round(contentOffset / SCREEN_WIDTH);
            handleMonthChange(index);
          }}
          initialScrollIndex={1}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </Animated.View>

      {/* Workout Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View 
            style={[styles.modalContent, { backgroundColor: theme.background }]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text.dark }]}>
                Workouts on {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.card }]}
              >
                <Icon name="close" size={24} color={theme.text.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              bounces={true}
              contentContainerStyle={{ paddingBottom: 20 }}
              nestedScrollEnabled={true}
            >
              {selectedWorkouts.map((workout, index) => renderWorkoutDetails(workout, index))}
            </ScrollView>
          </View>
          
          {/* Add a transparent touchable area for closing the modal */}
          <TouchableOpacity 
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.medium,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: {
    width: 40,
  },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    margin: 12,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: COLORS.border,
  },
  
  filtersContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.medium,
    marginBottom: 8,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  activeFilter: {
    borderColor: COLORS.primary,
  },
  filterIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.medium,
  },
  
  calendarContainer: {
    flex: 1,
  },
  monthPage: {
    width: SCREEN_WIDTH,
    padding: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.dark,
    textAlign: 'center',
    marginBottom: 12,
  },
  weekdayContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  weekdayItem: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.medium,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    padding: 2,
  },
  outOfMonthDay: {
    backgroundColor: 'rgba(245, 247, 250, 0.5)',
  },
  currentWorkoutDay: {
    backgroundColor: COLORS.current,
  },
  otherWorkoutDay: {
    backgroundColor: COLORS.other,
  },
  mixedWorkoutDay: {
    backgroundColor: '#f2f9ff',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.dark,
  },
  outOfMonthText: {
    color: COLORS.text.light,
    fontWeight: '400',
  },
  workoutDayText: {
    color: COLORS.text.dark,
    fontWeight: '600',
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  workoutIndicatorContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentWorkoutIndicator: {
    backgroundColor: COLORS.primary,
  },
  otherWorkoutIndicator: {
    backgroundColor: COLORS.accent,
  },
  halfWorkoutIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 1,
  },
  workoutCountText: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingTop: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
    color: COLORS.text.light,
  },
  activeNavButton: {
    transform: [{ translateY: -10 }],
  },
  activeNavIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  activeNavText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.75,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25, // This creates a tap area at the top to close the modal
  },
  
  workoutCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
  },
  currentWorkoutCard: {
    borderLeftColor: COLORS.primary,
  },
  otherWorkoutCard: {
    borderLeftColor: COLORS.accent,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutTitleArea: {
    flex: 2,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  dayName: {
    fontSize: 14,
    color: COLORS.text.medium,
    marginTop: 4,
  },
  workoutMetaArea: {
    flex: 1,
    alignItems: 'flex-end',
  },
  workoutCycle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.medium,
    marginBottom: 6,
  },
  planIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  currentPlanIndicator: {
    backgroundColor: 'rgba(58, 134, 255, 0.1)',
  },
  otherPlanIndicator: {
    backgroundColor: 'rgba(255, 158, 67, 0.1)',
  },
  planIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exercisesContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  exerciseItem: {
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
    marginBottom: 8,
  },
  exerciseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: COLORS.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  currentStatValue: {
    color: COLORS.primary,
  },
  otherStatValue: {
    color: COLORS.accent,
  },
  workoutTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  workoutTime: {
    fontSize: 13,
    color: COLORS.text.medium,
    marginLeft: 6,
  },
});

export default WorkoutCalendar;