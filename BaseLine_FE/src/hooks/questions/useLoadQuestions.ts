import { useCallback, useEffect, useState } from "react";

import { toUserMessage } from "../../../src/api/errors";
import { fetchQuestions } from "../../features/checkin/checkin.api";
import { useCheckinStore } from "../../features/checkin/checkin.store";
import { log } from "../../utils/logger";

export function useLoadQuestions() {
  // --- Global store state --------------------
  const questions = useCheckinStore((s) => s.questions);
  const setQuestions = useCheckinStore((s) => s.setQuestions);
  const reset = useCheckinStore((s) => s.reset);

  // --- Local state --------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Load questions from API --------------------
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const qs = await fetchQuestions();
      setQuestions(qs);

      log("[Checkin] questions loaded", {
        count: qs.length,
      });
    } catch (e) {
      log("[Checkin] questions load failed", e);

      setError(
        toUserMessage(
          e,
          "We couldn't load today's questions. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [setQuestions]);

  // --- Retry handler --------------------
  const retry = useCallback(async () => {
    log("[Checkin] retry questions load");
    reset();
    await loadQuestions();
  }, [reset, loadQuestions]);

  // --- Initial load --------------------
  useEffect(() => {
    if (questions.length > 0) return;

    void loadQuestions();
  }, [questions.length, loadQuestions]);

  // --- Public API --------------------
  return {
    loading,
    error,
    setError,
    retry,
  };
}
