import { request } from "../../api/client";
import {
  getRuntimePolicy,
  hasUsableBackendUserId,
} from "../../config/runtimePolicy";
import type { CheckinQuestion } from "./checkin.types";

export type CheckinSubmitResponse = {
  session_id: number;
  responses_saved: number;
  mocked?: boolean;
};

type PayloadAnswer =
  | { question_id: number; numeric_value: number }
  | { question_id: number; option_id: number };

// --- Check-in submission --------------------
// Converts FE answers into the BE payload shape and submits the session
export async function submitCheckin(params: {
  patientUserId: number | null;
  sessionDate: string; // YYYY-MM-DD
  questions: CheckinQuestion[];
  answers: Record<number, number>;
}): Promise<CheckinSubmitResponse> {
  const { patientUserId, sessionDate, questions, answers } = params;
  const policy = getRuntimePolicy();

  if (!policy.useBackend) {
    return {
      session_id: 0,
      responses_saved: 0,
      mocked: true,
    };
  }

  if (!hasUsableBackendUserId(patientUserId)) {
    if (policy.allowFallback) {
      return {
        session_id: 0,
        responses_saved: 0,
        mocked: true,
      };
    }

    throw new Error("Missing backend user id for check-in submit");
  }

  const payloadAnswers: PayloadAnswer[] = questions.reduce<PayloadAnswer[]>(
    (acc, q) => {
      const v = answers[q.id];
      if (v == null) return acc;

      if (q.type === "slider") {
        acc.push({
          question_id: q.id,
          numeric_value: Math.round(v),
        });
      } else {
        acc.push({
          question_id: q.id,
          option_id: v,
        });
      }

      return acc;
    },
    [],
  );

  try {
    return await request<CheckinSubmitResponse>("/checkin/submit", {
      method: "POST",
      body: {
        patient_user_id: patientUserId,
        session_date: sessionDate,
        answers: payloadAnswers,
      },
    });
  } catch (e) {
    if (policy.allowFallback) {
      return {
        session_id: 0,
        responses_saved: payloadAnswers.length,
        mocked: true,
      };
    }

    throw e;
  }
}
