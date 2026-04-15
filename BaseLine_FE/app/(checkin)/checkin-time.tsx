import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";
import HeaderBar from "../../src/ui/components/HeaderBar";
import ProgressBar from "../../src/ui/components/ProgressBar";

import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

export default function CheckinTime() {
  // --- Store --------------------
  const checkinTimeFromStore = useOnboardingStore((s) => s.checkinTime);
  const setCheckinTime = useOnboardingStore((s) => s.setCheckinTime);
  const skipCheckinTime = useOnboardingStore((s) => s.skipCheckinTime);

  // --- Local state --------------------
  const [localTime, setLocalTime] = useState<Date>(
    checkinTimeFromStore ?? new Date(),
  );
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  // --- Derived --------------------
  const formattedTime = useMemo(() => {
    return localTime.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [localTime]);

  // --- Actions --------------------
  const onNext = () => {
    setCheckinTime(localTime);
    router.push("/(auth)/all-set");
  };

  const onSkip = () => {
    skipCheckinTime();
    router.push("/(auth)/all-set");
  };

  const onChangeTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowAndroidPicker(false);
    }

    if (event.type === "dismissed") return;

    if (selected) {
      setLocalTime(selected);
    }
  };

  // --- Render --------------------
  return (
    <View style={styles.container}>
      <HeaderBar
        onBack={() => router.back()}
        onClose={() => router.replace("/(auth)/welcome")}
      />

      <View style={styles.content}>
        <View style={styles.topSpacing} />

        <ProgressBar current={5} total={6} />

        <View style={styles.heroBlock}>
          <Text style={styles.question} allowFontScaling={false}>
            {"You’re setting a space\nfor yourself."}
          </Text>

          <Text style={styles.sub} allowFontScaling={false}>
            When feels best for me-time?
          </Text>
        </View>

        {Platform.OS === "ios" ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={localTime}
              mode="time"
              display="spinner"
              onChange={onChangeTime}
              themeVariant="dark"
              textColor={Colors.white as any}
            />
          </View>
        ) : (
          <Pressable
            style={styles.timeButton}
            onPress={() => setShowAndroidPicker(true)}
          >
            <Text style={styles.timeButtonText}>{formattedTime}</Text>
          </Pressable>
        )}

        {Platform.OS === "android" && showAndroidPicker && (
          <DateTimePicker
            value={localTime}
            mode="time"
            display="default"
            onChange={onChangeTime}
          />
        )}

        <View style={{ flex: 1 }} />

        <Text onPress={onSkip} style={styles.skip}>
          set up later
        </Text>

        <View style={{ height: 16 }} />

        <BottomCTA label="next" variant="lime" onPress={onNext} />

        <View style={{ height: 34 }} />
      </View>
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  topSpacing: {
    height: 10,
  },

  heroBlock: {
    alignItems: "center",
    paddingTop: 150,
    paddingBottom: 32,
  },

  question: {
    ...Typography.question,
    color: Colors.white,
    textAlign: "center",
    lineHeight: 34,
    includeFontPadding: false,
    maxWidth: 310,
  },

  sub: {
    marginTop: 12,
    ...Typography.answer,
    color: Colors.dimText,
    textAlign: "center",
    lineHeight: 22,
    includeFontPadding: false,
  },

  pickerWrap: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
  },

  timeButton: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 220,
    minHeight: 40,
    borderRadius: 16,
    borderBottomWidth: 1,
    borderColor: Colors.lineSoft,
    justifyContent: "center",
  },

  timeButtonText: {
    ...Typography.topBar,
    color: Colors.white,
    textAlign: "center",
  },

  skip: {
    ...Typography.answer,
    color: Colors.lime,
    textAlign: "center",
  },
});
