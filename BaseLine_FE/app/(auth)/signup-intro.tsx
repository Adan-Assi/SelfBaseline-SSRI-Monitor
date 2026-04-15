import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";
import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

export default function SignupIntro() {
  // --- Local state --------------------
  const [agreed, setAgreed] = useState(false);

  // --- Actions --------------------
  const onContinue = () => {
    if (!agreed) return;
    router.push("/(auth)/name");
  };

  // --- Render --------------------
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Hey!</Text>
        <Text style={styles.subtitle}>Let’s build your BaseLine</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAgreed((v) => !v)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.check}>✓</Text>}
          </View>

          <Text style={styles.terms}>
            I agree to BaseLine’s{" "}
            <Text style={styles.link}>Terms & Conditions</Text> and acknowledge
            the <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </Pressable>

        <BottomCTA
          label="start"
          variant="blue"
          onPress={onContinue}
          disabled={!agreed}
        />
      </View>
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lime,
    paddingHorizontal: 22,
    paddingTop: 96,
    paddingBottom: 40,
    justifyContent: "space-between",
  },

  hero: {
    alignItems: "center",
    marginTop: 46,
  },

  title: {
    marginTop: 180,
    ...Typography.hero,
    color: Colors.blue,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    ...Typography.question,
    color: Colors.blue,
    textAlign: "center",
  },

  bottom: {
    width: "100%",
  },

  checkboxRow: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "flex-start",
    marginHorizontal: 10,
  },

  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.2,
    borderColor: Colors.blue,
    borderRadius: 3,
    marginRight: 10,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  checkboxChecked: {
    backgroundColor: Colors.lime,
  },

  check: {
    color: Colors.blue,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
  },

  terms: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.blue,
    opacity: 0.9,
    marginBottom: 20,
  },

  link: {
    textDecorationLine: "underline",
  },
});
