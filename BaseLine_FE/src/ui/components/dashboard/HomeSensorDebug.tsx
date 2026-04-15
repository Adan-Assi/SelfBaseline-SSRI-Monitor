import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../theme/colors";

type Props = {
  showDebug: boolean;
  dataMode: string;
  debugOpen: boolean;
  debugLoading: boolean;
  debugError: string | null;
  gpsLine: string;
  chargeLine: string;
  sessionsLine: string;
  wifiLine: string;
  wifiLocLine: string;
  onRun: () => void;
  onHide: () => void;
};

export default function HomeSensorDebug({
  showDebug,
  dataMode,
  debugOpen,
  debugLoading,
  debugError,
  gpsLine,
  chargeLine,
  sessionsLine,
  wifiLine,
  wifiLocLine,
  onRun,
  onHide,
}: Props) {
  // --- Guard --------------------
  if (!showDebug) return null;

  // --- Render --------------------
  return (
    <>
      <View style={styles.sectionMd}>
        <Pressable
          style={styles.debugButton}
          onPress={onRun}
          disabled={debugLoading}
        >
          <Text style={styles.debugButtonText}>
            {debugLoading ? "running sensor debug..." : "run sensor debug"}
          </Text>
        </Pressable>
      </View>

      {debugOpen && (
        <View style={styles.debugCard}>
          <View style={styles.debugHeaderRow}>
            <Text style={styles.debugTitle}>Sensors dashboard</Text>

            <View style={styles.modePill}>
              <Text style={styles.modePillText}>{dataMode}</Text>
            </View>
          </View>

          {debugError ? (
            <Text style={styles.debugErrorText}>{debugError}</Text>
          ) : null}

          <View style={styles.debugRow}>
            <Text style={styles.debugKey}>GPS</Text>
            <Text style={styles.debugVal}>{gpsLine}</Text>
          </View>

          <View style={styles.debugRow}>
            <Text style={styles.debugKey}>Phone charge</Text>
            <Text style={styles.debugVal}>{chargeLine}</Text>
          </View>

          <View style={styles.debugRow}>
            <Text style={styles.debugKey}>App sessions</Text>
            <Text style={styles.debugVal}>{sessionsLine}</Text>
          </View>

          <View style={styles.debugRow}>
            <Text style={styles.debugKey}>Wi-Fi scan</Text>
            <Text style={styles.debugVal}>{wifiLine}</Text>
          </View>

          <View style={styles.debugRow}>
            <Text style={styles.debugKey}>Wi-Fi location</Text>
            <Text style={styles.debugVal}>{wifiLocLine}</Text>
          </View>

          <View style={styles.debugActionsRow}>
            <Pressable style={styles.smallAction} onPress={onHide}>
              <Text style={styles.smallActionText}>hide</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionMd: {
    marginTop: 10,
  },

  debugButton: {
    backgroundColor: "rgba(23, 33, 231, 0.06)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },

  debugButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.blue,
  },

  debugCard: {
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 18,
    padding: 14,
  },

  debugHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  debugTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.textSemiBlack,
  },

  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(23, 33, 231, 0.08)",
  },

  modePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.blue,
  },

  debugRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },

  debugKey: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSemiBlack,
    opacity: 0.75,
    marginBottom: 2,
  },

  debugVal: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSemiBlack,
  },

  debugErrorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B00020",
    marginBottom: 8,
  },

  debugActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  smallAction: {
    flex: 1,
    backgroundColor: "rgba(23, 33, 231, 0.06)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },

  smallActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.blue,
  },
});
