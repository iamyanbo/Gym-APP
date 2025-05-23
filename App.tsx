import React, { useState, useEffect } from "react";
import { StyleSheet, View, StatusBar, useColorScheme, Pressable } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WorkoutPlanViewer from "./src/WorkoutPlanViewer";
import WorkoutPage from "./src/WorkoutPage";
import WorkoutDayViewer from "./src/WorkoutDayViewer";
import EditPlan from "./src/EditPlan";
import WorkoutStats from "./src/WorkoutStats";
import WorkoutCalendar from "./src/WorkoutCalendar";
import ProfilePage from "./src/ProfilePage";
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from './src/TextOverride';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkoutContextProvider } from "./src/WorkoutContext";
import { ThemeProvider, useTheme } from './src/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#3a86ff',
  primaryDark: '#2b68cc',
  secondary: '#4361ee',
  white: '#ffffff',
  text: {
    light: '#aaaaaa',
  },
};

function MainTabs() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.border,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.text.light,
        tabBarIconStyle: {
          marginBottom: 0,
        },
        safeAreaInsets: { bottom: 0 },
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={{ 
              color: theme.primary + '40',
              borderless: true,
              radius: 0
            }}
          />
        ),
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={WorkoutPage} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            focused ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.activeTabIcon}
              >
                <Icon name="home" size={size} color={COLORS.white} />
              </LinearGradient>
            ) : <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="CalendarTab" 
        component={WorkoutCalendar} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            focused ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.activeTabIcon}
              >
                <Icon name="calendar" size={size} color={COLORS.white} />
              </LinearGradient>
            ) : <Icon name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="StatsTab" 
        component={WorkoutStats} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            focused ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.activeTabIcon}
              >
                <Icon name="stats-chart" size={size} color={COLORS.white} />
              </LinearGradient>
            ) : <Icon name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfilePage} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            focused ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.activeTabIcon}
              >
                <Icon name="person" size={size} color={COLORS.white} />
              </LinearGradient>
            ) : <Icon name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
      
      <WorkoutContextProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              gestureEnabled: false,
              headerShown: false,
            }}
          >
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="WorkoutDayViewer" component={WorkoutDayViewer} />
            <Stack.Screen name="WorkoutPlanViewer" component={WorkoutPlanViewer} />
            <Stack.Screen name="EditPlan" component={EditPlan} />
          </Stack.Navigator>
        </NavigationContainer>
      </WorkoutContextProvider>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    elevation: 8,
    borderTopWidth: 0,
    borderTopColor: '#eaeaea',
    height: 60,
    justifyContent: 'center',
    paddingBottom: 0,
    paddingTop: 10,
  },
  activeTabIcon: {
    width: 40, 
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  }
});
