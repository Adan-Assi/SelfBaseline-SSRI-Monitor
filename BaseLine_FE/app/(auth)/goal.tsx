import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";
import ChoiceButton from "../../src/ui/components/ChoiceButton";
import OnboardingStepLayout from "../../src/ui/components/onboarding/OnboardingStepLayout";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

import {
  useOnboardingStore,
  type GoalOption,
} from "../../src/features/onboarding/onboarding.store";

// --- Constants --------------------
const OPTIONS: GoalOption[] = [
  "Tune into my emotions",
  "Stress less",
  "Strengthen my emotions",
  "Sleep soundly",
  "Be more at ease socially",
  "Something else",
];

export default function Goal() {
  // --- Global store state --------------------
  const name = useOnboardingStore((s) => s.name);
  const goal = useOnboardingStore((s) => s.goal);
  const setGoal = useOnboardingStore((s) => s.setGoal);

  // --- Derived values --------------------
  const displayName = name?.trim() ? name.trim() : "";

  // --- Render --------------------
  return (
    <OnboardingStepLayout current={4} total={6}>
      <View style={{ height: 50 }} />

      <Text style={styles.question}>
        What’s been on your{"\n"}mind lately
        {displayName ? `, ${displayName}` : ""}?
      </Text>

      <Text style={styles.sub}>(my goal is ...)</Text>

      <View style={{ height: 18 }} />

      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt}
            label={opt}
            selected={goal === opt}
            onPress={() => setGoal(opt)}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <BottomCTA
        label="next"
        variant="lime"
        disabled={!goal}
        onPress={() => router.push("/(checkin)/checkin-time")}
      />

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

  list: {
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
  },
});
