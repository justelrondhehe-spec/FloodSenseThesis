import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Switch, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Fonts } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '../constants/firebase';

type AppHeaderProps = {
  showBadge?: boolean;
};

export default function AppHeader({ showBadge = true }: AppHeaderProps) {
  const [notifVisible, setNotifVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const { darkMode, setDarkMode, fontSize, setFontSize, unitSystem, setUnitSystem } = useTheme();

  const sheet = darkMode ? styles.sheetDark : styles.sheet;
  const titleColor = darkMode ? '#fff' : Colors.navyDark;
  const subtitleColor = darkMode ? '#aaa' : '#666';
  const borderColor = darkMode ? '#2a3a4a' : '#f0f0f0';
  const sectionColor = darkMode ? '#667' : '#999';

  const fontSizeScale = fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.2 : 1;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSettingsVisible(false); // Close the sheet as they log out
    } catch (error) {
      console.error('Error signing out: ', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of FloodSense?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: handleLogout }
      ]
    );
  };

  const notifications = [
    { id: '1', icon: 'alert-triangle', color: Colors.orange, title: 'Water Level Rising', desc: 'Level reached 1.8m in Barangay 659', time: '2 mins ago' },
    { id: '2', icon: 'alert-circle', color: '#C0392B', title: 'Flood Warning Issued', desc: 'Moderate flooding expected in low-lying areas', time: '15 mins ago' },
    { id: '3', icon: 'check-circle', color: Colors.teal, title: 'Sensor Online', desc: 'All IoT sensors reporting normally', time: '1 hour ago' },
  ];

  return (
    <>
      <LinearGradient colors={[Colors.navyDark, Colors.navyMid]} style={styles.header}>
        {/* Logo + Title */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Feather name="map-pin" size={20} color={Colors.textWhite} />
          </View>
          <View>
            <Text style={styles.appName}>FloodSense</Text>
            <Text style={styles.appSub}>
              <Text style={{ color: Colors.teal }}>BARANGAY 659</Text>{' '}· LIVE
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setNotifVisible(true)}>
            <Feather name="bell" size={18} color={Colors.textWhite} />
            {showBadge && <View style={styles.badge} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsVisible(true)}>
            <Feather name="settings" size={18} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Notifications Modal ── */}
      <Modal visible={notifVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: titleColor, fontSize: Fonts.sizes.lg * fontSizeScale }]}>
                Notifications
              </Text>
              <TouchableOpacity onPress={() => setNotifVisible(false)}>
                <Feather name="x" size={22} color={titleColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map((n) => (
                <View key={n.id} style={[styles.notifItem, { borderBottomColor: borderColor }]}>
                  <View style={[styles.notifIcon, { backgroundColor: n.color + '20' }]}>
                    <Feather name={n.icon as any} size={18} color={n.color} />
                  </View>
                  <View style={styles.notifText}>
                    <Text style={[styles.notifTitle, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                      {n.title}
                    </Text>
                    <Text style={[styles.notifDesc, { color: subtitleColor, fontSize: Fonts.sizes.xs * fontSizeScale }]}>
                      {n.desc}
                    </Text>
                    <Text style={[styles.notifTime, { fontSize: Fonts.sizes.xs * fontSizeScale }]}>
                      {n.time}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Settings Modal ── */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: titleColor, fontSize: Fonts.sizes.lg * fontSizeScale }]}>
                Settings
              </Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Feather name="x" size={22} color={titleColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* ── Appearance ── */}
              <Text style={[styles.sectionLabel, { color: sectionColor }]}>APPEARANCE</Text>

              {/* Dark Mode */}
              <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
                <View style={styles.settingLeft}>
                  <Feather name="moon" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                    Dark Mode
                  </Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#ccc', true: Colors.teal }}
                  thumbColor="#fff"
                />
              </View>

              {/* Font Size */}
              <View style={[styles.settingRow, { borderBottomColor: borderColor, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
                <View style={styles.settingLeft}>
                  <Feather name="type" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                    Font Size
                  </Text>
                </View>
                <View style={styles.fontSizeRow}>
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[styles.fontSizeBtn, fontSize === size && styles.fontSizeBtnActive]}
                      onPress={() => setFontSize(size)}
                    >
                      <Text style={[
                        styles.fontSizeBtnText,
                        fontSize === size && styles.fontSizeBtnTextActive,
                      ]}>
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Units ── */}
              <Text style={[styles.sectionLabel, { color: sectionColor }]}>UNITS</Text>
              <View style={[styles.settingRow, { borderBottomColor: borderColor, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
                <View style={styles.settingLeft}>
                  <Feather name="sliders" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                    Unit System
                  </Text>
                </View>
                <View style={styles.fontSizeRow}>
                  {([['metric', 'Metric (m)'], ['imperial', 'Imperial (ft)']] as const).map(([val, label]) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.fontSizeBtn, unitSystem === val && styles.fontSizeBtnActive]}
                      onPress={() => setUnitSystem(val)}
                    >
                      <Text style={[
                        styles.fontSizeBtnText,
                        unitSystem === val && styles.fontSizeBtnTextActive,
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Notifications ── */}
              <Text style={[styles.sectionLabel, { color: sectionColor }]}>NOTIFICATIONS</Text>
              <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
                <View style={styles.settingLeft}>
                  <Feather name="bell" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                    Push Notifications
                  </Text>
                </View>
                <Switch value={pushEnabled} onValueChange={setPushEnabled}
                  trackColor={{ false: '#ccc', true: Colors.teal }} thumbColor="#fff" />
              </View>
              <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
                <View style={styles.settingLeft}>
                  <Feather name="volume-2" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                    Alert Sounds
                  </Text>
                </View>
                <Switch value={soundEnabled} onValueChange={setSoundEnabled}
                  trackColor={{ false: '#ccc', true: Colors.teal }} thumbColor="#fff" />
              </View>

              {/* ── Privacy ── */}
              <Text style={[styles.sectionLabel, { color: sectionColor }]}>PRIVACY</Text>
              <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
                <View style={styles.settingLeft}>
                  <Feather name="map-pin" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>
                    Share Location
                  </Text>
                </View>
                <Switch value={locationEnabled} onValueChange={setLocationEnabled}
                  trackColor={{ false: '#ccc', true: Colors.teal }} thumbColor="#fff" />
              </View>

              {/* ── About ── */}
              <Text style={[styles.sectionLabel, { color: sectionColor }]}>ABOUT</Text>
              <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
                <View style={styles.settingLeft}>
                  <Feather name="info" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>App Version</Text>
                </View>
                <Text style={[styles.settingValue, { color: subtitleColor }]}>1.0.0</Text>
              </View>
              <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
                <View style={styles.settingLeft}>
                  <Feather name="map-pin" size={18} color={Colors.teal} />
                  <Text style={[styles.settingText, { color: titleColor, fontSize: Fonts.sizes.sm * fontSizeScale }]}>Barangay</Text>
                </View>
                <Text style={[styles.settingValue, { color: subtitleColor }]}>659</Text>
              </View>

              {/* ── ADD ACCOUNT / LOGOUT HERE ── */}
              <Text style={[styles.sectionLabel, { color: sectionColor, marginTop: Spacing.lg }]}>ACCOUNT</Text>
              <TouchableOpacity 
                style={styles.logoutBtn} 
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Feather name="log-out" size={18} color="#e74c3c" />
                <Text style={[styles.settingText, { color: '#e74c3c', fontSize: Fonts.sizes.sm * fontSizeScale, fontWeight: '700' }]}>
                  Log Out
                </Text>
              </TouchableOpacity>
              {/* ─────────────────────────────── */}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 50,
    paddingBottom: Spacing.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.teal, alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textWhite, letterSpacing: 0.3 },
  appSub: { fontSize: Fonts.sizes.xs, color: Colors.textLight, fontWeight: '600', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.overlayLight, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.orange, borderWidth: 1.5, borderColor: Colors.navyMid,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.base, maxHeight: '80%',
  },
  sheetDark: {
    backgroundColor: '#0d1f33', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.base, maxHeight: '80%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: Spacing.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  sheetTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800' },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  notifIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notifText: { flex: 1 },
  notifTitle: { fontWeight: '700' },
  notifDesc: { marginTop: 2 },
  notifTime: { color: Colors.teal, marginTop: 4, fontWeight: '600' },
  sectionLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', letterSpacing: 1.2, marginTop: Spacing.base, marginBottom: Spacing.sm },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  settingText: { fontWeight: '500' },
  settingValue: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  fontSizeRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  fontSizeBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ccc',
  },
  fontSizeBtnActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  fontSizeBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  fontSizeBtnTextActive: { color: '#fff' },

  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.sm, 
    paddingVertical: 14, 
    paddingHorizontal: 4, // Aligns nicely with the text above
    marginBottom: Spacing.xl // Gives a little breathing room at the bottom of the scroll
  },
});