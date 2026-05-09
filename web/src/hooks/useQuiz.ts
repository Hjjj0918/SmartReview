import { useState, useCallback, useMemo } from 'react';
import type {
  QuizSource,
  Question,
  AnswerKey,
  AnswerRecord,
  QuizStats,
} from '../types';

export interface QuizState {
  currentIndex: number;
  selectedAnswer: AnswerKey | null;
  fillDraft: string;
  isSubmitted: boolean;
  showExplanation: boolean;
  answers: AnswerRecord[];
  startTime: number;
  endTime: number | null;
  isComplete: boolean;
}

export interface QuizActions {
  selectAnswer: (key: AnswerKey) => void;
  setFillDraft: (text: string) => void;
  submitAnswer: () => void;
  nextQuestion: () => void;
  reset: () => void;
}

const EMPTY_QUESTION: Question = {
  id: 0,
  type: 'MCQ',
  question: '',
  options: { A: '', B: '', C: '', D: '' },
  answer: 'A',
  explanation: '',
};

function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}

function tryParseNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;

  const fracMatch = t.match(
    /^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/,
  );
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
    return null;
  }

  const n = Number(t);
  if (Number.isFinite(n)) return n;
  return null;
}

function isFillCorrect(
  input: string,
  answers: string[],
  tolerance: number,
): boolean {
  const inputNum = tryParseNumber(input);
  if (inputNum !== null) {
    for (const a of answers) {
      const an = tryParseNumber(a);
      if (an === null) continue;
      if (Math.abs(inputNum - an) <= tolerance) return true;
    }
  }

  const ni = normalizeText(input);
  return answers.some((a) => normalizeText(a) === ni);
}

export function useQuiz(source: QuizSource): {
  state: QuizState;
  currentQuestion: Question;
  currentAnswerRecord: AnswerRecord | null;
  progress: number;
  stats: QuizStats | null;
  actions: QuizActions;
} {
  const questions = source.questions;

  const [quizState, setQuizState] = useState<QuizState>({
    currentIndex: 0,
    selectedAnswer: null,
    fillDraft: '',
    isSubmitted: false,
    showExplanation: false,
    answers: [],
    startTime: Date.now(),
    endTime: null,
    isComplete: false,
  });

  const currentQuestion = useMemo(
    () => questions[quizState.currentIndex] ?? EMPTY_QUESTION,
    [questions, quizState.currentIndex],
  );

  const currentAnswerRecord = useMemo((): AnswerRecord | null => {
    if (!quizState.isSubmitted) return null;
    const last = quizState.answers[quizState.answers.length - 1];
    if (!last) return null;
    if (last.questionId !== currentQuestion.id) return null;
    return last;
  }, [quizState.answers, quizState.isSubmitted, currentQuestion.id]);

  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return (
      ((quizState.currentIndex + (quizState.isSubmitted ? 1 : 0)) /
        questions.length) *
      100
    );
  }, [quizState.currentIndex, quizState.isSubmitted, questions.length]);

  const stats = useMemo((): QuizStats | null => {
    if (!quizState.isComplete) return null;
    const scoredTotal = quizState.answers.filter((a) => a.scored).length;
    const correct = quizState.answers.filter((a) => a.scored && a.correct).length;
    const endTime = quizState.endTime ?? Date.now();
    return {
      total: quizState.answers.length,
      scoredTotal,
      correct,
      accuracy:
        scoredTotal === 0 ? 0 : Math.round((correct / scoredTotal) * 100),
      duration: endTime - quizState.startTime,
    };
  }, [
    quizState.isComplete,
    quizState.answers,
    quizState.startTime,
    quizState.endTime,
  ]);

  const selectAnswer = useCallback(
    (key: AnswerKey) => {
      setQuizState((prev) => {
        if (prev.isSubmitted) return prev;
        const current = questions[prev.currentIndex];
        if (!current || current.type !== 'MCQ') return prev;
        return {
          ...prev,
          selectedAnswer: prev.selectedAnswer === key ? null : key,
        };
      });
    },
    [questions],
  );

  const setFillDraft = useCallback(
    (text: string) => {
      setQuizState((prev) => {
        if (prev.isSubmitted) return prev;
        const current = questions[prev.currentIndex];
        if (!current || current.type !== 'FILL') return prev;
        return { ...prev, fillDraft: text };
      });
    },
    [questions],
  );

  const submitAnswer = useCallback(() => {
    setQuizState((prev) => {
      if (prev.isSubmitted) return prev;
      const current = questions[prev.currentIndex];
      if (!current) return prev;

      if (current.type === 'MCQ') {
        if (prev.selectedAnswer === null) return prev;
        const isCorrect = prev.selectedAnswer === current.answer;
        return {
          ...prev,
          isSubmitted: true,
          showExplanation: true,
          answers: [
            ...prev.answers,
            {
              questionId: current.id,
              questionType: 'MCQ' as const,
              scored: true,
              correct: isCorrect,
              response: prev.selectedAnswer,
            },
          ],
        };
      }

      if (current.type === 'FILL') {
        const response = prev.fillDraft.trim();
        if (!response) return prev;
        const tolerance = current.tolerance ?? 0;
        const isCorrect = isFillCorrect(response, current.answers, tolerance);
        return {
          ...prev,
          isSubmitted: true,
          showExplanation: true,
          answers: [
            ...prev.answers,
            {
              questionId: current.id,
              questionType: 'FILL' as const,
              scored: true,
              correct: isCorrect,
              response,
            },
          ],
        };
      }

      return {
        ...prev,
        isSubmitted: true,
        showExplanation: true,
        answers: [
          ...prev.answers,
          {
            questionId: current.id,
            questionType: current.type,
            scored: false,
            correct: null,
          },
        ],
      };
    });
  }, [questions]);

  const nextQuestion = useCallback(() => {
    setQuizState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= questions.length) {
        return { ...prev, isComplete: true, endTime: Date.now() };
      }
      return {
        ...prev,
        currentIndex: nextIndex,
        selectedAnswer: null,
        fillDraft: '',
        isSubmitted: false,
        showExplanation: false,
      };
    });
  }, [questions.length]);

  const reset = useCallback(() => {
    setQuizState({
      currentIndex: 0,
      selectedAnswer: null,
      fillDraft: '',
      isSubmitted: false,
      showExplanation: false,
      answers: [],
      startTime: Date.now(),
      endTime: null,
      isComplete: false,
    });
  }, []);

  const actions = useMemo(
    () => ({ selectAnswer, setFillDraft, submitAnswer, nextQuestion, reset }),
    [selectAnswer, setFillDraft, submitAnswer, nextQuestion, reset],
  );

  return {
    state: quizState,
    currentQuestion,
    currentAnswerRecord,
    progress,
    stats,
    actions,
  };
}
