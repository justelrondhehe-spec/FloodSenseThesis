import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../constants/theme';

// Plain-language privacy notice. Have your adviser / the barangay review the wording before launch.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'What we collect',
    body: [
      'Your email address and password (the password is stored securely by our login provider and is never visible to us).',
      'Your full name, mobile number and home address, which you enter when you finish setting up your account.',
      'A notification token for your phone, so we can send you flood alerts.',
    ],
  },
  {
    title: 'Why we collect it',
    body: [
      'To identify you as a resident of Barangay Pamplona Tres.',
      'To warn you and reach you during floods and other emergencies.',
      'Barangay officials may use your contact details to check on residents during an emergency.',
    ],
  },
  {
    title: 'Your location',
    body: [
      'The app uses your phone’s location only while it is open, to show you on the map and to find a walking route.',
      'Your location is not saved to your account. When you tap Navigate, it is sent to a public routing service (OpenStreetMap-based) to calculate the route, and map images are loaded from OpenStreetMap.',
    ],
  },
  {
    title: 'Who can see your data',
    body: [
      'Only you can read or change your own profile in the app.',
      'Authorized barangay administrators using the FloodSense website can view resident records.',
      'We do not sell your data or use it for advertising.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'You may ask to see, correct or delete your information at any time by contacting the Barangay Pamplona Tres office.',
      'You can turn off alert notifications in the app settings, and you can log out at any time.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Notice</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          FloodSense helps residents of Barangay Pamplona Tres prepare for and respond to floods. This notice explains
          what information the app uses and why.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((line) => (
              <View key={line} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'•'}</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn: { padding: 6, borderRadius: Radius.full },
  title: { fontSize: 20, fontWeight: '800', color: Colors.navy },
  content: { padding: Spacing.base, paddingBottom: 40, gap: Spacing.base },
  intro: { fontSize: 14, lineHeight: 21, color: '#444' },
  section: { gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 14, color: Colors.teal, lineHeight: 21 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#444' },
});
