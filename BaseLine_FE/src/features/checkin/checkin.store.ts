import { create } from "zustand";
import type { CheckinQuestion } from "./checkin.types";

type CheckinState = {
  questions: CheckinQuestion[];
  currentIndex: number;
  answers: Record<number, number>;

  setQuestions: (questions: CheckinQuestion[]) => void;
  answerQuestion: (questionId: number, value: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
};

// --- Questionnaire state --------------------
export const useCheckinStore = create<CheckinState>((set) => ({
  questions: [],
  currentIndex: 0,
  answers: {},

  setQuestions: (questions) =>
    set({
      questions,
      currentIndex: 0,
      answers: {},
    }),

  answerQuestion: (questionId, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: value,
      },
    })),

  next: () =>
    set((state) => ({
      currentIndex: Math.min(
        state.currentIndex + 1,
        Math.max(0, state.questions.length - 1),
      ),
    })),

  prev: () =>
    set((state) => ({
      currentIndex: Math.max(0, state.currentIndex - 1),
    })),

  reset: () =>
    set({
      questions: [],
      currentIndex: 0,
      answers: {},
    }),
}));
