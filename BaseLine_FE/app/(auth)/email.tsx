import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";
import BottomCTA from "../../src/ui/components/BottomCTA";
import OnboardingStepLayout from "../../src/ui/components/onboarding/OnboardingStepLayout";
import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

// --- Helpers --------------------
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function EmailScreen() {
  // --- Global store state --------------------
  const email = useOnboardingStore((s) => s.email);
  const setEmail = useOnboardingStore((s) => s.setEmail);

  // --- Local screen state --------------------
  const [touched, setTouched] = useState(false);

  // --- Derived values --------------------
  const normalizedEmail = useMemo(() => email.trim(), [email]);
  const isFilled = normalizedEmail.length > 0;
  const isValid = isValidEmail(normalizedEmail);

  // --- Handlers --------------------
  const onNext = () => {
    setTouched(true);
    if (!isValid) return;

    setEmail(normalizedEmail);
    router.replace("/(auth)/password");
  };

  // --- Render --------------------
  return (
    <OnboardingStepLayout current={2} total={6}>
      <View style={{ height: 60 }} />

      <Text style={styles.question}>What’s your email?</Text>
      <Text style={styles.sub}>You’ll use it to sign in later</Text>

      <View style={{ height: 60 }} />

      <TextInput
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        placeholder="name@example.com"
        placeholderTextColor={Colors.dimText}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={onNext}
      />

      {touched && isFilled && !isValid ? (
        <Text style={styles.error}>Please enter a valid email address.</Text>
      ) : null}

      <View style={{ flex: 1 }} />

      <BottomCTA
        label="next"
        variant="lime"
        disabled={!isFilled}
        onPress={onNext}
      />

      <View style={{ height: 34 }} />
    </OnboardingStepLayout>
  );
}

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
});
