import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from './ThemeContext';

export function Text(props) {
  const { theme } = useTheme();
  
  return (
    <RNText
      {...props}
      style={[
        { color: theme.text.dark },
        props.style
      ]}
    />
  );
};