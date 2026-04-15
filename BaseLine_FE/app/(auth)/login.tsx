import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useRuntimePolicy } from "../../src/config/runtimePolicy";
import { loginUser } from "../../src/features/auth/auth.service";
import { useAuthStore } from "../../src/features/auth/auth.store";
import BottomCTA from "../../src/ui/components/BottomCTA";
import OnboardingStepLayout from "../../src/ui/components/onboarding/OnboardingStepLayout";
import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";
import { log } from "../../src/utils/logger";

// --- Helpers --------------------
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginScreen() {
  // --- Store and policy --------------------
  const login = useAuthStore((s) => s.login);
  const policy = useRuntimePolicy();

  // --- Local state --------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- Derived state --------------------
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailValid = isValidEmail(normalizedEmail);

  const loginAllowed = policy.mode === "real" || policy.mode === "partial";
  const canSubmit =
    loginAllowed && emailValid && password.length > 0 && !submitting;

  // --- Actions --------------------
  const onSubmit = async () => {
    setTouchedEmail(true);

    if (!loginAllowed || !canSubmit) {
      if (!loginAllowed) {
        log("[Auth] login unavailable", {
          mode: policy.mode,
        });

        Alert.alert(
          "Unavailable",
          "Sign in is not available in the current app mode.",
        );
      }

      return;
    }

    try {
      setSubmitting(true);

      const result = await loginUser(
        { email: normalizedEmail, password },
        policy,
      );

      if (result.kind === "success") {
        log("[Auth] login success", {
          userId: result.userId,
        });

        await login({
          userId: result.userId,
          username: result.username,
          displayName: result.displayName,
          role: result.role,
        });

        router.replace("/(main)/home");
        return;
      }

      log("[Auth] login unavailable", {
        mode: policy.mode,
      });

      Alert.alert(
        "Unavailable",
        "Sign in is not available in the current app mode.",
      );
    } catch (e) {
      log("[Auth] login failed", e);
      Alert.alert("Login failed", "We couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render --------------------
  return (
    <OnboardingStepLayout
      current={1}
      total={1}
      showProgress={false}
      onBack={() => router.replace("/(auth)/welcome")}
      onClose={() => router.replace("/(auth)/welcome")}
    >
      <View style={{ height: 60 }} />

      <Text style={styles.question}>Welcome back</Text>
      <Text style={styles.sub}>Sign in with your email and password</Text>

      <View style={{ height: 40 }} />

      <TextInput
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouchedEmail(true)}
        placeholder="name@example.com"
        placeholderTextColor={Colors.dimText}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
      />

      {touchedEmail && email.length > 0 && !emailValid ? (
        <Text style={styles.error}>Please enter a valid email address.</Text>
      ) : null}

      <View style={{ height: 28 }} />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        placeholderTextColor={Colors.dimText}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <View style={{ flex: 1 }} />

      <BottomCTA
        label={submitting ? "signing in..." : "sign in"}
        variant="lime"
        disabled={!canSubmit}
        onPress={onSubmit}
      />

      <View style={{ height: 18 }} />

      <Pressable onPress={() => router.replace("/(auth)/signup-intro")}>
        <Text style={styles.backLink}>Create account</Text>
      </Pressable>

      <View style={{ height: 34 }} />
    </OnboardingStepLayout>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  question: {
    ...Typography.question,
    color: Colors.white,
  },

  sub: {
    marginTop: 10,
    ...Typography.answer,
    color: Colors.dimText,
  },

  input: {
    ...Typography.answer,
    alignSelf: "center",
    width: 260,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
    color: Colors.white,
  },

  error: {
    marginTop: 12,
    alignSelf: "center",
    color: "#FFB4B4",
    fontSize: 14,
  },

  backLink: {
    alignSelf: "center",
    color: Colors.dimText,
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
