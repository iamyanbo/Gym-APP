import React, { useState } from "react";
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import WorkoutPlanViewer from "./src/WorkoutPlanViewer";
import { createStackNavigator } from "@react-navigation/stack";
import WorkoutPage from "./src/WorkoutPage";
import WorkoutDayViewer from "./src/WorkoutDayViewer";
import EditPlan from "./src/EditPlan";
import WorkoutStats from "./src/WorkoutStats";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          gestureEnabled: false,
          headerShown: false,
        }}
      >
        <Stack.Screen name="WorkoutPage" component={WorkoutPage} />
        <Stack.Screen name="WorkoutDayViewer" component={WorkoutDayViewer} />
        <Stack.Screen name="WorkoutPlanViewer" component={WorkoutPlanViewer} />
        <Stack.Screen name="EditPlan" component={EditPlan} />
        <Stack.Screen name="WorkoutStats" component={WorkoutStats} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  button: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5
  },
  selectedButton: {
    backgroundColor: "#007bff"
  },
  buttonText: {
    color: "#000"
  },
  listItem: {
    fontSize: 18,
    marginVertical: 8
  }
});
