import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  PanelLeftClose,
  GraduationCap,
} from 'lucide-react';
import LectureTools from './LectureTools';
import type { CourseSummary } from '../types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

interface SidebarProps {
  courses: CourseSummary[];
  activeCourseId: string | null;
  activeChapterId: string | null;
  isFocused: boolean;
  onSelectCourse: (courseId: string) => void;
  onSelectChapter: (courseId: string, chapterId: string) => void;
  onToggleFocus: () => void;
  onLibraryChanged: () => void;
  onRenameCourse: (courseId: string, newName: string) => Promise<void>;
  onRenameChapter: (
    courseId: string,
    chapterId: string,
    newTitle: string
  ) => Promise<void>;
}

export default function Sidebar({
  courses,
  activeCourseId,
  activeChapterId,
  isFocused,
  onSelectCourse,
  onSelectChapter,
  onToggleFocus,
  onLibraryChanged,
  onRenameCourse,
  onRenameChapter,
}: SidebarProps) {
  const [editing, setEditing] = React.useState<
    | { type: 'course'; courseId: string }
    | { type: 'chapter'; courseId: string; chapterId: string }
    | null
  >(null);
  const [draft, setDraft] = React.useState('');
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [isRenaming, setIsRenaming] = React.useState(false);

  const startEditCourse = React.useCallback((courseId: string, current: string) => {
    setRenameError(null);
    setEditing({ type: 'course', courseId });
    setDraft(current);
  }, []);

  const startEditChapter = React.useCallback(
    (courseId: string, chapterId: string, current: string) => {
      setRenameError(null);
      setEditing({ type: 'chapter', courseId, chapterId });
      setDraft(current);
    },
    []
  );

  const cancelEdit = React.useCallback(() => {
    setEditing(null);
    setDraft('');
    setRenameError(null);
  }, []);

  const commitEdit = React.useCallback(async () => {
    if (!editing) return;
    const next = draft.trim();
    if (!next) {
      setRenameError('名称不能为空');
      return;
    }

    setIsRenaming(true);
    setRenameError(null);
    try {
      if (editing.type === 'course') {
        await onRenameCourse(editing.courseId, next);
      } else {
        await onRenameChapter(editing.courseId, editing.chapterId, next);
      }
      cancelEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : '重命名失败';
      setRenameError(message);
    } finally {
      setIsRenaming(false);
    }
  }, [cancelEdit, draft, editing, onRenameChapter, onRenameCourse]);

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
            <Accordion type="multiple" className="space-y-1">
              {courses.map((course) => {
                const isActiveCourse = course.course_id === activeCourseId;

                return (
                  <AccordionItem
                    key={course.course_id}
                    value={course.course_id}
                    className="border border-slate-100 rounded-xl bg-white"
                  >
                    <AccordionTrigger
                      onClick={() => onSelectCourse(course.course_id)}
                      className={
                        isActiveCourse
                          ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50'
                          : 'text-slate-600'
                      }
                    >
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BookOpen
                            size={16}
                            className={
                              isActiveCourse
                                ? 'text-indigo-500 shrink-0'
                                : 'text-slate-400 shrink-0'
                            }
                          />

                          {editing?.type === 'course' &&
                          editing.courseId === course.course_id ? (
                            <input
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void commitEdit();
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEdit();
                                }
                              }}
                              disabled={isRenaming}
                              className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-sm font-medium truncate"
                              title="双击重命名"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                startEditCourse(course.course_id, course.course_name);
                              }}
                            >
                              {course.course_name}
                            </span>
                          )}
                        </div>

                        <span
                          className={
                            isActiveCourse
                              ? 'text-xs tabular-nums text-indigo-400'
                              : 'text-xs tabular-nums text-slate-400'
                          }
                        >
                          {course.question_count}
                        </span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="space-y-1 pb-1">
                        {course.chapters.map((ch) => {
                          const isActiveChapter =
                            isActiveCourse && ch.chapter_id === activeChapterId;

                          return (
                            <button
                              key={ch.chapter_id}
                              type="button"
                              onClick={() =>
                                onSelectChapter(course.course_id, ch.chapter_id)
                              }
                              className={
                                'w-full rounded-lg px-2 py-2 text-left text-xs transition-colors flex items-center justify-between gap-2 ' +
                                (isActiveChapter
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'text-slate-600 hover:bg-slate-50')
                              }
                            >
                              <div className="min-w-0 flex-1">
                                {editing?.type === 'chapter' &&
                                editing.courseId === course.course_id &&
                                editing.chapterId === ch.chapter_id ? (
                                  <input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void commitEdit();
                                      }
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelEdit();
                                      }
                                    }}
                                    disabled={isRenaming}
                                    className="h-7 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className="truncate block"
                                    title="双击重命名"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      startEditChapter(
                                        course.course_id,
                                        ch.chapter_id,
                                        ch.chapter_title
                                      );
                                    }}
                                  >
                                    {ch.chapter_title}
                                  </span>
                                )}
                              </div>

                              <span
                                className={
                                  isActiveChapter
                                    ? 'text-xs tabular-nums text-indigo-400'
                                    : 'text-xs tabular-nums text-slate-400'
                                }
                              >
                                {ch.question_count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {renameError && (
                        <p className="mt-1 text-xs text-rose-600 break-words">
                          {renameError}
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </nav>

          {/* Lecture upload + AI chat */}
          <div className="p-3 border-t border-slate-100">
            <LectureTools onLibraryChanged={onLibraryChanged} />
          </div>

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
