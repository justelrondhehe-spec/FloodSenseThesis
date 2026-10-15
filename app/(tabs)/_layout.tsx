import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from '../../constants/theme';
import { useTheme } from '../../constants/ThemeContext';
import React from 'react';

type TabIconProps = {
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  focused: boolean;
};

// Full-height tap target with instant press feedback.
function TabButton(props: any) {
  const { onPress, onLongPress, accessibilityState, accessibilityLabel, testID, children } = props;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={{ top: 8, bottom: 8 }}
      android_ripple={null}
      style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
    >
      {children}
    </Pressable>
  );
}

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
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Mount every tab up front so switching never waits on a first render (the maps load slowly).
        lazy: false,
        tabBarButton: TabButton,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: tabBarBg, bottom: Math.max(insets.bottom, 12) },
        ],
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
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
    height: 64,
    borderRadius: Radius.xxl,
    marginHorizontal: 12,
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 0,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBarItem: {
    flex: 1,
    height: 64,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  tabBarIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  tabItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconWrapper: {
    width: 60,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal,
    borderRadius: Radius.full,
    marginBottom: 2,
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
