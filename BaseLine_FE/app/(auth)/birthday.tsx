import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import BottomCTA from "../../src/ui/components/BottomCTA";
import OnboardingStepLayout from "../../src/ui/components/onboarding/OnboardingStepLayout";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";

// --- Helpers --------------------
function clampDate(d: Date) {
  const now = new Date();
  if (d.getTime() > now.getTime()) return now;
  return d;
}

export default function Birthday() {
  // --- Global store state --------------------
  const name = useOnboardingStore((s) => s.name);
  const birthDateFromStore = useOnboardingStore((s) => s.birthDate);
  const setBirthDate = useOnboardingStore((s) => s.setBirthDate);

  // --- Local screen state --------------------
  const [localDate, setLocalDate] = useState<Date>(
    birthDateFromStore ?? new Date(2000, 0, 1),
  );
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  // --- Derived values --------------------
  const displayName = name?.trim() ? name.trim() : "";

  const formatted = useMemo(() => {
    return localDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [localDate]);

  // --- Handlers --------------------
  const onNext = () => {
    setBirthDate(clampDate(localDate));
    router.push("/(auth)/goal");
  };

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowAndroidPicker(false);
    }

    if (event.type === "dismissed") return;

    if (selected) {
      setLocalDate(clampDate(selected));
    }
  };

  // --- Render --------------------
  return (
    <OnboardingStepLayout current={3} total={6}>
      <View style={{ height: 60 }} />

      <Text style={styles.question}>
        Hey {displayName}, Welcome.{"\n"}When should we celebrate you?
      </Text>

      <View style={{ height: 24 }} />

      {Platform.OS === "ios" ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={localDate}
            mode="date"
            display="spinner"
            onChange={onChangeDate}
            themeVariant="dark"
            textColor={Colors.white as any}
            style={styles.picker}
            maximumDate={new Date()}
          />
        </View>
      ) : (
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowAndroidPicker(true)}
        >
          <Text style={styles.dateButtonText}>{formatted}</Text>
        </Pressable>
      )}

      {Platform.OS === "android" && showAndroidPicker && (
        <DateTimePicker
          value={localDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

      <View style={{ flex: 1 }} />

      <BottomCTA label="next" variant="lime" onPress={onNext} />

      <View style={{ height: 34 }} />
    </OnboardingStepLayout>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  question: {
    ...Typography.question,
    color: Colors.white,
  },

  pickerWrap: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    opacity: 0.95,
  },

  picker: {
    width: "100%",
  },

  dateButton: {
    alignSelf: "center",
    width: "100%",
    marginTop: 40,
    maxWidth: 220,
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
    justifyContent: "center",
  },

  dateButtonText: {
    ...Typography.topBar,
    color: Colors.white,
    textAlign: "center",
  },

  presentDate: {
    marginTop: 10,
    ...Typography.topBar,
    color: Colors.dimText,
    textAlign: "center",
  },
});
