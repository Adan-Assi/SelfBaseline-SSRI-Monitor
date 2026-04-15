import { router, useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WS_BASE_URL } from "../../src/config/runtime";
import {
  hasUsableBackendUserId,
  useRuntimePolicy,
} from "../../src/config/runtimePolicy";
import { useAuthStore } from "../../src/features/auth/auth.store";
import useVoiceAgent from "../../src/hooks/voice/useVoiceAgent";
import { clamp01 } from "../../src/hooks/voice/voice.encoding";

import VoiceEnergyGL from "../../src/ui/components/voice/VoiceEnergyGL";
import { Colors } from "../../src/ui/theme/colors";

// --- Helpers --------------------
export default function VoiceCheckinScreen() {
  // --- Store / policy --------------------
  const userId = useAuthStore((s) => s.userId);
  const policy = useRuntimePolicy();

  // --- Derived state --------------------
  const canUseVoice = policy.useBackend && hasUsableBackendUserId(userId);

  const wsUrl = useMemo(() => {
    if (!canUseVoice || !hasUsableBackendUserId(userId)) return null;
    return `${WS_BASE_URL}/ws/voice/${userId}?is_audio=true`;
  }, [canUseVoice, userId]);

  // --- Voice agent --------------------
  const {
    isConnected,
    isRecording,
    agentSpeaking,
    micLevel,
    status,
    connect,
    disconnect,
  } = useVoiceAgent(wsUrl);

  // --- Guards --------------------
  useEffect(() => {
    if (policy.mode === "real" && !hasUsableBackendUserId(userId)) {
      router.replace("/(auth)/welcome");
    }
  }, [policy.mode, userId]);

  // --- Focus lifecycle --------------------
  useFocusEffect(
    useCallback(() => {
      if (canUseVoice) {
        void connect();
      }

      return () => {
        void disconnect();
      };
    }, [canUseVoice, connect, disconnect]),
  );

  // --- Actions --------------------
  function onEnd() {
    void disconnect();
    router.push("/(main)/home");
  }

  // --- Energy state --------------------
  const targetLevel = useMemo(() => {
    if (!canUseVoice) return 0.08;
    if (!isConnected) return 0.1;
    if (agentSpeaking) return 0.95;
    if (isRecording) return Math.max(0.12, micLevel);
    return 0.25;
  }, [canUseVoice, isConnected, agentSpeaking, isRecording, micLevel]);

  const [level01, setLevel01] = useState<number>(0.15);

  const levelRef = useRef(level01);
  levelRef.current = level01;

  // --- Animation loop --------------------
  useEffect(() => {
    let raf: number | null = null;

    const tick = () => {
      const speed = agentSpeaking
        ? 0.14
        : isRecording
          ? 0.18
          : isConnected
            ? 0.06
            : 0.04;

      const cur = levelRef.current;
      const next = cur + (targetLevel - cur) * speed;

      const jitter =
        !agentSpeaking && isConnected && !isRecording
          ? Math.sin(Date.now() / 180) * 0.008
          : 0;

      const out = clamp01(next + jitter);

      if (Math.abs(out - cur) > 0.0005) {
        setLevel01(out);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [targetLevel, agentSpeaking, isRecording, isConnected]);

  // --- Early return --------------------
  if (policy.mode === "real" && !hasUsableBackendUserId(userId)) {
    return null;
  }

  // --- Render --------------------
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar} />

      <View style={styles.center}>
        <View style={styles.glFrame}>
          <View style={styles.glSurface} collapsable={false}>
            <VoiceEnergyGL
              level01={level01}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        </View>

        <View style={styles.statusWrap}>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                !canUseVoice && styles.statusDotMuted,
                !isConnected && canUseVoice && styles.statusDotMuted,
                agentSpeaking && styles.statusDotActive,
              ]}
            />
            <Text style={styles.statusText}>
              {!canUseVoice
                ? policy.mode === "mock"
                  ? "Voice unavailable in mock mode"
                  : "Voice unavailable"
                : status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={onEnd} style={styles.finishWrap} hitSlop={16}>
          <Text style={styles.finishLabel}>Finish</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  topBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 80,
  },

  glFrame: {
    width: "100%",
    alignSelf: "stretch",
    aspectRatio: 1,
    overflow: Platform.select({
      ios: "hidden",
      android: "visible",
      default: "hidden",
    }),
  },

  glSurface: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },

  bottom: {
    paddingHorizontal: 18,
    paddingBottom: Platform.select({ ios: 22, android: 22, default: 22 }),
    paddingTop: 12,
    alignItems: "center",
  },

  statusWrap: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: Colors.lime,
  },

  statusDotActive: {
    backgroundColor: Colors.blue,
  },

  statusDotMuted: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  statusText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  finishWrap: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  finishLabel: {
    color: Colors.lime,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
