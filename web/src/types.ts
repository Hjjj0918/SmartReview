export type QuestionType = 'MCQ' | 'FILL' | 'ESSAY' | 'PROOF';

export interface BaseQuestion {
  id: number;
  type: QuestionType;
  question: string;
}

export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface MCQQuestion extends BaseQuestion {
  type: 'MCQ';
  options: Record<AnswerKey, string>;
  answer: AnswerKey;
  explanation: string;
}

export interface FillQuestion extends BaseQuestion {
  type: 'FILL';
  answers: string[];
  tolerance?: number;
  explanation?: string;
}

export interface EssayQuestion extends BaseQuestion {
  type: 'ESSAY';
  answer: string;
}

export interface ProofQuestion extends BaseQuestion {
  type: 'PROOF';
  answer: string;
}

export type Question = MCQQuestion | FillQuestion | EssayQuestion | ProofQuestion;

export interface ChapterData {
  chapter_id: string;
  chapter_title: string;
  questions: Question[];
}

export interface CourseData {
  schema_version?: number;
  course_id: string;
  course_name: string;
  course_track?: 'humanities' | 'stem' | null;
  course_track_source?: 'auto' | 'manual' | null;
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
  questionType: QuestionType;
  scored: boolean;
  correct: boolean | null;
  response?: string;
}

export interface QuizStats {
  total: number;
  scoredTotal: number;
  correct: number;
  accuracy: number;
  duration: number;
}

export interface QuizSessionRequest {
  courseId: string;
  chapterId: string | null;
  courseTrack: 'auto' | 'humanities' | 'stem';
  counts: Record<QuestionType, number>;
}

export interface QuizSessionResponse {
  course_id: string;
  chapter_id: string | null;
  course_track: 'humanities' | 'stem';
  seed_date: string;
  seed_hash: string;
  questions: Question[];
}
