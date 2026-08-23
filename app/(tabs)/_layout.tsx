import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from '../../constants/theme';
import { useTheme } from '../../constants/ThemeContext';
import React from 'react';

type TabIconProps = {
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  focused: boolean;
};

function TabIcon({ name, label, focused }: TabIconProps) {
  const { darkMode } = useTheme();
  const inactiveColor = darkMode ? '#888' : Colors.textGray;

  return (
    <View style={styles.tabItem}>
      <View style={focused ? styles.activeIconWrapper : styles.iconWrapper}>
        <Feather
          name={name}
          size={18}
          color={focused ? Colors.textWhite : inactiveColor}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: inactiveColor },
          focused && styles.tabLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { darkMode } = useTheme();

  const tabBarBg = darkMode ? '#0d1f33' : Colors.bgWhite;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: tabBarBg },
        ],
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="map" label="Map" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="book-open" label="Guide" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="phone-call" label="Emergency" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    height: 70,
    borderRadius: Radius.xxl,
    marginHorizontal: 12,
    marginBottom: 16,
    position: 'absolute',
    paddingTop: 6,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBarItem: {
    flex: 1,
    height: 70,
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 23,
  },
  iconWrapper: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconWrapper: {
    width: 60,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal,
    borderRadius: Radius.full,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabLabelActive: {
    color: Colors.teal,
    fontWeight: '700',
  },
});