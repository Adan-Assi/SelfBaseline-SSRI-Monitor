import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme/colors";
import { Typography } from "../../theme/typography";

import DailySvg from "../../../../assets/patterns/daily.svg";
import FocusSvg from "../../../../assets/patterns/focus.svg";
import MoodSvg from "../../../../assets/patterns/mood.svg";
import SleepingSvg from "../../../../assets/patterns/sleeping.svg";

type Props = {
  text: string;
  bottomInset?: number;
};

// --- Layout constants --------------------
const TILE_W = 170;
const ART_H = 160;

const BODY_LINE_HEIGHT = 20;
const BODY_LINES = 2;
const BODY_MIN_H = BODY_LINE_HEIGHT * BODY_LINES;

// --- Component --------------------
export default function PatternsCard({ text, bottomInset = 0 }: Props) {
  return (
    <View style={[styles.section, { paddingBottom: 16 + bottomInset }]}>
      <Text
        style={[
          Typography.title,
          styles.title,
          { fontSize: 25, lineHeight: 27 },
        ]}
      >
        Patterns
      </Text>

      <Text
        style={[
          Typography.patternsBody,
          styles.body,
          { minHeight: BODY_MIN_H },
        ]}
      >
        {text}
      </Text>

      <ScrollView
        style={styles.hScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScrollContent}
      >
        {/* Sleeping */}
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Sleeping{"\n"}Habits</Text>
          <View style={styles.artFrame}>
            <SleepingSvg width="100%" height="100%" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Daily */}
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Daily{"\n"}Activity</Text>
          <View style={styles.artFrame}>
            <DailySvg width="100%" height="100%" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Focus */}
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Focus &{"\n"}Concentration</Text>
          <View style={styles.artFrame}>
            <FocusSvg width="100%" height="100%" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Mood */}
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Mood{"\n"}Swings</Text>
          <View style={styles.artFrame}>
            <MoodSvg width="100%" height="100%" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  section: {
    flexGrow: 1,
    width: "100%",
    backgroundColor: Colors.lime,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 22,
  },

  title: {
    color: Colors.textOnLight,
  },

  body: {
    color: Colors.textOnLight,
    opacity: 0.75,
    marginTop: 7,
    lineHeight: BODY_LINE_HEIGHT,
  },

  hScroll: {
    marginTop: 18,
    overflow: "visible",
  },

  hScrollContent: {
    alignItems: "flex-start",
    paddingRight: 60,
    paddingBottom: 10,
  },

  tile: {
    width: TILE_W,
    alignItems: "flex-start",
  },

  tileTitle: {
    color: Colors.textOnLight,
    fontSize: 20,
    fontWeight: "400",
    marginBottom: 10,
  },

  artFrame: {
    width: "100%",
    height: ART_H,
    borderRadius: 22,
    overflow: "hidden",
  },

  divider: {
    width: 1,
    height: 225,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 1,
    marginLeft: 12,
    marginRight: 17,
  },
});
