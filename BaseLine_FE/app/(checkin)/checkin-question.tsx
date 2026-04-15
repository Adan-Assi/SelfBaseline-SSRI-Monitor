import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLoadQuestions } from "../../src/hooks/questions/useLoadQuestions";
import { useQuestionTransition } from "../../src/hooks/questions/useQuestionTransition";

import { Colors } from "../../src/ui/theme/colors";
import { Typography } from "../../src/ui/theme/typography";

import BottomCTA from "../../src/ui/components/BottomCTA";
import CheckinQuestionTitle from "../../src/ui/components/checkin/CheckinQuestionTitle";
import StepProgress from "../../src/ui/components/checkin/StepProgress";
import ChoiceButton from "../../src/ui/components/ChoiceButton";
import EnergySlider from "../../src/ui/components/EnergySlider";
import ErrorState from "../../src/ui/components/ErrorState";

import {
  hasUsableBackendUserId,
  useRuntimePolicy,
} from "../../src/config/runtimePolicy";
import { useAuthStore } from "../../src/features/auth/auth.store";
import { submitFinalCheckin } from "../../src/features/checkin/checkin.helpers";
import { useCheckinStore } from "../../src/features/checkin/checkin.store";
import { useOnboardingStore } from "../../src/features/onboarding/onboarding.store";

import { toUserMessage } from "../../src/api/errors";

export default function CheckinQuestion() {
  // --- Global store state --------------------
  const questions = useCheckinStore((s) => s.questions);
  const answers = useCheckinStore((s) => s.answers);
  const answerQuestion = useCheckinStore((s) => s.answerQuestion);
  const currentIndex = useCheckinStore((s) => s.currentIndex);
  const next = useCheckinStore((s) => s.next);
  const prev = useCheckinStore((s) => s.prev);
  const reset = useCheckinStore((s) => s.reset);

  const userId = useAuthStore((s) => s.userId);
  const policy = useRuntimePolicy();
  const markCheckedInToday = useOnboardingStore((s) => s.markCheckedInToday);

  // --- Local screen state --------------------
  const [submitting, setSubmitting] = useState(false);

  // --- Hooks --------------------
  const { animating, enter, slideX, scale, runTransition } =
    useQuestionTransition();
  const { loading, error, setError, retry } = useLoadQuestions();

  // --- Derived values --------------------
  const question = questions[currentIndex];
  const total = questions.length;
  const currentStep = Math.min(currentIndex + 1, total || 1);

  const isLast = useMemo(
    () => total > 0 && currentIndex === total - 1,
    [total, currentIndex],
  );

  const currentAnswer = question ? answers[question.id] : undefined;
  const hasAnswer = typeof currentAnswer === "number";

  // --- Redirect invalid real-mode state --------------------
  useEffect(() => {
    if (policy.mode === "real" && !hasUsableBackendUserId(userId)) {
      reset();
      router.replace("/(auth)/welcome");
    }
  }, [policy.mode, reset, userId]);

  if (policy.mode === "real" && !hasUsableBackendUserId(userId)) {
    return null;
  }

  // --- Loading / Error states --------------------
  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ErrorState
          title="Oops, something failed"
          message={error}
          retryText="Try again"
          onRetry={retry}
          secondaryText="Back to Home"
          onSecondary={() => {
            reset();
            router.replace("/(main)/home");
          }}
        />
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <Text style={[Typography.topBar, { color: Colors.textOnLight }]}>
            {loading ? "Loading..." : "No questions"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Handlers --------------------
  const handleBack = () => {
    if (animating.current || submitting) return;

    if (currentIndex > 0) {
      runTransition("prev", prev);
      return;
    }

    reset();
    router.replace("/(main)/home");
  };

  const handleClose = () => {
    if (animating.current || submitting) return;

    reset();
    router.replace("/(main)/home");
  };

  const handleContinue = async () => {
    if (submitting) return;
    if (!question || !hasAnswer) return;

    setError(null);

    if (!isLast) {
      runTransition("next", next);
      return;
    }

    try {
      setSubmitting(true);

      await submitFinalCheckin({
        userId,
        policy,
        questions,
        answers,
        markCheckedInToday,
        reset,
        setError,
        toUserMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render --------------------
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} hitSlop={10} disabled={submitting}>
            <Text
              style={[styles.headerIcon, submitting && styles.headerIconMuted]}
            >
              ‹
            </Text>
          </Pressable>

          <Pressable onPress={handleClose} hitSlop={10} disabled={submitting}>
            <Text
              style={[styles.headerIcon, submitting && styles.headerIconMuted]}
            >
              ×
            </Text>
          </Pressable>
        </View>

        <View style={styles.progressBlock}>
          <Text style={styles.progressHint}>
            {total > 0 ? `${currentStep} / ${total}` : ""}
          </Text>

          <StepProgress
            total={total || 1}
            current={currentStep}
            windowSize={4}
          />
        </View>

        <Animated.View
          style={[
            styles.animatedWrap,
            {
              opacity: enter,
              transform: [{ translateX: slideX }, { scale }],
            },
          ]}
        >
          <CheckinQuestionTitle text={question.text} />

          <View style={styles.content}>
            {question.type === "slider" && (
              <View style={styles.sliderCenter}>
                <EnergySlider
                  min={question.min}
                  max={question.max}
                  step={question.step}
                  value={
                    typeof currentAnswer === "number"
                      ? currentAnswer
                      : Math.round((question.min + question.max) / 2)
                  }
                  onChange={(v) => answerQuestion(question.id, Math.round(v))}
                  leftLabel="Not at all"
                  rightLabel="Extremely"
                />
              </View>
            )}

            {question.type === "single" && (
              <ScrollView
                style={styles.choicesWrap}
                contentContainerStyle={styles.choicesContent}
                showsVerticalScrollIndicator={false}
              >
                {question.options.map((opt) => (
                  <ChoiceButton
                    key={opt.optionId}
                    label={opt.label}
                    selected={answers[question.id] === opt.optionId}
                    onPress={() => answerQuestion(question.id, opt.optionId)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </Animated.View>

        {hasAnswer && (
          <View style={styles.bottom}>
            <BottomCTA
              label={submitting ? "saving..." : isLast ? "finish" : "next"}
              disabled={submitting}
              onPress={handleContinue}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Styles --------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.offWhite,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },

  headerIcon: {
    fontSize: 34,
    color: Colors.textSemiBlack,
    fontWeight: "500",
  },

  headerIconMuted: {
    opacity: 0.35,
  },

  progressBlock: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 14,
  },

  progressHint: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSemiBlack,
    opacity: 0.55,
  },

  animatedWrap: {
    flex: 1,
  },

  content: {
    flex: 1,
    marginTop: 18,
  },

  sliderCenter: {
    marginTop: 90,
  },

  choicesWrap: {
    width: "100%",
    marginTop: 22,
    flexGrow: 0,
  },

  choicesContent: {
    paddingBottom: 16,
  },

  bottom: {
    paddingBottom: 26,
    alignItems: "center",
  },
});
