import React from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Switch,
  Image
} from 'react-native';
import { Text } from './TextOverride';
import { useTheme } from './ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';

const ProfilePage = () => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.dark }]}>Profile</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon 
              name={isDark ? "moon" : "sunny"} 
              size={24} 
              color={theme.primary} 
              style={styles.settingIcon} 
            />
            <Text style={[styles.settingText, { color: theme.text.dark }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          
          <Switch
            trackColor={{ false: "#767577", true: theme.primaryDark }}
            thumbColor={isDark ? theme.primary : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleTheme}
            value={isDark}
          />
        </View>
      </View>

      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: theme.text.light }]}>
          App Version 1.1.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginTop: 40,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionContainer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
  }
});

export default ProfilePage;