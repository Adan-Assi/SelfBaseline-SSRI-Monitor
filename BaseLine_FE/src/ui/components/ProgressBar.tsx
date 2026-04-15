import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";

type Props = {
  total: number;
  current: number;
};

export default function ProgressBar({ total, current }: Props) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(safeTotal, Math.max(1, current));
  const pct = safeCurrent / safeTotal;

  return (
    <View style={styles.wrap}>
      <Text style={styles.fraction}>
        {safeCurrent}/{safeTotal}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: -100,
  },
  fraction: {
    ...Typography.topBar,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 10,
  },
  track: {
    width: 220,
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.lime,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: Colors.blue,
    borderRadius: 999,
  },
});
