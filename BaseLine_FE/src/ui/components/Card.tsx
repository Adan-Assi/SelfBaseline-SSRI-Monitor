import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { Colors } from "../theme/colors";

type CardProps = ViewProps & {
  children: React.ReactNode;
  radius?: number;
  padding?: number;
};

export default function Card({
  children,
  style,
  radius = 32,
  padding = 20,
  ...props
}: CardProps) {
  return (
    <View
      style={[styles.base, { borderRadius: radius, padding }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.ctaGrey,
  },
});
