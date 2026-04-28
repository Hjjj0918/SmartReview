export interface Question {
  id: number;
  type: 'MCQ';
  question: string;
  options: Record<AnswerKey, string>;
  answer: AnswerKey;
  explanation: string;
}

export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface CourseData {
  course_name: string;
  questions: Question[];
}

export interface AnswerRecord {
  questionId: number;
  selected: AnswerKey;
  correct: boolean;
}

export interface QuizStats {
  total: number;
  correct: number;
  accuracy: number;
  duration: number; // ms
}
