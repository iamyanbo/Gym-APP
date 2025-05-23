import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightTheme = {
  primary: '#3a86ff',
  primaryDark: '#2b68cc',
  secondary: '#4361ee',
  background: '#ffffff',
  card: '#ffffff',
  tabBarBackground: '#ffffff',
  border: '#eaeaea',
  statusBar: 'dark-content',
  text: {
    dark: '#333333',
    medium: '#666666',
    light: '#aaaaaa',
  },
};

export const darkTheme = {
  primary: '#5a96ff',
  primaryDark: '#3a76df',
  secondary: '#6371ee',
  background: '#121212',
  card: '#1e1e1e',
  tabBarBackground: '#1e1e1e',
  border: '#2c2c2c',
  statusBar: 'light-content',
  text: {
    dark: '#f5f5f5',
    medium: '#bbbbbb',
    light: '#888888',
  },
};

const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          setIsDark(deviceTheme === 'dark');
        }
      } catch (error) {
        console.log('Error loading theme preference', error);
        setIsDark(deviceTheme === 'dark');
      }
    };

    loadThemePreference();
  }, [deviceTheme]);

  const toggleTheme = () => {
    const newThemeValue = !isDark;
    setIsDark(newThemeValue);
    
    try {
      AsyncStorage.setItem('theme_preference', newThemeValue ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme preference', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;