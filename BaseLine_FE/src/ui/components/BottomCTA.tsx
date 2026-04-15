import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";

type BottomCTAProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "lime" | "blue" | "grey";
};

export default function BottomCTA({
  label,
  onPress,
  disabled = false,
  variant = "lime",
}: BottomCTAProps) {
  const backgroundColor =
    variant === "blue"
      ? Colors.blue
      : variant === "grey"
        ? Colors.ctaGrey
        : Colors.lime;

  const color = variant === "blue" ? Colors.white : Colors.blue;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: "center",
    height: 47,
    paddingHorizontal: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    ...Typography.button,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  disabled: {
    opacity: 0.45,
  },
});
