import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { useQuiz } from './hooks/useQuiz';
import type { CourseData, CourseSummary, QuizSource } from './types';
import Sidebar from './components/Sidebar';
import ProgressBar from './components/ProgressBar';
import QuizCard from './components/QuizCard';
import StatsPanel from './components/StatsPanel';
import FocusToggle from './components/FocusToggle';
import {
  fetchCourse,
  fetchLibrarySummary,
  renameChapter,
  renameCourse,
} from './api/library';

export default function App() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CourseData | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const courseLoadSeq = useRef(0);

  const refreshLibrary = useCallback(async () => {
    setLibraryError(null);
    setIsLoadingLibrary(true);
    try {
      const summary = await fetchLibrarySummary();
      setCourses(summary.courses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load library';
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
    return activeCourse.chapters.find((ch) => ch.chapter_id === activeChapterId) ?? null;
  }, [activeChapterId, activeCourse]);

  const selectedQuestions = useMemo(() => {
    if (!activeCourse) return [];
    if (!activeChapterId) {
      return activeCourse.chapters.flatMap((ch) => ch.questions);
    }
    return selectedChapter?.questions ?? [];
  }, [activeChapterId, activeCourse, selectedChapter]);

  const quizTitle = useMemo(() => {
    if (!activeCourse) return '';
    if (!activeChapterId) return activeCourse.course_name;
    const chapterTitle = selectedChapter?.chapter_title ?? '';
    return chapterTitle
      ? `${activeCourse.course_name} / ${chapterTitle}`
      : activeCourse.course_name;
  }, [activeChapterId, activeCourse, selectedChapter?.chapter_title]);

  const quizSource = useMemo(
    (): QuizSource => ({ title: quizTitle, questions: selectedQuestions }),
    [quizTitle, selectedQuestions]
  );

  const quiz = useQuiz(quizSource);

  const handleSelectCourse = useCallback(
    async (courseId: string) => {
      quiz.actions.reset();

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
        const message = err instanceof Error ? err.message : 'Failed to load course';
        setLibraryError(message);
      }
    },
    [quiz.actions]
  );

  const handleSelectChapter = useCallback(
    async (courseId: string, chapterId: string) => {
      quiz.actions.reset();

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
        const message = err instanceof Error ? err.message : 'Failed to load course';
        setLibraryError(message);
      }
    },
    [activeCourse?.course_id, quiz.actions]
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
        setActiveCourse((prev) => (prev ? { ...prev, course_name: newName } : prev));
      }
    },
    [activeCourse?.course_id]
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
                : ch
            ),
          };
        });
      }
    },
    [activeCourse?.course_id]
  );

  const handleToggleFocus = useCallback(() => {
    setIsFocused((prev) => !prev);
  }, []);

  // Welcome screen — no course selected
  if (!activeCourseId || !activeCourse) {
    return (
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
              session. Track your progress, review explanations, and master the
              material.
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
    );
  }

  // Quiz in progress or stats
  return (
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
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        {!quiz.state.isComplete && (
          <header className="h-16 shrink-0 flex items-center px-6 border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isFocused && (
                <FocusToggle
                  isFocused={isFocused}
                  onToggle={handleToggleFocus}
                />
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-800 truncate">
                  {quizTitle}
                </h1>
                <p className="text-xs text-slate-400">Self-review</p>
              </div>
            </div>
            <ProgressBar
              current={quiz.state.currentIndex}
              total={selectedQuestions.length}
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
              ) : (
                <motion.div
                  key={quiz.state.currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  {/* Course back button (shown when question area is visible) */}
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
                    isSubmitted={quiz.state.isSubmitted}
                    showExplanation={quiz.state.showExplanation}
                    isLastQuestion={
                      quiz.state.currentIndex ===
                      selectedQuestions.length - 1
                    }
                    onSelect={quiz.actions.selectAnswer}
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
  );
}
