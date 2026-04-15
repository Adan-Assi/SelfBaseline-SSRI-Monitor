import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";

const ENABLE_HAPTICS = true;
const THUMB_WRAP = 42;
const THUMB_HALF = THUMB_WRAP / 2;

type Props = {
  value: number;
  onChange: (v: number) => void;

  min?: number;
  max?: number;
  step?: number;

  leftLabel?: string;
  rightLabel?: string;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export default function EnergySlider({
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
  leftLabel = "lower",
  rightLabel = "higher",
}: Props) {
  // --- Derived values --------------------
  const range = max - min;

  // --- State --------------------
  const [trackW, setTrackW] = useState(0);
  const [internal, setInternal] = useState(value);

  // --- Refs --------------------
  const dragging = useRef(false);
  const lastTick = useRef<number>(value);

  const knobX = useRef(new Animated.Value(0)).current;
  const fillW = useRef(new Animated.Value(0)).current;

  // --- Value / position helpers --------------------
  const valueToRatio = (v: number) => (range <= 0 ? 0 : (v - min) / range);

  const ratioToValue = (ratio: number) => {
    const raw = min + clamp(ratio, 0, 1) * range;
    const snapped = Math.round((raw - min) / step) * step + min;
    return clamp(Math.round(snapped), min, max);
  };

  const xToValue = (x: number) => {
    if (trackW <= 0) return min;
    const ratio = clamp(x / trackW, 0, 1);
    return ratioToValue(ratio);
  };

  const valueToX = (v: number) => {
    if (trackW <= 0) return 0;
    return valueToRatio(v) * trackW;
  };

  const thumbLeftFromX = (centerX: number) => {
    return clamp(centerX - THUMB_HALF, -THUMB_HALF, trackW - THUMB_HALF);
  };

  // --- Animation helpers --------------------
  const animateToValue = (v: number) => {
    const x = valueToX(v);
    const left = thumbLeftFromX(x);

    Animated.spring(knobX, {
      toValue: left,
      stiffness: 260,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    Animated.timing(fillW, {
      toValue: x,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  // --- Sync external value --------------------
  useEffect(() => {
    if (!dragging.current) {
      setInternal(value);

      if (trackW > 0) {
        animateToValue(value);
      }

      lastTick.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, trackW]);

  // --- Layout --------------------
  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setTrackW(w);

    requestAnimationFrame(() => animateToValue(internal));
  };

  // --- Haptics --------------------
  const tickIfNeeded = (v: number) => {
    if (!ENABLE_HAPTICS) return;

    if (v !== lastTick.current) {
      lastTick.current = v;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // --- Interaction --------------------
  const setByX = (x: number, mode: "tap" | "drag" | "release") => {
    if (trackW <= 0) return;

    const rawX = clamp(x, 0, trackW);
    const rawLeft = thumbLeftFromX(rawX);
    const v = xToValue(rawX);

    if (v !== internal) {
      setInternal(v);
      onChange(v);
      tickIfNeeded(v);
    }

    if (mode === "drag") {
      knobX.setValue(rawLeft);
      fillW.setValue(rawX);
      return;
    }

    const snappedX = valueToX(v);
    const snappedLeft = thumbLeftFromX(snappedX);

    Animated.spring(knobX, {
      toValue: snappedLeft,
      stiffness: 260,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    Animated.timing(fillW, {
      toValue: snappedX,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  // --- Render --------------------
  return (
    <View style={styles.container}>
      <View
        style={styles.area}
        onLayout={onTrackLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderGrant={(e) => {
          dragging.current = true;
          setByX(e.nativeEvent.locationX, "tap");
        }}
        onResponderMove={(e) => {
          setByX(e.nativeEvent.locationX, "drag");
        }}
        onResponderRelease={() => {
          dragging.current = false;
          setByX(valueToX(internal), "release");
        }}
        onResponderTerminate={() => {
          dragging.current = false;
          setByX(valueToX(internal), "release");
        }}
      >
        <View style={styles.trackShadow}>
          <View style={styles.track}>
            <View style={styles.trackBg} />
            <Animated.View style={[styles.fill, { width: fillW }]} />
          </View>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.thumbWrap, { transform: [{ translateX: knobX }] }]}
        >
          <BlurView intensity={20} tint="light" style={styles.thumbGlass}>
            <View style={styles.frostVeil} />
          </BlurView>
        </Animated.View>
      </View>

      <View style={styles.labels}>
        <Text style={styles.label}>{leftLabel}</Text>
        <Text style={styles.label}>{rightLabel}</Text>
      </View>
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },

  area: {
    width: "90%",
    height: 44,
    justifyContent: "center",
  },

  track: {
    width: "100%",
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: Colors.blue,
    justifyContent: "center",
  },

  trackShadow: {
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  trackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blue,
    opacity: 0.95,
  },

  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.lime,
  },

  thumbWrap: {
    position: "absolute",
    top: 1,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  thumbGlass: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(240,240,245,0.45)",
    shadowColor: Colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  frostVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255)",
  },

  labels: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },

  label: {
    ...Typography.answer,
    color: Colors.textOnLight,
  },
});
