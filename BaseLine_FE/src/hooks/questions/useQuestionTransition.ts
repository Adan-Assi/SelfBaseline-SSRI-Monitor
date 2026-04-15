import { useRef } from "react";
import { Animated, Easing } from "react-native";

export function useQuestionTransition() {
  // --- Animation refs --------------------
  const animating = useRef(false);
  const enter = useRef(new Animated.Value(1)).current;
  const dirRef = useRef<"next" | "prev">("next");

  // --- Derived animated values --------------------
  const slideX = enter.interpolate({
    inputRange: [0, 1],
    outputRange: dirRef.current === "next" ? [-18, 0] : [18, 0],
  });

  const scale = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  // --- Run question transition --------------------
  const runTransition = (dir: "next" | "prev", go: () => void) => {
    if (animating.current) return;

    animating.current = true;
    dirRef.current = dir;

    enter.stopAnimation();
    enter.setValue(1);

    Animated.timing(enter, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      go();

      enter.setValue(0);

      Animated.timing(enter, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        animating.current = false;
      });
    });
  };

  // --- Public API --------------------
  return {
    animating,
    enter,
    slideX,
    scale,
    runTransition,
  };
}
