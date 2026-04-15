import { Platform } from "react-native";

export const Fonts = {
  primary: Platform.select({
    ios: "Helvetica",
    android: "sans-serif",
    default: "System",
  }),
};

export const Typography = {
  hero: {
    fontFamily: Fonts.primary,
    fontWeight: "700" as const,
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -2,
    textAlign: "center" as const,
  },

  question: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 0,
    textAlign: "center" as const,
  },

  answer: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 15,
    lineHeight: 15,
    letterSpacing: 0,
    textAlign: "center" as const,
  },

  topBar: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 15,
    lineHeight: 15,
    letterSpacing: 0,
  },

  text: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
  },

  button: {
    fontFamily: Fonts.primary,
    fontWeight: "700" as const,
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: 0,
    textAlign: "center" as const,
  },

  textM: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
  },

  homeTitle: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: 0,
  },

  title: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0,
  },

  patternsBody: {
    fontFamily: Fonts.primary,
    fontWeight: "400" as const,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
};
