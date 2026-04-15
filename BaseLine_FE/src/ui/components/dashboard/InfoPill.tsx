import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme/colors";
import { Typography } from "../../theme/typography";

type Props = {
  label: string;
  value: string;
  cta?: string;
  onPress?: () => void;
};

// --- Component --------------------
export default function InfoPill({ label, value, cta, onPress }: Props) {
  const showCta = !!cta && !!onPress;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={[Typography.textM, styles.label]}>{label}</Text>
        <Text style={[Typography.topBar, styles.value]}>{value}</Text>
      </View>

      {showCta && (
        <Pressable
          onPress={onPress}
          hitSlop={12}
          style={({ pressed }) => [
            styles.ctaPressable,
            pressed && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={cta}
        >
          <Text style={[Typography.topBar, styles.cta]}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 360,
    height: 80,
    alignSelf: "center",
    backgroundColor: Colors.purple,
    borderRadius: 50,
    paddingLeft: 24,
    paddingRight: 28,
    flexDirection: "row",
    alignItems: "center",
  },

  left: {
    flex: 1,
    justifyContent: "center",
  },

  ctaPressable: {
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 100,
  },

  label: {
    color: Colors.offWhite,
    opacity: 0.9,
  },

  value: {
    color: Colors.offWhite,
    opacity: 0.85,
    marginTop: 3,
    fontWeight: "700",
  },

  cta: {
    color: Colors.lime,
    fontWeight: "700",
    fontSize: 15,
  },

  ctaPressed: {
    opacity: 0.65,
  },
});
