import type {
  CourseData,
  CourseSummary,
  ImportTextResult,
  LibrarySummary,
} from '../types';

import { readApiErrorMessage } from './request';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    const message = await readApiErrorMessage(resp);
    throw new Error(message);
  }
  return (await resp.json()) as T;
}

export async function fetchLibrarySummary(): Promise<LibrarySummary> {
  return requestJson<LibrarySummary>('/api/library/courses');
}

export async function fetchCourse(courseId: string): Promise<CourseData> {
  return requestJson<CourseData>(
    `/api/library/course/${encodeURIComponent(courseId)}`,
  );
}

export async function importLectureText(params: {
  fileContent: string;
  questionCount: number;
}): Promise<ImportTextResult> {
  return requestJson<ImportTextResult>('/api/library/import-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function renameCourse(params: {
  courseId: string;
  course_name: string;
}): Promise<{ course: CourseSummary; library: LibrarySummary }> {
  const { courseId, course_name } = params;
  return requestJson<{ course: CourseSummary; library: LibrarySummary }>(
    `/api/library/course/${encodeURIComponent(courseId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_name }),
    },
  );
}

export async function renameChapter(params: {
  courseId: string;
  chapterId: string;
  chapter_title: string;
}): Promise<{ course: CourseSummary; library: LibrarySummary }> {
  const { courseId, chapterId, chapter_title } = params;
  return requestJson<{ course: CourseSummary; library: LibrarySummary }>(
    `/api/library/course/${encodeURIComponent(courseId)}/chapter/${encodeURIComponent(chapterId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_title }),
    },
  );
}

export async function createCourse(params: {
  course_name: string;
}): Promise<{ course: CourseSummary; library: LibrarySummary }> {
  return requestJson<{ course: CourseSummary; library: LibrarySummary }>(
    '/api/library/courses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
  );
}

export async function deleteCourse(
  courseId: string,
): Promise<{ library: LibrarySummary }> {
  return requestJson<{ library: LibrarySummary }>(
    `/api/library/course/${encodeURIComponent(courseId)}`,
    { method: 'DELETE' },
  );
}

export async function createChapter(params: {
  courseId: string;
  chapter_title: string;
}): Promise<{ course: CourseSummary; library: LibrarySummary }> {
  const { courseId, chapter_title } = params;
  return requestJson<{ course: CourseSummary; library: LibrarySummary }>(
    `/api/library/course/${encodeURIComponent(courseId)}/chapters`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_title }),
    },
  );
}

export async function deleteChapter(params: {
  courseId: string;
  chapterId: string;
}): Promise<{ course: CourseSummary; library: LibrarySummary }> {
  const { courseId, chapterId } = params;
  return requestJson<{ course: CourseSummary; library: LibrarySummary }>(
    `/api/library/course/${encodeURIComponent(courseId)}/chapter/${encodeURIComponent(chapterId)}`,
    { method: 'DELETE' },
  );
}
