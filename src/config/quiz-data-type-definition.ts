export type QuizData = [QuizQuestion, ...QuizQuestion[]];

export type QuizQuestion = EnumQuizQuestion | NumberQuizQuestion;

export type EnumQuizQuestion = {
  question: string;
  type: "enum";
  answerPossibilities: string[];
  correctAnswerIndex: number;
};

export type NumberQuizQuestion = {
  question: string;
  type: "number";
  correctAnswer: number;
};