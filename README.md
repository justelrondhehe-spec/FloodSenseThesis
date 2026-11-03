# 🌊 FloodSense

A community-based flood monitoring, emergency response, and evacuation routing mobile app built specifically for **Barangay Pamplona Tres, Las Pinas City**.
Built with **Expo + React Native + TypeScript** and powered by **Supabase** for real-time IoT sensor data and authentication.

---

## 📱 Screens

| Screen        | Description                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Auth**      | Login, Registration, Email Verification, and Mobile Number setup flow.                                                  |
| **Home**      | Live flood water level widget, real-time threshold popups, map preview, and a dynamic recent alerts feed.               |
| **Map**       | Interactive evacuation map with live user tracking (expo-location), custom markers, and polyline routing to safe zones. |
| **Guide**     | Expandable safety guidelines — Before, During, and After a Flood.                                                       |
| **Emergency** | SOS 911 one-tap dialer + quick-dial local emergency contacts.                                                           |

---

## 🚀 Setup

### Prerequisites

- Node.js (Download Latest Version)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Create your local .env from the example (the real .env is git-ignored)
#    Windows (PowerShell / cmd):  copy .env.example .env
#    macOS / Linux:               cp .env.example .env

# 3. Start dev server (--clear makes Expo pick up the .env)
npx expo start --clear

# 4. Scan the QR code with Expo Go
```

If login fails with "Invalid API key" or the console says `Missing EXPO_PUBLIC_SUPABASE_ANON_KEY`,
the `.env` file is missing, has a space or quotes around the key, or Expo was not restarted with `--clear`.

### Database (one-time, only for whoever owns the Supabase project)

Run `supabase/residents.sql` and `supabase/alerts.sql` in the Supabase SQL Editor.
Teammates using the shared project do **not** need to do this again.

---

## 🔧 Status

- [x] **Auth** — Supabase email login, email verification, resident profile (name, mobile, address) with privacy consent
- [x] **Live alerts** — `alerts` table with realtime updates; header bell and Home feed
- [x] **Push notifications** — `expo-notifications` + database trigger (needs a real build and an EAS project; see below)
- [x] **Evacuation routing** — walking routes that avoid flood zones (OpenStreetMap-based)
- [x] **Settings persistence** — dark mode, font size and units are remembered
- [ ] **Live water level** — sensor integration lives on the `sensor-integration` branch
- [ ] **Release build** — run `eas init`, add the Supabase key as an EAS environment variable, upload an Android FCM key, then `eas build`

---

## 📦 Dependencies

| Package                          | Purpose                        |
| -------------------------------- | ------------------------------ |
| `expo-router`                    | File-based navigation          |
| `expo-linear-gradient`           | Gradient backgrounds & buttons |
| `expo-blur`                      | Blur effects                   |
| `@expo/vector-icons`             | Feather icon set               |
| `react-native-safe-area-context` | Safe area insets               |
| `react-native-screens`           | Native screen optimization     |
