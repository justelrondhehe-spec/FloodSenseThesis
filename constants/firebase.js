import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from 'firebase/database'; // Added for sensors!
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAouuy2ANmlXuz72OACyZqglYyg93buTEA",
  authDomain: "floodsensethesis.firebaseapp.com",
  projectId: "floodsensethesis",
  storageBucket: "floodsensethesis.firebasestorage.app",
  messagingSenderId: "698419096569",
  appId: "1:698419096569:web:6cf5607fe52953d1e7eb28",
  measurementId: "G-S0948R42Z2"
};

console.log("=== FIREBASE KEY CHECK ===");
console.log(firebaseConfig.apiKey);
console.log("==========================");

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence to fix the terminal warning
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize and export the Realtime Database for your sensor widget
export const db = getDatabase(app);
export const firestore = getFirestore(app); 