import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { useQuiz } from './hooks/useQuiz';
import type {
  CourseData,
  CourseSummary,
  QuizSource,
  QuestionType,
  QuizSessionRequest,
  QuizSessionResponse,
} from './types';
import Sidebar from './components/Sidebar';
import ProgressBar from './components/ProgressBar';
import QuizCard from './components/QuizCard';
import StatsPanel from './components/StatsPanel';
import FocusToggle from './components/FocusToggle';
import QuizSetupCard from './components/QuizSetupCard';
import { createQuizSession } from './api/quiz';
import {
  fetchCourse,
  fetchLibrarySummary,
  renameChapter,
  renameCourse,
  createCourse,
  deleteCourse,
  createChapter,
  deleteChapter,
} from './api/library';

const MAX_QUIZ_TOTAL = 50;

const DEFAULT_COUNTS_AUTO: Record<QuestionType, number> = {
  MCQ: 20, FILL: 0, ESSAY: 0, PROOF: 0,
};
const DEFAULT_COUNTS_HUMANITIES: Record<QuestionType, number> = {
  MCQ: 12, FILL: 0, ESSAY: 8, PROOF: 0,
};
const DEFAULT_COUNTS_STEM: Record<QuestionType, number> = {
  MCQ: 12, FILL: 6, ESSAY: 0, PROOF: 2,
};

