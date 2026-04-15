import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { WEEK_LABELS, type WeekIndex } from "../../../features/home/home.types";
import { Colors } from "../../theme/colors";
import { Typography } from "../../theme/typography";
import Card from "../Card";

type Props = {
  totalDays: number;
  encouragement: string;
  todayIndex: WeekIndex;
  completedWeek?: boolean[];
};

// --- Component --------------------
export default function WeekStreak({
  totalDays,
  encouragement,
  todayIndex,
  completedWeek = [],
}: Props) {
  return (
    <Card radius={15} padding={0} style={styles.card}>
      <View style={styles.header}>
        <Text style={[Typography.title, styles.title]}>
          {totalDays} days in progress
        </Text>

        <Text style={[Typography.text, styles.subtitle]}>{encouragement}</Text>
      </View>

      <View style={styles.weekRow}>
        {WEEK_LABELS.map((label, i) => {
          const isToday = i === todayIndex;
          const isDone = Boolean(completedWeek[i]);

          return (
            <View key={i} style={styles.day}>
              <View
                style={[
                  styles.pill,
                  isDone && !isToday && styles.pillDone,
                  isToday && styles.todayPill,
                ]}
              />

              <Text style={[Typography.topBar, styles.dayLabel]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 360,
    height: 175,
    alignSelf: "center",
    backgroundColor: Colors.pillBg,
  },

  header: {
    paddingTop: 18,
    paddingHorizontal: 18,
  },

  title: {
    color: Colors.textOnLight,
    lineHeight: 18,
  },

  subtitle: {
    marginTop: 4,
    color: Colors.dimText,
  },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 18,
    flex: 1,
    alignItems: "flex-end",
  },

  day: {
    width: 34,
    alignItems: "center",
  },

  pill: {
    width: 30,
    height: 23,
    borderRadius: 999,
    backgroundColor: "#D0D3C6",
    marginBottom: 10,
  },

  pillDone: {
    backgroundColor: Colors.textSemiBlack,
  },

  todayPill: {
    width: 36,
    height: 75,
    borderRadius: 18,
    backgroundColor: Colors.blue,
    opacity: 0.75,
    marginBottom: 10,
  },

  dayLabel: {
    fontSize: 14,
    lineHeight: 14,
    color: Colors.textOnLight,
    fontWeight: "400",
  },
});
