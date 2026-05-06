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
  isSubmitted: boolean;
  showExplanation: boolean;
  answers: AnswerRecord[];
  startTime: number;
  endTime: number | null;
  isComplete: boolean;
}

export interface QuizActions {
  selectAnswer: (key: AnswerKey) => void;
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

export function useQuiz(source: QuizSource): {
  state: QuizState;
  currentQuestion: Question;
  progress: number;
  stats: QuizStats | null;
  actions: QuizActions;
} {
  const questions = source.questions;

  const [quizState, setQuizState] = useState<QuizState>({
    currentIndex: 0,
    selectedAnswer: null,
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
    const correct = quizState.answers.filter((a) => a.correct).length;
    const endTime = quizState.endTime ?? Date.now();
    return {
      total: quizState.answers.length,
      correct,
      accuracy: Math.round((correct / quizState.answers.length) * 100),
      duration: endTime - quizState.startTime,
    };
  }, [
    quizState.isComplete,
    quizState.answers,
    quizState.startTime,
    quizState.endTime,
  ]);

  const selectAnswer = useCallback((key: AnswerKey) => {
    setQuizState((prev) => {
      if (prev.isSubmitted) return prev;
      return {
        ...prev,
        selectedAnswer: prev.selectedAnswer === key ? null : key,
      };
    });
  }, []);

  const submitAnswer = useCallback(() => {
    setQuizState((prev) => {
      if (prev.isSubmitted || prev.selectedAnswer === null) return prev;
      const current = questions[prev.currentIndex];
      if (!current) return prev;
      const isCorrect = prev.selectedAnswer === current.answer;
      return {
        ...prev,
        isSubmitted: true,
        showExplanation: true,
        answers: [
          ...prev.answers,
          {
            questionId: current.id,
            selected: prev.selectedAnswer,
            correct: isCorrect,
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
        isSubmitted: false,
        showExplanation: false,
      };
    });
  }, [questions.length]);

  const reset = useCallback(() => {
    setQuizState({
      currentIndex: 0,
      selectedAnswer: null,
      isSubmitted: false,
      showExplanation: false,
      answers: [],
      startTime: Date.now(),
      endTime: null,
      isComplete: false,
    });
  }, []);

  const actions = useMemo(
    () => ({ selectAnswer, submitAnswer, nextQuestion, reset }),
    [selectAnswer, submitAnswer, nextQuestion, reset],
  );

  return { state: quizState, currentQuestion, progress, stats, actions };
}
