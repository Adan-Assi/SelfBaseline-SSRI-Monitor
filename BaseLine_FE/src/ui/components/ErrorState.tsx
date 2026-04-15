import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/colors";
import BottomCTA from "./BottomCTA";

type Props = {
  title?: string;
  message?: string;
  retryText?: string;
  onRetry?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
};

export default function ErrorState({
  title = "Oops, something failed",
  message = "We couldn't complete your request. Please try again.",
  retryText = "Try again",
  onRetry,
  secondaryText = "Back",
  onSecondary,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.message}>{message}</Text>

      {onRetry && <BottomCTA label={retryText} onPress={onRetry} />}
      <View style={{ paddingBottom: 10 }}></View>
      {onSecondary && (
        <BottomCTA label={secondaryText} onPress={onSecondary} variant="blue" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: Colors.offWhite,
  },

  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    color: Colors.textOnLight,
  },

  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: Colors.textOnLight,
  },
});
