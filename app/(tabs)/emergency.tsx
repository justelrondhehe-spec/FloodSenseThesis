import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../../components/AppHeader';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';
import { emergencyContacts } from '../../constants/data';
import { useTheme } from '../../constants/ThemeContext';

type IconName = React.ComponentProps<typeof Feather>['name'];

function dialNumber(number: string) {
  const cleaned = number.replace(/\D/g, '');
  Linking.openURL(`tel:${cleaned}`).catch(() =>
    Alert.alert('Cannot place call', 'Please dial ' + number + ' manually.')
  );
}

const iconMap: Record<string, IconName> = {
  shield: 'shield', home: 'home', radio: 'radio', 'alert-circle': 'alert-circle',
};
const contactIconColors: string[] = [Colors.red, Colors.navyLight, Colors.red, Colors.teal, Colors.orange];

export default function EmergencyScreen() {
  const { darkMode, fontSize } = useTheme();

  const bg = darkMode ? '#0a1628' : Colors.bgLight;
  const cardBg = darkMode ? '#0d1f33' : Colors.bgWhite;
  const textPrimary = darkMode ? '#ffffff' : Colors.textDark;
  const textSecondary = darkMode ? '#aaaaaa' : Colors.textGray;
  const borderColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const contactCardBg = darkMode ? '#0d1f33' : Colors.navyMid;
  const fs = fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.2 : 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={[]}>
      <AppHeader />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.subHeader, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          <Text style={[styles.subLabel, { color: textSecondary, fontSize: Fonts.sizes.xs * fs }]}>QUICK DIAL</Text>
          <Text style={[styles.pageTitle, { color: textPrimary, fontSize: Fonts.sizes.xl * fs }]}>Emergency Contacts</Text>
        </View>

        <View style={styles.body}>
          <TouchableOpacity onPress={() => dialNumber('911')} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.redLight, Colors.red, Colors.redDark]}
              style={styles.sosBanner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.sosIconBox}>
                <Feather name="alert-circle" size={26} color={Colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sosLabel, { fontSize: Fonts.sizes.xs * fs }]}>EMERGENCY</Text>
                <Text style={[styles.sosNumber, { fontSize: Fonts.sizes.xxl * fs }]}>SOS · 911</Text>
              </View>
              <View style={styles.sosArrow}>
                <Feather name="chevron-right" size={22} color={Colors.textWhite} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {emergencyContacts.map((contact, idx) => (
            <View key={contact.id} style={[styles.contactCard, { backgroundColor: contactCardBg }]}>
              <View style={[styles.contactIconBox, { backgroundColor: `${contactIconColors[idx]}22` }]}>
                <Feather name={iconMap[contact.icon] ?? 'phone'} size={20} color={contactIconColors[idx]} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { fontSize: Fonts.sizes.base * fs, color: darkMode ? '#ffffff' : Colors.textWhite }]}>{contact.name}</Text>
                <Text style={[styles.contactSub, { fontSize: Fonts.sizes.xs * fs }]}>{contact.subtitle}</Text>
                <Text style={[styles.contactNumber, { fontSize: Fonts.sizes.sm * fs }]}>{contact.number}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn} onPress={() => dialNumber(contact.number)}>
                <Feather name="phone" size={18} color={Colors.textWhite} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.disclaimer, { backgroundColor: cardBg }]}>
            <Feather name="info" size={14} color={textSecondary} />
            <Text style={[styles.disclaimerText, { color: textSecondary, fontSize: Fonts.sizes.xs * fs }]}>
              In case of life-threatening emergency, always call 911 first. These numbers are for non-critical assistance.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  subHeader: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  subLabel: { fontWeight: '700', letterSpacing: 1 },
  pageTitle: { fontWeight: '800', marginTop: 2 },
  body: { padding: Spacing.base, gap: Spacing.sm },
  sosBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.base, gap: Spacing.md, marginBottom: Spacing.sm },
  sosIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  sosLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 1.5 },
  sosNumber: { fontWeight: '900', color: Colors.textWhite, letterSpacing: 0.5 },
  sosArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  contactCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.md },
  contactIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1 },
  contactName: { fontWeight: '800' },
  contactSub: { color: Colors.textLight, marginTop: 1 },
  contactNumber: { color: Colors.teal, fontWeight: '700', marginTop: 3 },
  callBtn: { width: 42, height: 42, borderRadius: Radius.full, backgroundColor: Colors.teal, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { flexDirection: 'row', gap: 8, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm },
  disclaimerText: { flex: 1, lineHeight: 18 },
});