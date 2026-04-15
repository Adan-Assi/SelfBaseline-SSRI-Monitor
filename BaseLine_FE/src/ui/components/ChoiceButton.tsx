import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export default function ChoiceButton({
  label,
  selected = false,
  onPress,
}: Props) {
  // --- Animation values --------------------
  const scale = useRef(new Animated.Value(1)).current;
  const overlay = useRef(new Animated.Value(selected ? 1 : 0)).current;

  // --- Selection animation --------------------
  useEffect(() => {
    Animated.timing(overlay, {
      toValue: selected ? 1 : 0,
      duration: selected ? 180 : 140,
      useNativeDriver: true,
    }).start();

    if (selected) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [selected, overlay, scale]);

  // --- Render --------------------
  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      {({ pressed }) => {
        const pressedStyle: ViewStyle = pressed ? { opacity: 0.92 } : {};

        return (
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: selected ? Colors.purple : Colors.pillBg,
                transform: [{ scale }],
              },
              pressedStyle,
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.selectedOverlay,
                {
                  opacity: overlay,
                },
              ]}
            />

            <Text
              style={[
                Typography.answer,
                { color: selected ? Colors.offWhite : Colors.pillText },
              ]}
            >
              {label}
            </Text>
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },

  pill: {
    width: "100%",
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },

  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
