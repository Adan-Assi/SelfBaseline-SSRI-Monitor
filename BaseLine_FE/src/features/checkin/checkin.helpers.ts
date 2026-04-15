import { router } from "expo-router";

import { log } from "@/src/utils/logger";
import {
  hasUsableBackendUserId,
  type RuntimePolicy,
} from "../../config/runtimePolicy";
import { toISODateLocal } from "../../utils/date";
import { submitCheckin } from "./checkin.submit";
import type { CheckinQuestion } from "./checkin.types";

let submitting = false;

type SubmitFinalCheckinParams = {
  userId: number | null;
  policy: RuntimePolicy;
  questions: CheckinQuestion[];
  answers: Record<number, number>;
  markCheckedInToday: () => void;
  reset: () => void;
  setError: (value: string | null) => void;
  toUserMessage: (error: unknown, fallback: string) => string;
};

function getPostSubmitRoute(policy: RuntimePolicy, userId: number | null) {
  const canUseVoice = policy.useBackend && hasUsableBackendUserId(userId);
  return canUseVoice ? "/(checkin)/voice-checkin" : "/(main)/home";
}

// --- Final questionnaire submission --------------------
export async function submitFinalCheckin({
  userId,
  policy,
  questions,
  answers,
  markCheckedInToday,
  reset,
  setError,
  toUserMessage,
}: SubmitFinalCheckinParams) {
  if (submitting) return;
  submitting = true;

  try {
    setError(null);

    const res = await submitCheckin({
      patientUserId: userId,
      sessionDate: toISODateLocal(),
      questions,
      answers,
    });

    log("submitted", res);

    markCheckedInToday();
    reset();

    router.push(getPostSubmitRoute(policy, userId));
  } catch (e) {
    log("Submit failed", e);

    setError(
      toUserMessage(e, "We couldn't save your answers. Please try again."),
    );

    throw e;
  } finally {
    submitting = false;
  }
}
