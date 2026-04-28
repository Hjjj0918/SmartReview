import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  PanelLeftClose,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';

interface CourseInfo {
  name: string;
  questionCount: number;
}

interface SidebarProps {
  courses: CourseInfo[];
  activeCourse: string;
  isFocused: boolean;
  onSelectCourse: (name: string) => void;
  onToggleFocus: () => void;
}

export default function Sidebar({
  courses,
  activeCourse,
  isFocused,
  onSelectCourse,
  onToggleFocus,
}: SidebarProps) {
  return (
    <AnimatePresence initial={false}>
      {!isFocused && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden"
        >
          {/* Logo */}
          <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                SmartReview
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">V2 Web</p>
            </div>
          </div>

          {/* Course list */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <p className="px-2 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Courses
            </p>
            {courses.map((course) => {
              const isActive = course.name === activeCourse;
              return (
                <motion.button
                  key={course.name}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectCourse(course.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors duration-150 flex items-center justify-between group ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen
                      size={16}
                      className={`shrink-0 ${
                        isActive ? 'text-indigo-500' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-sm font-medium truncate">
                      {course.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs tabular-nums ${
                        isActive ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    >
                      {course.questionCount}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`transition-opacity ${
                        isActive ? 'text-indigo-400 opacity-100' : 'opacity-0 group-hover:opacity-100'
                      } text-slate-300`}
                    />
                  </div>
                </motion.button>
              );
            })}
          </nav>

          {/* Focus mode toggle */}
          <div className="p-3 border-t border-slate-100">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onToggleFocus}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <PanelLeftClose size={14} />
              Focus Mode
            </motion.button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