export default function App() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CourseData | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const [quizSession, setQuizSession] = useState<QuizSessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const courseLoadSeq = useRef(0);

  const refreshLibrary = useCallback(async () => {
    setLibraryError(null);
    setIsLoadingLibrary(true);
    try {
      const summary = await fetchLibrarySummary();
      setCourses(summary.courses);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load library';
      setLibraryError(message);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const selectedChapter = useMemo(() => {
    if (!activeCourse || !activeChapterId) return null;
    return (
      activeCourse.chapters.find((ch) => ch.chapter_id === activeChapterId) ??
      null
    );
  }, [activeChapterId, activeCourse]);

  const quizTitle = useMemo(() => {
    if (!activeCourse) return '';
    if (!activeChapterId) return activeCourse.course_name;
    const chapterTitle = selectedChapter?.chapter_title ?? '';
    return chapterTitle
      ? `${activeCourse.course_name} / ${chapterTitle}`
      : activeCourse.course_name;
  }, [activeChapterId, activeCourse, selectedChapter?.chapter_title]);

  const quizQuestions = useMemo(
    () => quizSession?.questions ?? [],
    [quizSession],
  );

  const quizSource = useMemo(
    (): QuizSource => ({ title: quizTitle, questions: quizQuestions }),
    [quizTitle, quizQuestions],
  );

  const quiz = useQuiz(quizSource);

  const defaultTrack = useMemo<'auto' | 'humanities' | 'stem'>(() => {
    const track = activeCourse?.course_track ?? null;
    if (track === 'humanities' || track === 'stem') return track;
    return 'auto';
  }, [activeCourse?.course_track]);

  const defaultCounts = useMemo((): Record<QuestionType, number> => {
    const track = activeCourse?.course_track ?? null;
    if (track === 'humanities') return DEFAULT_COUNTS_HUMANITIES;
    if (track === 'stem') return DEFAULT_COUNTS_STEM;
    return DEFAULT_COUNTS_AUTO;
  }, [activeCourse?.course_track]);

  const handleStartSession = useCallback(
    async (req: QuizSessionRequest) => {
      setSessionError(null);
      setIsStartingSession(true);
      try {
        const session = await createQuizSession(req);
        setQuizSession(session);
        quiz.actions.reset();
        setActiveCourse((prev) =>
          prev ? { ...prev, course_track: session.course_track } : prev,
        );
        void refreshLibrary();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start quiz session';
        setSessionError(message);
      } finally {
        setIsStartingSession(false);
      }
    },
    [quiz.actions, refreshLibrary],
  );

  const handleSelectCourse = useCallback(
    async (courseId: string) => {
      quiz.actions.reset();
      setQuizSession(null);
      setSessionError(null);
      setIsStartingSession(false);

      setLibraryError(null);
      setActiveCourseId(courseId);
      setActiveChapterId(null);

      setActiveCourse(null);
      const seq = (courseLoadSeq.current += 1);
      try {
        const course = await fetchCourse(courseId);
        if (courseLoadSeq.current !== seq) return;
        setActiveCourse(course);
      } catch (err) {
        if (courseLoadSeq.current !== seq) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load course';
        setLibraryError(message);
      }
    },
    [quiz.actions],
  );

  const handleSelectChapter = useCallback(
    async (courseId: string, chapterId: string) => {
      quiz.actions.reset();
      setQuizSession(null);
      setSessionError(null);
      setIsStartingSession(false);

      setLibraryError(null);
      setActiveCourseId(courseId);
      setActiveChapterId(chapterId);

      if (activeCourse?.course_id === courseId) {
        return;
      }

      setActiveCourse(null);
      const seq = (courseLoadSeq.current += 1);
      try {
        const course = await fetchCourse(courseId);
        if (courseLoadSeq.current !== seq) return;
        setActiveCourse(course);
      } catch (err) {
        if (courseLoadSeq.current !== seq) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load course';
        setLibraryError(message);
      }
    },
    [activeCourse?.course_id, quiz.actions],
  );

  const handleChangeCourse = useCallback(() => {
    setActiveCourseId(null);
    setActiveChapterId(null);
    setActiveCourse(null);
    quiz.actions.reset();
  }, [quiz.actions]);

  const handleRenameCourse = useCallback(
    async (courseId: string, newName: string) => {
      const res = await renameCourse({ courseId, course_name: newName });
      setCourses(res.library.courses);
      if (activeCourse?.course_id === courseId) {
        setActiveCourse((prev) =>
          prev ? { ...prev, course_name: newName } : prev,
        );
      }
    },
    [activeCourse?.course_id],
  );

  const handleRenameChapter = useCallback(
    async (courseId: string, chapterId: string, newTitle: string) => {
      const res = await renameChapter({
        courseId,
        chapterId,
        chapter_title: newTitle,
      });
      setCourses(res.library.courses);

      if (activeCourse?.course_id === courseId) {
        setActiveCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            chapters: prev.chapters.map((ch) =>
              ch.chapter_id === chapterId
                ? { ...ch, chapter_title: newTitle }
                : ch,
            ),
          };
        });
      }
    },
    [activeCourse?.course_id],
  );

  const handleCreateCourse = useCallback(async (name: string) => {
    const res = await createCourse({ course_name: name });
    setCourses(res.library.courses);
  }, []);

  const handleDeleteCourse = useCallback(
    async (courseId: string) => {
      const res = await deleteCourse(courseId);
      setCourses(res.library.courses);
      if (activeCourseId === courseId) {
        setActiveCourseId(null);
        setActiveChapterId(null);
        setActiveCourse(null);
        quiz.actions.reset();
      }
    },
    [activeCourseId, quiz.actions],
  );

  const handleCreateChapter = useCallback(
    async (courseId: string, title: string) => {
      const res = await createChapter({ courseId, chapter_title: title });
      setCourses(res.library.courses);
      if (activeCourse?.course_id === courseId) {
        setActiveCourse((prev) => {
          if (!prev) return prev;
          const updatedChapter = res.course.chapters.find(
            (ch) => ch.chapter_title === title,
          );
          if (!updatedChapter) return prev;
          return {
            ...prev,
            chapters: [
              ...prev.chapters,
              {
                chapter_id: updatedChapter.chapter_id,
                chapter_title: updatedChapter.chapter_title,
                questions: [],
              },
            ],
          };
        });
      }
    },
    [activeCourse?.course_id],
  );

  const handleDeleteChapter = useCallback(
    async (courseId: string, chapterId: string) => {
      const res = await deleteChapter({ courseId, chapterId });
      setCourses(res.library.courses);
      if (activeCourse?.course_id === courseId) {
        setActiveCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            chapters: prev.chapters.filter((ch) => ch.chapter_id !== chapterId),
          };
        });
        if (activeChapterId === chapterId) {
          setActiveChapterId(null);
        }
      }
    },
    [activeChapterId, activeCourse?.course_id],
  );

  const handleToggleFocus = useCallback(() => {
    setIsFocused((prev) => !prev);
  }, []);

  // Focus toggle rendered via portal to document.body — works on all screens
  const hasSession = quizSession !== null && quizQuestions.length > 0;

  const focusToggle = (
    <FocusToggle isVisible={isFocused} onToggle={handleToggleFocus} />
  );

  // Welcome screen — no course selected
  if (!activeCourseId || !activeCourse) {
    return (
      <>
        {focusToggle}
        <div className="h-screen flex bg-slate-50">
          <Sidebar
            courses={courses}
            activeCourseId={activeCourseId}
            activeChapterId={activeChapterId}
            isFocused={isFocused}
            onSelectCourse={handleSelectCourse}
            onSelectChapter={handleSelectChapter}
            onToggleFocus={handleToggleFocus}
            onLibraryChanged={refreshLibrary}
            onRenameCourse={handleRenameCourse}
            onRenameChapter={handleRenameChapter}
            onCreateCourse={handleCreateCourse}
            onDeleteCourse={handleDeleteCourse}
            onCreateChapter={handleCreateChapter}
            onDeleteChapter={handleDeleteChapter}
          />
          <main className="flex-1 flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200">
                <GraduationCap size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Welcome to SmartReview
              </h2>
              <p className="text-slate-500 leading-relaxed">
                Select a course from the sidebar to start your self-review
                session. Track your progress, review explanations, and master
                the material.
              </p>

              {isLoadingLibrary && (
                <p className="mt-4 text-xs text-slate-400">Loading library…</p>
              )}
              {libraryError && (
                <p className="mt-4 text-xs text-rose-600 break-words">
                  {libraryError}
                </p>
              )}
            </motion.div>
          </main>
        </div>
      </>
    );
  }

  // Quiz in progress or stats
  return (
    <>
      {focusToggle}
      <div className="h-screen flex bg-slate-50">
        <Sidebar
          courses={courses}
          activeCourseId={activeCourseId}
          activeChapterId={activeChapterId}
          isFocused={isFocused}
          onSelectCourse={handleSelectCourse}
          onSelectChapter={handleSelectChapter}
          onToggleFocus={handleToggleFocus}
          onLibraryChanged={refreshLibrary}
          onRenameCourse={handleRenameCourse}
          onRenameChapter={handleRenameChapter}
          onCreateCourse={handleCreateCourse}
          onDeleteCourse={handleDeleteCourse}
          onCreateChapter={handleCreateChapter}
          onDeleteChapter={handleDeleteChapter}
        />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Top bar (only during active session) */}
          {hasSession && !quiz.state.isComplete && (
            <header className="h-16 shrink-0 flex items-center px-6 border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold text-slate-800 truncate">
                    {quizTitle}
                  </h1>
                  <p className="text-xs text-slate-400">Self-review</p>
                </div>
              </div>
              <ProgressBar
                current={quiz.state.currentIndex}
                total={quizQuestions.length}
                progress={quiz.progress}
              />
            </header>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {quiz.state.isComplete && quiz.stats ? (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <StatsPanel
                      stats={quiz.stats}
                      courseName={quizTitle}
                      onRetry={quiz.actions.reset}
                      onChangeCourse={handleChangeCourse}
                    />
                  </motion.div>
                ) : !hasSession ? (
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    {isFocused && (
                      <button
                        onClick={handleChangeCourse}
                        className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <ArrowLeft size={14} />
                        All Courses
                      </button>
                    )}

                    <QuizSetupCard
                      key={`${activeCourseId}:${activeChapterId ?? 'all'}`}
                      courseId={activeCourse!.course_id}
                      chapterId={activeChapterId}
                      defaultTrack={defaultTrack}
                      defaultCounts={defaultCounts}
                      maxTotal={MAX_QUIZ_TOTAL}
                      isStarting={isStartingSession}
                      error={sessionError}
                      onStart={handleStartSession}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={quiz.state.currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    {isFocused && (
                      <button
                        onClick={handleChangeCourse}
                        className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <ArrowLeft size={14} />
                        All Courses
                      </button>
                    )}
                    <QuizCard
                      question={quiz.currentQuestion}
                      selectedAnswer={quiz.state.selectedAnswer}
                      fillDraft={quiz.state.fillDraft}
                      isSubmitted={quiz.state.isSubmitted}
                      showExplanation={quiz.state.showExplanation}
                      answerRecord={quiz.currentAnswerRecord}
                      isLastQuestion={
                        quiz.state.currentIndex === quizQuestions.length - 1
                      }
                      onSelect={quiz.actions.selectAnswer}
                      onFillDraftChange={quiz.actions.setFillDraft}
                      onSubmit={quiz.actions.submitAnswer}
                      onNext={quiz.actions.nextQuestion}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
