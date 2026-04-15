import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import LogoutIcon from "../../assets/icons/logout.svg";
import StarIcon from "../../assets/icons/star.svg";

import {
  hasUsableBackendUserId,
  useRuntimePolicy,
} from "../../src/config/runtimePolicy";
import { useAuthStore } from "../../src/features/auth/auth.store";
import type { WeekIndex } from "../../src/features/home/home.types";
import { useHomeData } from "../../src/hooks/home/useHomeData";
import { useSensorDebug } from "../../src/hooks/home/useSensorDebug";

import HomeSensorDebug from "../../src/ui/components/dashboard/HomeSensorDebug";
import InfoPill from "../../src/ui/components/dashboard/InfoPill";
import PatternsCard from "../../src/ui/components/dashboard/PatternsCard";
import WeekStreak from "../../src/ui/components/dashboard/WeekStreak";
import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

import { confirmAndCall } from "../../src/utils/call";
import { formatHomeDate } from "../../src/utils/date";
import { log } from "../../src/utils/logger";

export default function Home() {
  // --- Data / policy --------------------
  const { name, nextCheckInLabel, isTodayCheckInDone, server, loading } =
    useHomeData();
  const policy = useRuntimePolicy();

  // --- Auth --------------------
  const userId = useAuthStore((s) => s.userId);
  const clearAuth = useAuthStore((s) => s.clear);

  // --- Layout --------------------
  const insets = useSafeAreaInsets();

  // --- Sensor debug --------------------
  const {
    debugOpen,
    debugLoading,
    debugError,
    runSensorDebug,
    hideDebug,
    gpsLine,
    chargeLine,
    sessionsLine,
    wifiLine,
    wifiLocLine,
  } = useSensorDebug();

  // --- Derived data --------------------
  const dateLabel = formatHomeDate(new Date());

  const fallbackContacts = [
    {
      id: "doctor",
      title: "Doctor",
      ctaLabel: "call",
      phone: "",
    },
    {
      id: "caregiver",
      title: "Caregiver",
      ctaLabel: "call",
      phone: "",
    },
  ];

  const contacts = server?.contacts?.length
    ? server.contacts
    : policy.mode !== "real"
      ? fallbackContacts
      : [];

  const streak = server?.streak ?? {
    totalDays: 0,
    encouragement: "",
    todayIndex: new Date().getDay() as WeekIndex,
    completedWeek: [false, false, false, false, false, false, false],
  };

  const patterns = server?.patterns ?? {
    text: "",
  };

  // --- Actions --------------------
  const onLogout = () => {
    log("[Auth] logout");
    clearAuth();
    router.replace("/(auth)/welcome");
  };

  const onInfoPillPress = () => {
    router.push("/(checkin)/checkin-question");
  };

  const onContactPress = (title: string, phone?: string) => {
    if (!phone) return;
    confirmAndCall(title, phone);
  };

  // --- Guards --------------------
  if (policy.mode === "real" && !hasUsableBackendUserId(userId)) {
    return null;
  }

  // --- Render --------------------
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.padX}>
          <View style={styles.headerRow}>
            <View style={styles.leftHeader}>
              <Pressable
                onPress={onLogout}
                style={styles.logoutRow}
                hitSlop={12}
              >
                <LogoutIcon
                  width={17}
                  height={17}
                  style={styles.logoutIconSvg}
                />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>

              <Text style={[Typography.text, styles.dateText]}>
                {dateLabel}
              </Text>
            </View>

            <View style={styles.rightHeader}>
              <View style={styles.badge}>
                <StarIcon width={13} height={13} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>Daily baseline</Text>
              </View>

              {policy.mode === "partial" && (
                <View style={styles.partialBadge}>
                  <Text style={styles.partialBadgeText}>Partial mode</Text>
                </View>
              )}

              {policy.mode === "mock" && (
                <View style={styles.mockBadge}>
                  <Text style={styles.mockBadgeText}>Mock mode</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={[Typography.homeTitle, styles.title]}>
            Welcome back{name ? `,\n${name}` : ""}
          </Text>

          <View style={styles.sectionHero}>
            <InfoPill
              label="next check in"
              value={loading ? "loading..." : nextCheckInLabel}
              cta={!isTodayCheckInDone ? "Start now" : undefined}
              onPress={!isTodayCheckInDone ? onInfoPillPress : undefined}
            />
          </View>

          <View style={styles.sectionTalk}>
            <Pressable
              onPress={() => router.push("/(checkin)/voice-checkin")}
              style={({ pressed }) => [
                styles.talkCard,
                pressed && styles.talkPressed,
              ]}
            >
              <Text style={styles.talkCardText}>Need to talk ?</Text>
              <Text style={styles.talkArrow}>→</Text>
            </Pressable>
          </View>

          <View style={styles.sectionStreak}>
            <WeekStreak
              totalDays={streak.totalDays}
              encouragement={streak.encouragement}
              todayIndex={streak.todayIndex}
              completedWeek={streak.completedWeek}
            />
          </View>

          {contacts.length > 0 && (
            <View style={styles.contactsRow}>
              {contacts.slice(0, 2).map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.contactCard}
                  onPress={() => onContactPress(c.title, c.phone)}
                >
                  <Text style={styles.contactTitle}>{c.title}</Text>
                  <Text style={styles.contactCta}>{c.ctaLabel}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <HomeSensorDebug
            showDebug={policy.mode === "partial"}
            dataMode={policy.mode}
            debugOpen={debugOpen}
            debugLoading={debugLoading}
            debugError={debugError}
            gpsLine={gpsLine}
            chargeLine={chargeLine}
            sessionsLine={sessionsLine}
            wifiLine={wifiLine}
            wifiLocLine={wifiLocLine}
            onRun={runSensorDebug}
            onHide={hideDebug}
          />
        </View>

        <View style={styles.patternsWrap}>
          <PatternsCard text={patterns.text} bottomInset={insets.bottom} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },

  container: {
    flexGrow: 1,
    paddingTop: 16,
  },

  padX: {
    paddingHorizontal: 18,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },

  leftHeader: {
    flex: 1,
    alignItems: "flex-start",
    paddingRight: 16,
  },

  rightHeader: {
    alignItems: "flex-end",
  },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  logoutIconSvg: {
    color: Colors.textSemiBlack,
    marginRight: 6,
  },

  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSemiBlack,
  },

  dateText: {
    color: Colors.textOnLight,
    marginTop: 20,
  },

  badge: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(80,200,120,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  badgeIcon: {
    marginRight: 6,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSemiBlack,
  },

  partialBadge: {
    minHeight: 34,
    marginTop: 8,
    backgroundColor: "rgba(255,165,0,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    justifyContent: "center",
  },

  partialBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B36B00",
  },

  mockBadge: {
    minHeight: 34,
    marginTop: 8,
    backgroundColor: "rgba(255,105,135,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    justifyContent: "center",
  },

  mockBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B03060",
  },

  title: {
    marginTop: 0,
    marginBottom: 6,
  },

  sectionHero: {
    marginTop: 8,
  },

  sectionTalk: {
    marginTop: 10,
  },

  talkCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(23,33,231,0.06)",
    borderRadius: 54,
    paddingVertical: 18,
    paddingHorizontal: 26,
  },

  talkPressed: {
    opacity: 0.7,
  },

  talkCardText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.blue,
  },

  talkArrow: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.blue,
  },

  sectionStreak: {
    marginTop: 12,
  },

  contactsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  contactCard: {
    flex: 1,
    backgroundColor: "rgba(23,33,231,0.06)",
    borderRadius: 18,
    padding: 14,
  },

  contactTitle: {
    fontWeight: "800",
    marginBottom: 6,
  },

  contactCta: {
    color: Colors.blue,
    fontWeight: "700",
  },

  patternsWrap: {
    marginTop: 18,
  },
});
