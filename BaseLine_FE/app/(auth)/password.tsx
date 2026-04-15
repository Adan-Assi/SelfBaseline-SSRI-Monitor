import { router } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";
import OnboardingStepLayout from "../../src/ui/components/onboarding/OnboardingStepLayout";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";

// --- Helpers --------------------
function passwordScore(pw: string) {
  const len = pw.length >= 8;
  const hasNumber = /\d/.test(pw);
  const hasLetter = /[A-Za-z]/.test(pw);
  return { ok: len && hasNumber && hasLetter, len, hasNumber, hasLetter };
}

export default function Password() {
  // --- Global store state --------------------
  const name = useOnboardingStore((s) => s.name);
  const password = useOnboardingStore((s) => s.password);
  const setPassword = useOnboardingStore((s) => s.setPassword);

  // --- Derived values --------------------
  const displayName = name?.trim() ? name.trim() : "";
  const rules = useMemo(() => passwordScore(password), [password]);

  // --- Render --------------------
  return (
    <OnboardingStepLayout current={2} total={6}>
      <View style={{ height: 60 }} />

      <Text style={styles.question}>Nice to meet you, {displayName}.</Text>
      <Text style={styles.sub}>Create a password</Text>

      <View style={{ height: 60 }} />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        placeholderTextColor={Colors.dimText}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        returnKeyType="done"
      />

      <View style={{ height: 14 }} />

      <Text style={styles.criteria}>
        {rules.len ? "✓" : "•"} at least 8 characters{"\n"}
        {rules.hasLetter ? "✓" : "•"} includes a letter{"\n"}
        {rules.hasNumber ? "✓" : "•"} includes a number
      </Text>

      <View style={{ flex: 1 }} />

      <BottomCTA
        label="next"
        variant="lime"
        disabled={!rules.ok}
        onPress={() => router.replace("/(auth)/birthday")}
      />

      <View style={{ height: 34 }} />
    </OnboardingStepLayout>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  question: { ...Typography.question, color: Colors.white },
  sub: { marginTop: 10, ...Typography.answer, color: Colors.dimText },

  input: {
    ...Typography.answer,
    alignSelf: "center",
    width: 240,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
    color: Colors.white,
    textAlign: "center",
  },

  criteria: {
    ...Typography.topBar,
    color: Colors.dimText,
    textAlign: "center",
    lineHeight: 18,
  },
});
