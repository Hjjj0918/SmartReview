import { useState, useCallback, useMemo } from 'react';
import type { CourseData, Question, AnswerKey, AnswerRecord, QuizStats } from '../types';

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

export function useQuiz(course: CourseData): {
  state: QuizState;
  currentQuestion: Question;
  progress: number;
  stats: QuizStats | null;
  actions: QuizActions;
} {
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
    () => course.questions[quizState.currentIndex],
    [course.questions, quizState.currentIndex]
  );

  const progress = useMemo(
    () => ((quizState.currentIndex + (quizState.isSubmitted ? 1 : 0)) / course.questions.length) * 100,
    [quizState.currentIndex, quizState.isSubmitted, course.questions.length]
  );

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
  }, [quizState.isComplete, quizState.answers, quizState.startTime, quizState.endTime]);

  const selectAnswer = useCallback((key: AnswerKey) => {
    setQuizState((prev) => {
      if (prev.isSubmitted) return prev;
      return { ...prev, selectedAnswer: prev.selectedAnswer === key ? null : key };
    });
  }, []);

  const submitAnswer = useCallback(() => {
    setQuizState((prev) => {
      if (prev.isSubmitted || prev.selectedAnswer === null) return prev;
      const isCorrect = prev.selectedAnswer === course.questions[prev.currentIndex].answer;
      return {
        ...prev,
        isSubmitted: true,
        showExplanation: true,
        answers: [
          ...prev.answers,
          {
            questionId: course.questions[prev.currentIndex].id,
            selected: prev.selectedAnswer,
            correct: isCorrect,
          },
        ],
      };
    });
  }, [course.questions]);

  const nextQuestion = useCallback(() => {
    setQuizState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= course.questions.length) {
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
  }, [course.questions.length]);

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
    [selectAnswer, submitAnswer, nextQuestion, reset]
  );

  return { state: quizState, currentQuestion, progress, stats, actions };
}
