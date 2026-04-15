import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";
import OnboardingStepLayout from "../../src/ui/components/onboarding/OnboardingStepLayout";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";

export default function Name() {
  // --- Global store state --------------------
  const name = useOnboardingStore((s) => s.name);
  const setName = useOnboardingStore((s) => s.setName);

  // --- Derived values --------------------
  const isDisabled = name.trim().length === 0;

  // --- Render --------------------
  return (
    <OnboardingStepLayout current={1} total={6}>
      <View style={{ height: 60 }} />

      <Text style={styles.question}>
        How would you like{"\n"}BaseLine to call you?
      </Text>

      <View style={{ height: 60 }} />

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={Colors.dimText}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />

      <View style={{ flex: 1 }} />

      <BottomCTA
        label="next"
        variant="lime"
        disabled={isDisabled}
        onPress={() => router.replace("/(auth)/email")}
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
  input: {
    ...Typography.answer,
    alignSelf: "center",
    width: 220,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
    color: Colors.white,
  },
});
