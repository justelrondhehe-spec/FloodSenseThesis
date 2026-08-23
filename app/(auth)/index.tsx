import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Image
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

// Firebase Auth & Firestore
import { auth, firestore } from "../../constants/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function AuthScreen() {
  const [step, setStep] = useState<"auth" | "verify" | "phone">("auth");
  const [mode, setMode] = useState<"login" | "register">("login");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  
  // NEW: State for password visibility
  const [showPassword, setShowPassword] = useState(false);

  // --- STEP 1: EXPLICIT LOGIN OR SIGN UP ---
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }
    
    setLoading(true);
    try {
      if (mode === "login") {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await checkUserStatus(userCred.user);
      } else {
        const newCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(newCred.user);
        setStep("verify");
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        Alert.alert("Login Failed", "Incorrect email or password.");
      } else if (error.code === 'auth/email-already-in-use') {
        Alert.alert("Account Exists", "This email is already registered. Please log in.");
      } else {
        Alert.alert("Authentication Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async (user: any) => {
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      setStep("verify");
      return;
    }

    const userDoc = await getDoc(doc(firestore, "mobile_users", user.uid));
    
    if (userDoc.exists() && userDoc.data().phoneNumber) {
      router.replace("/(tabs)");
    } else {
      setStep("phone");
    }
  };

  // --- STEP 2: CHECK EMAIL VERIFICATION ---
  const checkVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        setStep("phone");
      } else {
        Alert.alert("Not Verified", "Please check your inbox and click the verification link first.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 3: SAVE PHONE TO FIRESTORE ---
  const savePhoneAndFinish = async () => {
    if (phone.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid mobile number.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser!;
      
      await setDoc(doc(firestore, "mobile_users", user.uid), {
        email: user.email,
        phoneNumber: phone,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", "Could not save phone number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>FloodSense</Text>

      <Text style={styles.subtitle}>
        {step === "auth" && mode === "login" && "Welcome back! Please login."}
        {step === "auth" && mode === "register" && "Create an account to get started."}
        {step === "verify" && "Verify your email address"}
        {step === "phone" && "Add a contact number for alerts"}
      </Text>

      {/* RENDER LOGIN / REGISTER STEP */}
      {step === "auth" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          {/* NEW: Password Input with Eye Icon */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#999" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === "login" ? "Login" : "Create Account"}</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleContainer} 
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.toggleText}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.toggleLink}>
                {mode === "login" ? "Sign Up" : "Log In"}
              </Text>
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* RENDER VERIFICATION STEP */}
      {step === "verify" && (
        <View style={styles.verifyContainer}>
          <Feather name="mail" size={48} color="#2EC4B6" style={{ marginBottom: 16 }} />
          <Text style={styles.verifyText}>
            We sent a verification link to {"\n"}
            <Text style={{ fontWeight: "700" }}>{email}</Text>
          </Text>
          <Text style={styles.verifySubtext}>
            Click the link in the email, then return here to continue.
          </Text>
          
          <TouchableOpacity style={styles.btn} onPress={checkVerification} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>I've Verified My Email</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setStep("auth")} style={{ marginTop: 20 }}>
            <Text style={styles.back}>← Back to login</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RENDER PHONE STEP */}
      {step === "phone" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="+63 --- --- ---"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TouchableOpacity style={styles.btn} onPress={savePhoneAndFinish} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Complete Setup</Text>}
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#FFFFFF" },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80 },
  title: { fontSize: 32, fontWeight: "700", color: "#0D3B5E", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 32 },
  
  // Standard input
  input: { backgroundColor: "#F5F5F5", color: "#0D3B5E", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  
  // NEW: Password specific styles
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#F5F5F5", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 10, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 14, fontSize: 16, color: "#0D3B5E" },
  eyeIcon: { padding: 14 },

  btn: { backgroundColor: "#2EC4B6", borderRadius: 10, padding: 15, alignItems: "center", justifyContent: 'center' },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  back: { color: "#666", textAlign: "center", marginTop: 16 },
  verifyContainer: { alignItems: 'center', paddingVertical: 10 },
  verifyText: { fontSize: 16, color: "#333", textAlign: 'center', marginBottom: 12, lineHeight: 24 },
  verifySubtext: { fontSize: 14, color: "#666", textAlign: 'center', marginBottom: 24 },
  toggleContainer: { marginTop: 24, alignItems: "center" },
  toggleText: { fontSize: 14, color: "#666" },
  toggleLink: { color: "#2EC4B6", fontWeight: "700" },
});