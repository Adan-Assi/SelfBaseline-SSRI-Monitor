export type QuestionBase = {
  id: number;
  text: string;
  required: boolean;
};

export type SliderQuestion = QuestionBase & {
  type: "slider";
  min: number;
  max: number;
  step: number;
};

export type SingleChoiceQuestion = QuestionBase & {
  type: "single";
  options: {
    optionId: number;
    label: string;
    value: number;
  }[];
};

export type CheckinQuestion = SliderQuestion | SingleChoiceQuestion;
