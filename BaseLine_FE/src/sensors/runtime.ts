import Constants from "expo-constants";
import { Platform } from "react-native";

export function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

export function canUseNativeAndroidSensors() {
  return Platform.OS === "android" && !isExpoGo();
}
