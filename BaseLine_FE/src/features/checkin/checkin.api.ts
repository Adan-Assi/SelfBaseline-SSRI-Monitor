import { request } from "../../api/client";
import { getRuntimePolicy } from "../../config/runtimePolicy";
import { log } from "../../utils/logger";
import { MOCK_QUESTIONS } from "./checkin.api.mock";
import type { CheckinQuestion } from "./checkin.types";

// --- Backend response types --------------------
type BEChoiceOption = {
  id: number; // option_id
  label: string;
  value: number; // numeric meaning
  sort_order: number;
};

type BESliderConfig = {
  min_value: number;
  max_value: number;
  step: number;
};

type BEQuestionResponse = {
  id: number;
  text: string;
  type: string;
  sort_order: number;
  slider_config: BESliderConfig | null;
  choice_options: BEChoiceOption[] | null;
};

// --- Mapper: BE → FE model --------------------
function mapBEQuestionToFE(q: BEQuestionResponse): CheckinQuestion {
  if (q.slider_config) {
    return {
      id: q.id,
      type: "slider",
      text: q.text,
      required: true,
      min: q.slider_config.min_value,
      max: q.slider_config.max_value,
      step: q.slider_config.step,
    };
  }

  const options = (q.choice_options ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      value: o.value,
    }));

  return {
    id: q.id,
    type: "single",
    text: q.text,
    required: true,
    options,
  };
}

// ---------- API ----------
export async function fetchQuestions(): Promise<CheckinQuestion[]> {
  const policy = getRuntimePolicy();

  if (!policy.useBackend) {
    return MOCK_QUESTIONS;
  }

  try {
    const raw = await request<BEQuestionResponse[]>("/questions");

    if (!raw || raw.length === 0) {
      if (policy.allowFallback) {
        log("[fetchQuestions] empty response -> using mocks");
        return MOCK_QUESTIONS;
      }
      throw new Error("Empty questions response");
    }

    const sorted = raw.slice().sort((a, b) => {
      return a.sort_order - b.sort_order;
    });

    return sorted.map(mapBEQuestionToFE);
  } catch (e) {
    if (policy.allowFallback) {
      log("[fetchQuestions] server failed -> using mocks:", e);
      return MOCK_QUESTIONS;
    }
    throw e;
  }
}
