import { router } from "expo-router";
import React, { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "../../theme/colors";
import HeaderBar from "../HeaderBar";
import ProgressBar from "../ProgressBar";

type Props = {
  children: ReactNode;
  current: number;
  total: number;
  backgroundColor?: string;
  showHeader?: boolean;
  showProgress?: boolean;
  onBack?: () => void;
  onClose?: () => void;
};

export default function OnboardingStepLayout({
  children,
  current,
  total,
  backgroundColor = Colors.black,
  showHeader = true,
  showProgress = true,
  onBack,
  onClose,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {showHeader && (
        <HeaderBar
          onBack={onBack ?? (() => router.back())}
          onClose={onClose ?? (() => router.replace("/(auth)/welcome"))}
        />
      )}

      <View style={styles.content}>
        {showProgress && (
          <View style={styles.progressWrap}>
            <ProgressBar current={current} total={total} />
          </View>
        )}

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  progressWrap: {
    marginTop: 2,
    marginBottom: 28,
  },
});
