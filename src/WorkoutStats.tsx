import React, { useEffect, useState, useRef, useContext } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Text } from './TextOverride';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/Ionicons';
import { WorkoutContext } from './WorkoutContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from './ThemeContext';

const COMPLETED_WORKOUTS_FILE = FileSystem.documentDirectory + 'CompletedWorkouts.json';
const screenWidth = Dimensions.get('window').width;

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

function WorkoutStats({ route }) {
  const navigation = useNavigation();
  const { workoutFile, currentCycle } = useContext(WorkoutContext);
  const { theme } = useTheme();
  const [completedData, setCompletedData] = useState([]);
  const [exerciseName, setExerciseName] = useState('');
  const [allExercises, setAllExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [workoutName, setWorkoutName] = useState('');
  const [chartWidth, setChartWidth] = useState(0);
  
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const fileName = workoutFile.replace(/ /g, '_') + '.json';
        const planUri = FileSystem.documentDirectory + fileName;
        const fileContent = await FileSystem.readAsStringAsync(planUri);
        const workoutData = JSON.parse(fileContent);
        setWorkoutName(workoutData.type || workoutFile);

        const fileExists = await FileSystem.getInfoAsync(COMPLETED_WORKOUTS_FILE);
        const data = fileExists.exists
          ? JSON.parse(await FileSystem.readAsStringAsync(COMPLETED_WORKOUTS_FILE))
          : [];
        const filtered = data.filter(w => w.workoutFile === workoutFile);

        const names = new Set();
        filtered.forEach(entry => {
          entry.exercises.forEach(ex => names.add(ex.name));
        });

        setCompletedData(filtered);
        setAllExercises(Array.from(names).sort());
        
        if (Array.from(names).length > 0 && !exerciseName) {
          setExerciseName(Array.from(names)[0]);
        }
      } catch (error) {
        console.error('Error loading workout data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [workoutFile, navigation]);
  
  const getExerciseEntries = () => {
    if (!exerciseName || !completedData.length) return [];
    
    return completedData
      .flatMap(w => w.exercises.map(e => ({ date: w.date, ...e })))
      .filter(e => e.name === exerciseName)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  useEffect(() => {
    if (scrollViewRef.current && chartWidth > 0) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [chartWidth, exerciseName, selectedMetric]);
  
  const safeParseFloat = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const renderExerciseSelector = () => {
    return (
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Choose Exercise:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.exerciseButtonsContainer}
          data={allExercises}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.exerciseButton, 
                exerciseName === item && styles.exerciseButtonActive
              ]}
              onPress={() => {
                setExerciseName(item);
              }}
            >
              <Text 
                style={[
                  styles.exerciseButtonText,
                  exerciseName === item && styles.exerciseButtonTextActive
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderMetricSelector = () => {
    const metrics = ['weight', 'reps', 'sets'];
    
    return (
      <View style={styles.metricSelectorContainer}>
        {metrics.map((metric) => (
          <TouchableOpacity
            key={metric}
            style={[
              styles.metricButton,
              selectedMetric === metric && styles.metricButtonActive
            ]}
            onPress={() => {
              setSelectedMetric(metric);
            }}
          >
            <Text 
              style={[
                styles.metricButtonText,
                selectedMetric === metric && styles.metricButtonTextActive
              ]}
            >
              {metric.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderChart = () => {
    if (!exerciseName) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this exercise</Text>
        </View>
      );
    }
  
    const entries = getExerciseEntries();
    if (entries.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this exercise</Text>
        </View>
      );
    }
    
    const POINT_WIDTH = 70;
    const CHART_PADDING = 0;
    
    const scrollableWidth = Math.max(screenWidth - CHART_PADDING * 2, entries.length * POINT_WIDTH);
    
    if (chartWidth !== scrollableWidth) {
      setChartWidth(scrollableWidth);
    }
    
    const values = entries.map(e => safeParseFloat(e[selectedMetric]));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    
    const chartData = {
      labels: entries.map(e => format(new Date(e.date), 'MM/dd')),
      datasets: [
        {
          data: values,
          strokeWidth: 3,
          color: () => '#3a86ff',
        },
      ],
    };
    
    const chartHeight = 220;
    
    return (
      <View style={styles.chartContainer}>
        <LinearGradient
          colors={['#f7f9ff', '#ffffff']}
          style={styles.chartGradient}
        >
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              {selectedMetric.toUpperCase()} Progress
            </Text>
          </View>
          
          <View style={styles.chartWithYAxisContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.chartScrollView}
              onContentSizeChange={(width) => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }}
            >
              <LineChart
                data={chartData}
                width={scrollableWidth}
                height={chartHeight}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#f7f9ff',
                  decimalPlaces: selectedMetric === 'weight' ? 1 : 0,
                  color: (opacity = 1) => `rgba(58, 134, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(68, 68, 68, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#3a86ff",
                    fill: "#ffffff",
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '5, 5',
                    strokeWidth: 1,
                    stroke: 'rgba(0, 0, 0, 0.1)',
                  },
                  formatYLabel: () => '',
                  yAxisInterval: 1,
                  yLabelsOffset: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
                bezier
                style={styles.chart}
                fromZero={minValue <= 0}
                withShadow={false}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={true}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={false}
                withYAxisLabel={false}
                horizontalLabelRotation={0}
                renderDotContent={({ x, y, index }) => {
                  const value = values[index];
                  const safeY = Math.max(35, y - 30);
                  
                  return (
                    <View
                      key={index}
                      style={{
                        position: 'absolute',
                        top: safeY,
                        left: x - 20,
                        backgroundColor: '#3a86ff',
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                        {selectedMetric === 'weight' ? value.toFixed(1) : value}
                      </Text>
                    </View>
                  );
                }}
              />
            </ScrollView>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderProgressDetails = () => {
    if (!exerciseName) return null;
  
    const entries = completedData
      .flatMap(w =>
        w.exercises.map(e => ({
          ...e,
          date: w.date,
          timestamp: w.timestamp || w.date,
        }))
      )
      .filter(e => e.name === exerciseName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
    if (entries.length === 0) return null;
  
    const currentEntry = entries[0];
    const currentValue = safeParseFloat(currentEntry[selectedMetric]);
    const maxValue = Math.max(...entries.map(e => safeParseFloat(e[selectedMetric])));
    
    return (
      <View style={styles.statsCardContainer}>
        <LinearGradient
          colors={['#ffffff', '#f7f9ff']}
          style={styles.statsContainer}
        >
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentValue.toFixed(selectedMetric === 'weight' ? 1 : 0)}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{maxValue.toFixed(selectedMetric === 'weight' ? 1 : 0)}</Text>
            <Text style={styles.statLabel}>Max</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text.medium }]}>Loading workout data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {allExercises.length > 0 ? (
          <>
            {renderExerciseSelector()}
            {renderMetricSelector()}
            {renderProgressDetails()}
            {renderChart()}
          </>
        ) : (
          <View style={[styles.noDataContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.noDataText, { color: theme.text.medium }]}>No workout data available yet.</Text>
            <Text style={[styles.noDataSubtext, { color: theme.text.light }]}>Complete a workout to see your progress!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  selectorContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
    paddingLeft: 4,
  },
  exerciseButtonsContainer: {
    paddingVertical: 8,
  },
  exerciseButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e9ecef', 
    marginRight: 8,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseButtonActive: {
    backgroundColor: '#3a86ff',
    shadowColor: '#3a86ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  exerciseButtonTextActive: {
    color: '#fff',
  },
  metricSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  metricButtonActive: {
    backgroundColor: '#3a86ff',
  },
  metricButtonText: {
    fontWeight: '600',
    color: '#555',
    fontSize: 14,
  },
  metricButtonTextActive: {
    color: '#fff',
  },
  statsCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  chartGradient: {
    padding: 16,
    borderRadius: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  chartWithYAxisContainer: {
    height: 220,
    marginTop: 10,
    position: 'relative',
  },
  chartScrollView: {
    width: '100%',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default WorkoutStats;