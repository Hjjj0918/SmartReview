import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { getCourseList, getCourseByName } from './data/courses';
import { useQuiz } from './hooks/useQuiz';
import type { CourseData } from './types';
import Sidebar from './components/Sidebar';
import ProgressBar from './components/ProgressBar';
import QuizCard from './components/QuizCard';
import StatsPanel from './components/StatsPanel';
import FocusToggle from './components/FocusToggle';

export default function App() {
  const courses = getCourseList();
  const [activeCourseName, setActiveCourseName] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const quiz = useQuiz(
    courseData ?? { course_name: '', questions: [] }
  );

  const handleSelectCourse = useCallback((name: string) => {
    const data = getCourseByName(name);
    if (data) {
      setActiveCourseName(name);
      setCourseData(data);
    }
  }, []);

  const handleChangeCourse = useCallback(() => {
    setActiveCourseName(null);
    setCourseData(null);
  }, []);

  const handleToggleFocus = useCallback(() => {
    setIsFocused((prev) => !prev);
  }, []);

  // Welcome screen — no course selected
  if (!activeCourseName || !courseData) {
    return (
      <div className="h-screen flex bg-slate-50">
        <Sidebar
          courses={courses}
          activeCourse=""
          isFocused={isFocused}
          onSelectCourse={handleSelectCourse}
          onToggleFocus={handleToggleFocus}
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
        activeCourse={activeCourseName}
        isFocused={isFocused}
        onSelectCourse={handleSelectCourse}
        onToggleFocus={handleToggleFocus}
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
                  {activeCourseName}
                </h1>
                <p className="text-xs text-slate-400">Self-review</p>
              </div>
            </div>
            <ProgressBar
              current={quiz.state.currentIndex}
              total={courseData.questions.length}
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
                    courseName={activeCourseName}
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
                      courseData.questions.length - 1
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
