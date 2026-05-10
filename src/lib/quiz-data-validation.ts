import {QuizData} from "@/config/quiz-data-type-definition";

export type QuizDataValidationIssue =
    | { code: "rootArray" }
    | { code: "nonEmptyArray" }
    | { code: "questionObject"; path: string }
    | { code: "questionText"; path: string }
    | { code: "questionType"; path: string }
    | { code: "answerPossibilitiesArray"; path: string }
    | { code: "answerPossibilityText"; path: string }
    | { code: "correctAnswerIndex"; path: string }
    | { code: "correctAnswerIndexRange"; path: string }
    | { code: "correctAnswerNumber"; path: string };
export type QuizDataValidationResult =
    | { success: true; data: QuizData }
    | { success: false; issue: QuizDataValidationIssue };
export const validateQuizData = (value: unknown): QuizDataValidationResult => {
    if (!Array.isArray(value)) {
        return {success: false, issue: {code: "rootArray"}};
    }

    if (value.length === 0) {
        return {success: false, issue: {code: "nonEmptyArray"}};
    }

    for (const [index, entry] of value.entries()) {
        const basePath = `[${index}]`;

        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return {success: false, issue: {code: "questionObject", path: basePath}};
        }

        const question = entry as {
            question?: unknown;
            type?: unknown;
            answerPossibilities?: unknown;
            correctAnswerIndex?: unknown;
            correctAnswer?: unknown;
        };

        if (typeof question.question !== "string" || question.question.trim() === "") {
            return {success: false, issue: {code: "questionText", path: `${basePath}.question`}};
        }

        if (question.type !== "enum" && question.type !== "number") {
            return {success: false, issue: {code: "questionType", path: `${basePath}.type`}};
        }

        if (question.type === "number") {
            if (typeof question.correctAnswer !== "number" || !Number.isFinite(question.correctAnswer)) {
                return {
                    success: false,
                    issue: {code: "correctAnswerNumber", path: `${basePath}.correctAnswer`},
                };
            }

            continue;
        }

        if (!Array.isArray(question.answerPossibilities) || question.answerPossibilities.length === 0) {
            return {
                success: false,
                issue: {code: "answerPossibilitiesArray", path: `${basePath}.answerPossibilities`},
            };
        }

        const invalidAnswerPossibilityIndex = question.answerPossibilities.findIndex(
            (possibility) => typeof possibility !== "string",
        );

        if (invalidAnswerPossibilityIndex !== -1) {
            return {
                success: false,
                issue: {
                    code: "answerPossibilityText",
                    path: `${basePath}.answerPossibilities[${invalidAnswerPossibilityIndex}]`,
                },
            };
        }

        const correctAnswerIndex = question.correctAnswerIndex;

        if (!Number.isInteger(correctAnswerIndex)) {
            return {
                success: false,
                issue: {code: "correctAnswerIndex", path: `${basePath}.correctAnswerIndex`},
            };
        }

        if (
            typeof correctAnswerIndex !== "number" ||
            correctAnswerIndex < 0 ||
            correctAnswerIndex >= question.answerPossibilities.length
        ) {
            return {
                success: false,
                issue: {code: "correctAnswerIndexRange", path: `${basePath}.correctAnswerIndex`},
            };
        }
    }

    return {success: true, data: value as QuizData};
};