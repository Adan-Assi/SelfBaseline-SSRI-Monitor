import type { CheckinQuestion } from "./checkin.types";

export const MOCK_QUESTIONS: CheckinQuestion[] = [
  // 1) Stress(1..5)
  {
    id: 101,
    type: "single",
    text: "Right now, I am...",
    required: true,
    options: [
      { optionId: 1, label: "A little stressed", value: 1 },
      { optionId: 2, label: "Definitely stressed", value: 2 },
      { optionId: 3, label: "Stressed out", value: 3 },
      { optionId: 4, label: "Feeling good", value: 4 },
      { optionId: 5, label: "Feeling great", value: 5 },
    ],
  },

  // 2) Anxiety (1..5)
  {
    id: 102,
    type: "slider",
    text: "In the past 15 minutes, I was anxious, easily upset.",
    required: true,
    min: 1,
    max: 5,
    step: 1,
  },

  // 3) Calm (1..5)
  {
    id: 103,
    type: "slider",
    text: "In the past 15 minutes, I was calm, emotionally stable.",
    required: true,
    min: 1,
    max: 5,
    step: 1,
  },

  // 4) Dependable
  {
    id: 104,
    type: "slider",
    text: "In the past 15 minutes, I was dependable, self-disciplined.",
    required: true,
    min: 1,
    max: 5,
    step: 1,
  },

  // 5) Critical / quarrelsome
  {
    id: 105,
    type: "slider",
    text: "In the past 15 minutes, I was critical, quarrelsome.",
    required: true,
    min: 1,
    max: 5,
    step: 1,
  },

  // 6) Reserved / quiet (inverted later)
  {
    id: 106,
    type: "slider",
    text: "In the past 15 minutes, I was reserved, quiet.",
    required: true,
    min: 1,
    max: 5,
    step: 1,
  },

  // 7) Sleep quality (1..4)
  {
    id: 201,
    type: "single",
    text: "How would you rate your overall sleep last night?",
    required: true,
    options: [
      { optionId: 1, label: "Very good", value: 1 },
      { optionId: 2, label: "Fairly good", value: 2 },
      { optionId: 3, label: "Fairly bad", value: 3 },
      { optionId: 4, label: "Very bad", value: 4 },
    ],
  },

  // 8) Hours slept (1..19)
  {
    id: 202,
    type: "single",
    text: "How many hours did you sleep last night?",
    required: true,
    options: [
      { optionId: 1, label: "lesst then 3h", value: 1 },
      { optionId: 2, label: "3.5h", value: 2 },
      { optionId: 3, label: "4h", value: 3 },
      { optionId: 4, label: "4.5h", value: 4 },
      { optionId: 5, label: "5h", value: 5 },
      { optionId: 6, label: "5.5h", value: 6 },
      { optionId: 7, label: "6h", value: 7 },
      { optionId: 8, label: "6.5h", value: 8 },
      { optionId: 9, label: "7h", value: 9 },
      { optionId: 10, label: "7.5h", value: 10 },
      { optionId: 11, label: "8h", value: 11 },
      { optionId: 12, label: "8.5h", value: 12 },
      { optionId: 13, label: "9h", value: 13 },
      { optionId: 14, label: "9.5h", value: 14 },
      { optionId: 15, label: "10h", value: 15 },
      { optionId: 16, label: "10.5h", value: 16 },
      { optionId: 17, label: "11h", value: 17 },
      { optionId: 18, label: "11.5h", value: 18 },
      { optionId: 19, label: "12h or more", value: 19 },
    ],
  },

  // 9) Daytime sleepiness (1..4)
  {
    id: 203,
    type: "single",
    text: "How often did you have trouble staying awake yesterday while in class, eating meals or engaging in social activity?",
    required: true,
    options: [
      { optionId: 1, label: "None", value: 1 },
      { optionId: 2, label: "Once", value: 2 },
      { optionId: 3, label: "Twice", value: 3 },
      { optionId: 4, label: "Three or more times", value: 4 },
    ],
  },
];
