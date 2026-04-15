import { Alert, Linking } from "react-native";

export function confirmAndCall(name: string, phone?: string) {
  if (!phone) {
    Alert.alert("No phone number", `${name} has no phone number yet.`);
    return;
  }

  Alert.alert(
    "Confirm Call",
    `Are you sure you want to call ${name}?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Call",
        onPress: async () => {
          const url = `tel:${phone}`;
          const canOpen = await Linking.canOpenURL(url);

          if (canOpen) {
            await Linking.openURL(url);
          } else {
            Alert.alert("Error", "Your device cannot place calls.");
          }
        },
      },
    ],
    { cancelable: true },
  );
}
