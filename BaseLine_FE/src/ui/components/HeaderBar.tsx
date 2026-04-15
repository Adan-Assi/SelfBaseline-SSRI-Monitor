import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/colors";

type HeaderBarProps = {
  onBack?: () => void;
  onClose?: () => void;
  hideBack?: boolean;
  hideClose?: boolean;
};

export default function HeaderBar({
  onBack,
  onClose,
  hideBack = false,
  hideClose = false,
}: HeaderBarProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        disabled={hideBack || !onBack}
        style={[styles.iconBtn, hideBack && styles.hidden]}
      >
        <Text style={styles.icon}>‹</Text>
      </Pressable>

      <Pressable
        onPress={onClose}
        hitSlop={12}
        disabled={hideClose || !onClose}
        style={[styles.iconBtn, hideClose && styles.hidden]}
      >
        <Text style={styles.icon}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 60,
    paddingTop: 2,
    paddingBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  hidden: {
    opacity: 0,
  },

  icon: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.white,
  },
});
