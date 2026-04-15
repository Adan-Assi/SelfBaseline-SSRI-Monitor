import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Logo from "../../assets/images/logo.svg";

import { useRuntimePolicy } from "../../src/config/runtimePolicy";
import BottomCTA from "../../src/ui/components/BottomCTA";
import { Colors } from "../../src/ui/theme/colors";

const REVEAL_DELAY_MS = 1400;

export default function Welcome() {
  // --- Policy --------------------
  const policy = useRuntimePolicy();
  const loginAllowed = policy.mode === "real" || policy.mode === "partial";

  // --- Local state --------------------
  const [showActions, setShowActions] = useState(false);

  // --- Animations --------------------
  const actionsOpacity = useRef(new Animated.Value(0)).current;
  const actionsTranslateY = useRef(new Animated.Value(14)).current;

  // --- Effects --------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowActions(true);

      Animated.parallel([
        Animated.timing(actionsOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(actionsTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, REVEAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [actionsOpacity, actionsTranslateY]);

  // --- Actions --------------------
  const onCreateAccount = () => {
    router.push("/(auth)/signup-intro");
  };

  const onLogin = () => {
    router.push("/(auth)/login");
  };

  // --- Render --------------------
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Logo width={190} height={154} />

        <Text style={styles.welcomeText}>
          Welcome to <Text style={styles.brand}>BaseLine</Text>
        </Text>
      </View>

      <View style={styles.bottomArea}>
        {showActions ? (
          <Animated.View
            style={[
              styles.actionsWrap,
              {
                opacity: actionsOpacity,
                transform: [{ translateY: actionsTranslateY }],
              },
            ]}
          >
            <BottomCTA
              label="create account"
              variant="blue"
              onPress={onCreateAccount}
            />

            {loginAllowed && (
              <Pressable onPress={onLogin} style={styles.secondaryAction}>
                <Text style={styles.secondaryText}>
                  I already have an account
                </Text>
              </Pressable>
            )}
          </Animated.View>
        ) : (
          <View style={styles.actionsPlaceholder} />
        )}
      </View>
    </View>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lime,
    paddingHorizontal: 22,
    paddingTop: 96,
    paddingBottom: 40,
    justifyContent: "space-between",
  },

  hero: {
    marginTop: 25,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  welcomeText: {
    marginTop: 18,
    color: Colors.blue,
    textAlign: "center",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "500",
  },

  brand: {
    fontWeight: "800",
    color: Colors.blue,
  },

  bottomArea: {
    minHeight: 120,
    justifyContent: "flex-end",
  },

  actionsWrap: {
    width: "100%",
  },

  actionsPlaceholder: {
    height: 120,
  },

  secondaryAction: {
    marginTop: 18,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  secondaryText: {
    textAlign: "center",
    color: Colors.blue,
    fontWeight: "600",
    textDecorationLine: "underline",
    fontSize: 16,
  },
});
