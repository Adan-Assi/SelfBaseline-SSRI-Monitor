import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";

import { useRuntimePolicy } from "../../src/config/runtimePolicy";
import { completeOnboarding } from "../../src/features/auth/auth.service";
import { useAuthStore } from "../../src/features/auth/auth.store";
import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";

import { log } from "../../src/utils/logger";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

export default function AllSet() {
  // --- Policy --------------------
  const policy = useRuntimePolicy();

  // --- Onboarding state --------------------
  const name = useOnboardingStore((s) => s.name);
  const email = useOnboardingStore((s) => s.email);
  const password = useOnboardingStore((s) => s.password);
  const birthDate = useOnboardingStore((s) => s.birthDate);
  const checkinTime = useOnboardingStore((s) => s.checkinTime);

  // --- Auth --------------------
  const login = useAuthStore((s) => s.login);

  // --- Local state --------------------
  const [loading, setLoading] = useState(false);

  // --- Actions --------------------
  const finishOnboarding = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const result = await completeOnboarding(
        {
          name,
          email,
          password,
          birthDate,
          checkinTime,
        },
        policy,
      );

      if (result.kind === "success") {
        log("[Onboarding] SUCCESS", {
          userId: result.userId,
          username: result.username,
          checkinTime: checkinTime ?? "none",
        });

        await login({
          userId: result.userId,
          username: result.username,
          displayName: result.displayName,
          role: result.role,
        });
      } else {
        log("[Onboarding] FALLBACK LOGIN (partial mode)", {
          email,
          name,
        });

        await login({
          userId: -1,
          username: email.trim().toLowerCase(),
          displayName: name || "Guest",
          role: "PATIENT",
        });
      }

      router.replace("/(main)/home");
    } catch (e) {
      log("[Auth] onboarding failed", e);

      Alert.alert(
        "Something went wrong",
        "We couldn't finish creating your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Render --------------------
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }} />

      <Text style={styles.title}>You’re all set!</Text>

      <View style={{ flex: 1 }} />

      <BottomCTA
        label={loading ? "creating..." : "let’s go"}
        variant="grey"
        onPress={finishOnboarding}
      />

      <View style={{ height: 40 }} />
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lime,
    paddingHorizontal: 22,
  },

  title: {
    ...Typography.hero,
    color: Colors.blue,
  },
});
