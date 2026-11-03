import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Image, ScrollView
} from "react-native";
import { router, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";

import { supabase, isSupabaseConfigured } from "../../constants/supabase";
import { getEmailRedirectUrl } from "../../constants/authLinks";
import { getResident, isProfileComplete, normalizePhone, saveResident } from "../../constants/residents";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const [step, setStep] = useState<"auth" | "verify" | "profile">("auth");
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  // Decide where a signed-in user goes next: home if their resident record is complete, otherwise the profile step.
  const routeSignedInUser = async (user: User) => {
    let resident = null;
    try {
      resident = await getResident(user.id);
    } catch (error: any) {
      // Signed in fine, but the residents table could not be read (missing table, policy, or network).
      Alert.alert("Could Not Load Your Profile", error?.message ?? "Please try again.");
      return;
    }
    if (isProfileComplete(resident)) {
      router.replace("/(tabs)");
    } else {
      setFullName(resident?.full_name ?? "");
      setPhone(resident?.phone_number ?? "");
      setAddress(resident?.address ?? "");
      setStep("profile");
    }
  };

  // A resident who is already signed in but never finished their profile lands here from the app start.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) routeSignedInUser(data.session.user);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAuthError = (error: { code?: string; message: string }) => {
    switch (error.code) {
      case "invalid_credentials":
        Alert.alert("Login Failed", "Incorrect email or password.");
        break;
      case "user_already_exists":
      case "email_exists":
        Alert.alert("Account Exists", "This email is already registered. Please log in.");
        break;
      case "weak_password":
        Alert.alert("Weak Password", `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
        break;
      case "over_email_send_rate_limit":
      case "over_request_rate_limit":
        Alert.alert("Too Many Attempts", "Please wait a minute and try again.");
        break;
      default:
        Alert.alert("Authentication Error", error.message);
    }
  };

  // --- STEP 1: LOGIN OR SIGN UP ---
  const handleAuth = async () => {
    if (loading) return;
    if (!isSupabaseConfigured) {
      Alert.alert("Not Configured", "The Supabase key is missing. Add it to .env and restart Expo.");
      return;
    }
    if (!cleanEmail || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (mode === "register" && password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Weak Password", `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          if (error.code === "email_not_confirmed") {
            await supabase.auth.resend({ type: "signup", email: cleanEmail, options: { emailRedirectTo: getEmailRedirectUrl() } });
            setStep("verify");
            return;
          }
          throw error;
        }
        await routeSignedInUser(data.user);
      } else {
        // Supabase emails the confirmation link automatically on sign-up.
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          // The confirmation link opens this app, not the website (Site URL).
          options: { emailRedirectTo: getEmailRedirectUrl() },
        });
        if (error) throw error;
        // A repeated sign-up for an existing email returns a user with no identities instead of an error.
        if (data.user && data.user.identities?.length === 0) {
          Alert.alert("Account Exists", "This email is already registered. Please log in.");
          return;
        }
        if (data.session) {
          // Email confirmation is switched off in the project: already signed in.
          await routeSignedInUser(data.session.user);
        } else {
          setStep("verify");
        }
      }
    } catch (error: any) {
      showAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: EMAIL VERIFICATION ---
  // Supabase only issues a session once the email is confirmed, so a successful sign-in proves it.
  const checkVerification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error?.code === "email_not_confirmed") {
        Alert.alert("Not Verified", "Please check your inbox and click the verification link first.");
      } else if (error) {
        throw error;
      } else {
        await routeSignedInUser(data.user);
      }
    } catch (error: any) {
      showAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail, options: { emailRedirectTo: getEmailRedirectUrl() } });
    if (error) showAuthError(error);
    else Alert.alert("Email Sent", "We sent a new verification link.");
  };

  const backToLogin = async () => {
    await supabase.auth.signOut();
    setPassword("");
    setFullName("");
    setPhone("");
    setAddress("");
    setStep("auth");
  };

  // --- STEP 3: SAVE RESIDENT DETAILS ---
  const saveProfileAndFinish = async () => {
    const name = fullName.trim();
    const place = address.trim();
    const normalizedPhone = normalizePhone(phone);

    if (name.length < 2) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!normalizedPhone) {
      Alert.alert("Invalid Number", "Enter a Philippine mobile number, e.g. 0917 123 4567.");
      return;
    }
    if (place.length < 5) {
      Alert.alert("Missing Address", "Please enter your street or house address.");
      return;
    }
    if (!agreed) {
      Alert.alert("Privacy Notice", "Please read and agree to the Privacy Notice to continue.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw userError ?? new Error("Your session expired. Please log in again.");

      await saveResident(data.user.id, data.user.email, {
        full_name: name,
        phone_number: normalizedPhone,
        address: place,
      });

      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Could Not Save", error?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>FloodSense</Text>

        <Text style={styles.subtitle}>
          {step === "auth" && mode === "login" && "Welcome back! Please login."}
          {step === "auth" && mode === "register" && "Create an account to get started."}
          {step === "verify" && "Verify your email address"}
          {step === "profile" && "Tell us about yourself so we can reach you during floods"}
        </Text>

        {step === "auth" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleAuth}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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

        {step === "verify" && (
          <View style={styles.verifyContainer}>
            <Feather name="mail" size={48} color="#2EC4B6" style={{ marginBottom: 16 }} />
            <Text style={styles.verifyText}>
              We sent a verification link to {"\n"}
              <Text style={{ fontWeight: "700" }}>{cleanEmail}</Text>
            </Text>
            <Text style={styles.verifySubtext}>
              Click the link in the email, then return here to continue.
            </Text>

            <TouchableOpacity style={styles.btn} onPress={checkVerification} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>I've Verified My Email</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={resendVerification} style={{ marginTop: 20 }}>
              <Text style={styles.toggleLink}>Resend verification email</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={backToLogin} style={{ marginTop: 12 }}>
              <Text style={styles.back}>← Back to login</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "profile" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              autoComplete="name"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number (0917 123 4567)"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="Home Address (street, house no.)"
              placeholderTextColor="#999"
              autoCapitalize="words"
              autoComplete="street-address"
              value={address}
              onChangeText={setAddress}
            />
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setAgreed(!agreed)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <Feather name={agreed ? "check-square" : "square"} size={22} color={agreed ? "#2EC4B6" : "#999"} />
              <Text style={styles.consentText}>
                I have read and agree to the{" "}
                <Text style={styles.toggleLink} onPress={() => router.push("/privacy" as Href)}>
                  Privacy Notice
                </Text>
                .
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={saveProfileAndFinish} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Complete Setup</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToLogin} disabled={loading}>
              <Text style={styles.back}>Use a different account</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80 },
  title: { fontSize: 32, fontWeight: "700", color: "#0D3B5E", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 32 },

  input: { backgroundColor: "#F5F5F5", color: "#0D3B5E", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },

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
  consentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  consentText: { flex: 1, fontSize: 14, color: "#555", lineHeight: 20 },
});
