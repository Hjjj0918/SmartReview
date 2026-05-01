export interface Question {
  id: number;
  type: 'MCQ';
  question: string;
  options: Record<AnswerKey, string>;
  answer: AnswerKey;
  explanation: string;
}

export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface ChapterData {
  chapter_id: string;
  chapter_title: string;
  questions: Question[];
}

export interface CourseData {
  schema_version?: number;
  course_id: string;
  course_name: string;
  chapters: ChapterData[];
}

export interface ChapterSummary {
  chapter_id: string;
  chapter_title: string;
  question_count: number;
}

export interface CourseSummary {
  course_id: string;
  course_name: string;
  question_count: number;
  chapters: ChapterSummary[];
}

export interface LibrarySummary {
  courses: CourseSummary[];
}

export interface ImportTextResult {
  course_id: string;
  course_name: string;
  chapter_id: string;
  chapter_title: string;
  added_question_count: number;
  course_question_count: number;
  chapter_question_count: number;
  library: LibrarySummary;
}

export interface QuizSource {
  title: string;
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
