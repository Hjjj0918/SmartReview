import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  PanelLeftClose,
  GraduationCap,
  Pencil,
  Plus,
} from 'lucide-react';
import LectureTools from './LectureTools';
import ContextMenu from './ContextMenu';
import type { MenuItem } from './ContextMenu';
import ConfirmDialog from './ConfirmDialog';
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
  onCreateCourse: (name: string) => Promise<void>;
  onDeleteCourse: (courseId: string) => Promise<void>;
  onCreateChapter: (courseId: string, title: string) => Promise<void>;
  onDeleteChapter: (courseId: string, chapterId: string) => Promise<void>;
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
  onCreateCourse,
  onDeleteCourse,
  onCreateChapter,
  onDeleteChapter,
}: SidebarProps) {
  // --- Rename state ---
  const [editing, setEditing] = React.useState<
    | { type: 'course'; courseId: string }
    | { type: 'chapter'; courseId: string; chapterId: string }
    | null
  >(null);
  const [draft, setDraft] = React.useState('');
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [isRenaming, setIsRenaming] = React.useState(false);

  // --- New item state ---
  const [newItem, setNewItem] = React.useState<
    | { kind: 'course' }
    | { kind: 'chapter'; courseId: string }
    | null
  >(null);
  const [newName, setNewName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  // --- Confirm dialog ---
  const [confirm, setConfirm] = React.useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  // ---- Rename helpers ----
  const startEditCourse = React.useCallback((courseId: string, current: string) => {
    setNewItem(null);
    setRenameError(null);
    setEditing({ type: 'course', courseId });
    setDraft(current);
  }, []);

  const startEditChapter = React.useCallback(
    (courseId: string, chapterId: string, current: string) => {
      setNewItem(null);
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

  // ---- Create helpers ----
  const startCreateCourse = React.useCallback(() => {
    setEditing(null);
    setNewItem({ kind: 'course' });
    setNewName('');
    setRenameError(null);
  }, []);

  const startCreateChapter = React.useCallback((courseId: string) => {
    setEditing(null);
    setNewItem({ kind: 'chapter', courseId });
    setNewName('');
    setRenameError(null);
  }, []);

  const cancelCreate = React.useCallback(() => {
    setNewItem(null);
    setNewName('');
  }, []);

  const commitCreate = React.useCallback(async () => {
    if (!newItem) return;
    const name = newName.trim();
    if (!name) return;

    setRenameError(null);
    setCreating(true);
    try {
      if (newItem.kind === 'course') {
        await onCreateCourse(name);
      } else {
        await onCreateChapter(newItem.courseId, name);
      }
      cancelCreate();
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建失败';
      setRenameError(message);
    } finally {
      setCreating(false);
    }
  }, [newItem, newName, onCreateCourse, onCreateChapter, cancelCreate]);

  // ---- Delete helpers ----
  const requestDeleteCourse = React.useCallback(
    (courseId: string, courseName: string) => {
      setConfirmError(null);
      setConfirm({
        title: '删除课程',
        message: `确定删除「${courseName}」？此操作不可撤销，课程下所有章节和题目将被永久删除。`,
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            await onDeleteCourse(courseId);
            setConfirm(null);
          } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            setConfirmError(message);
          } finally {
            setIsDeleting(false);
          }
        },
      });
    },
    [onDeleteCourse]
  );

  const requestDeleteChapter = React.useCallback(
    (courseId: string, chapterId: string, chapterTitle: string) => {
      setConfirmError(null);
      setConfirm({
        title: '删除章节',
        message: `确定删除「${chapterTitle}」？此操作不可撤销，章节下所有题目将被永久删除。`,
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            await onDeleteChapter(courseId, chapterId);
            setConfirm(null);
          } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            setConfirmError(message);
          } finally {
            setIsDeleting(false);
          }
        },
      });
    },
    [onDeleteChapter]
  );

  // ---- Inline edit input (shared) ----
  function renderInlineInput(
    value: string,
    onChange: (val: string) => void,
    onCommit: () => void,
    onCancel: () => void,
    loading: boolean,
    placeholder: string,
    inputClassName = ''
  ) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={onCancel}
        disabled={loading}
        placeholder={placeholder}
        className={`w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${inputClassName}`}
        autoFocus
        onFocus={(e) => e.target.select()}
      />
    );
  }

  return (
    <>
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
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Courses
              </p>
            </div>

            <Accordion type="multiple" className="space-y-1">
              {courses.map((course) => {
                const isActiveCourse = course.course_id === activeCourseId;
                const isEditingCourse =
                  editing?.type === 'course' && editing.courseId === course.course_id;

                // Course-level menu items
                const courseMenuItems: MenuItem[] = [
                  {
                    label: '重命名',
                    onClick: () => startEditCourse(course.course_id, course.course_name),
                  },
                  {
                    label: '新建章节',
                    onClick: () => startCreateChapter(course.course_id),
                  },
                  {
                    label: '删除课程',
                    danger: true,
                    onClick: () =>
                      requestDeleteCourse(course.course_id, course.course_name),
                  },
                ];

                return (
                  <AccordionItem
                    key={course.course_id}
                    value={course.course_id}
                    className="border border-slate-100 rounded-xl bg-white group/course"
                  >
                    <AccordionTrigger
                      onClick={() => onSelectCourse(course.course_id)}
                      className={
                        isActiveCourse
                          ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50'
                          : 'text-slate-600'
                      }
                    >
                      <div className="flex items-center justify-between gap-3 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <BookOpen
                            size={16}
                            className={
                              isActiveCourse
                                ? 'text-indigo-500 shrink-0'
                                : 'text-slate-400 shrink-0'
                            }
                          />

                          {isEditingCourse ? (
                            <div className="flex-1 min-w-0">
                              {renderInlineInput(
                                draft,
                                setDraft,
                                commitEdit,
                                cancelEdit,
                                isRenaming,
                                '输入课程名称',
                                'h-8'
                              )}
                            </div>
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

                        {/* Hover action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/course:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditCourse(course.course_id, course.course_name);
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                            title="重命名"
                          >
                            <Pencil size={12} />
                          </button>
                          <ContextMenu items={courseMenuItems} />
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="space-y-1 pb-1">
                        {course.chapters.map((ch) => {
                          const isActiveChapter =
                            isActiveCourse && ch.chapter_id === activeChapterId;
                          const isEditingChapter =
                            editing?.type === 'chapter' &&
                            editing.courseId === course.course_id &&
                            editing.chapterId === ch.chapter_id;

                          // Chapter-level menu items
                          const chapterMenuItems: MenuItem[] = [
                            {
                              label: '重命名',
                              onClick: () =>
                                startEditChapter(
                                  course.course_id,
                                  ch.chapter_id,
                                  ch.chapter_title
                                ),
                            },
                            {
                              label: '删除章节',
                              danger: true,
                              onClick: () =>
                                requestDeleteChapter(
                                  course.course_id,
                                  ch.chapter_id,
                                  ch.chapter_title
                                ),
                            },
                          ];

                          return (
                            <button
                              key={ch.chapter_id}
                              type="button"
                              onClick={() =>
                                onSelectChapter(course.course_id, ch.chapter_id)
                              }
                              className={
                                'group/chapter w-full rounded-lg px-2 py-2 text-left text-xs transition-colors flex items-center justify-between gap-2 ' +
                                (isActiveChapter
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'text-slate-600 hover:bg-slate-50')
                              }
                            >
                              <div className="min-w-0 flex-1">
                                {isEditingChapter ? (
                                  renderInlineInput(
                                    draft,
                                    setDraft,
                                    commitEdit,
                                    cancelEdit,
                                    isRenaming,
                                    '输入章节名称',
                                    'h-7'
                                  )
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

                              {/* Hover action buttons */}
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/chapter:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditChapter(
                                      course.course_id,
                                      ch.chapter_id,
                                      ch.chapter_title
                                    );
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                                  title="重命名"
                                >
                                  <Pencil size={11} />
                                </button>
                                <ContextMenu items={chapterMenuItems} />
                              </div>
                            </button>
                          );
                        })}

                        {/* New chapter inline input */}
                        {newItem?.kind === 'chapter' &&
                          newItem.courseId === course.course_id && (
                            <div className="px-2 py-1">
                              {renderInlineInput(
                                newName,
                                setNewName,
                                commitCreate,
                                cancelCreate,
                                creating,
                                '新章节名称',
                                'h-7'
                              )}
                            </div>
                          )}

                        {/* + New chapter button */}
                        {newItem?.kind !== 'chapter' ||
                          newItem.courseId !== course.course_id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startCreateChapter(course.course_id);
                            }}
                            className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-colors"
                          >
                            <Plus size={12} />
                            新建章节
                          </button>
                        ) : null}
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

              {/* New course inline input */}
              {newItem?.kind === 'course' && (
                <div className="px-1 py-1">
                  {renderInlineInput(
                    newName,
                    setNewName,
                    commitCreate,
                    cancelCreate,
                    creating,
                    '新课程名称',
                    'h-8'
                  )}
                </div>
              )}
            </Accordion>

            {/* + New course button */}
            {newItem?.kind !== 'course' && (
              <button
                type="button"
                onClick={startCreateCourse}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              >
                <Plus size={13} />
                新建课程
              </button>
            )}
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

    {/* Confirm dialog — rendered outside AnimatePresence so it always works */}
    <ConfirmDialog
      open={confirm !== null}
      title={confirm?.title ?? ''}
      message={
        confirmError
          ? `${confirm?.message ?? ''}\n\n错误：${confirmError}`
          : (confirm?.message ?? '')
      }
      confirmLabel={confirmError ? '重试' : '删除'}
      danger
      loading={isDeleting}
      onConfirm={() => void confirm?.onConfirm()}
      onCancel={() => {
        setConfirm(null);
        setConfirmError(null);
      }}
    />
    </>
  );
}
