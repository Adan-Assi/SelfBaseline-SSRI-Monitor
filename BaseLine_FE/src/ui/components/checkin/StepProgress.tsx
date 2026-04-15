import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme/colors";

type Props = {
  total: number; // total questions
  current: number; // 1-based current step
  windowSize?: number; // default 4
};

// --- Constants --------------------
const CIRCLE = 34;
const LINE_W = 30;
const LINE_H = 3;

export default function StepProgress({
  total,
  current,
  windowSize = 4,
}: Props) {
  // --- Window calculation --------------------
  const { items, hasLeft, hasRight } = useMemo(() => {
    const safeTotal = Math.max(1, total);
    const safeCurrent = Math.min(Math.max(1, current), safeTotal);
    const w = Math.min(windowSize, safeTotal);

    let start = safeCurrent - Math.floor((w - 1) / 2);
    start = Math.max(1, start);
    start = Math.min(start, safeTotal - w + 1);

    const end = start + w - 1;

    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);

    return {
      items: arr,
      hasLeft: start > 1,
      hasRight: end < safeTotal,
    };
  }, [total, current, windowSize]);

  // --- Render --------------------
  return (
    <View style={styles.row}>
      {hasLeft && <Text style={styles.ellipsis}>...</Text>}

      {items.map((step, idx) => {
        const done = step < current;
        const active = step === current;

        return (
          <React.Fragment key={step}>
            <View
              style={[
                styles.circle,
                active ? styles.circleActive : styles.circleInactive,
              ]}
            >
              {done ? (
                <Text style={styles.check}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.num,
                    active ? styles.numActive : styles.numInactive,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>

            {idx !== items.length - 1 && <View style={styles.line} />}
          </React.Fragment>
        );
      })}

      {hasRight && <Text style={styles.ellipsis}>...</Text>}
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lime,
  },

  circleActive: {
    opacity: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
  },

  circleInactive: {
    opacity: 0.55,
  },

  num: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.black,
  },

  numActive: {
    opacity: 1,
  },

  numInactive: {
    opacity: 0.9,
  },

  check: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.black,
    opacity: 0.9,
  },

  line: {
    width: LINE_W,
    height: LINE_H,
    borderRadius: LINE_H / 2,
    backgroundColor: Colors.lime,
    opacity: 0.55,
  },

  ellipsis: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
    opacity: 0.35,
    marginHorizontal: 8,
  },
});
