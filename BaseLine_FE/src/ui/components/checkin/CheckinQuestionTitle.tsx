import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../../ui/theme/colors";

type Props = {
  text: string;
};

export default function CheckinQuestionTitle({ text }: Props) {
  const prefix = "In the past 15 minutes, I was ";

  if (text.startsWith(prefix)) {
    const main = text.slice(prefix.length);

    return (
      <View style={styles.questionWrap}>
        <Text style={styles.contextText}>{prefix}</Text>
        <Text style={styles.mainQuestion}>{main}</Text>
      </View>
    );
  }

  return <Text style={styles.title}>{text}</Text>;
}

const styles = StyleSheet.create({
  questionWrap: {
    alignItems: "center",
    marginTop: 88,
    paddingHorizontal: 10,
  },

  contextText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.textSemiBlack,
    textAlign: "center",
    marginBottom: 4,
  },

  mainQuestion: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.textSemiBlack,
    textAlign: "center",
    lineHeight: 38,
    maxWidth: 320,
  },

  title: {
    marginTop: 50,
    fontSize: 32,
    fontWeight: "800",
    color: Colors.textSemiBlack,
    textAlign: "center",
    lineHeight: 38,
    paddingHorizontal: 8,
  },
});
