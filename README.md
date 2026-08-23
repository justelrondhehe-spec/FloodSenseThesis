# 🌊 FloodSense

A community-based flood monitoring, emergency response, and evacuation routing mobile app built specifically for **Barangay 659, Manila**.
Built with **Expo + React Native + TypeScript** and powered by **Firebase** for real-time IoT sensor data and authentication.

---

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Auth** | Login, Registration, Email Verification, and Mobile Number setup flow. |
| **Home** | Live flood water level widget, real-time threshold popups, map preview, and a dynamic recent alerts feed. |
| **Map** | Interactive evacuation map with live user tracking (expo-location), custom markers, and polyline routing to safe zones. |
| **Guide** | Expandable safety guidelines — Before, During, and After a Flood. |
| **Emergency** | SOS 911 one-tap dialer + quick-dial local emergency contacts. |

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

# 2. Start dev server
npx expo start

# 3. Scan the QR code with Expo Go
```

---

## 🔧 Next Steps / Integrations

- [x] **Real sensor API** — Replace mock `floodData` in `constants/data.ts` with a live API call
- [x] **expo-maps / react-native-maps** — Replace mock map with real MapView
- [ ] **Push notifications** — Use `expo-notifications` for flood alerts
- [x] **Geolocation** — Use `expo-location` for real user position
- [ ] **AsyncStorage** — Persist alerts and user preferences
- [x] **Auth** — Add barangay resident login

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based navigation |
| `expo-linear-gradient` | Gradient backgrounds & buttons |
| `expo-blur` | Blur effects |
| `@expo/vector-icons` | Feather icon set |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-screens` | Native screen optimization |
