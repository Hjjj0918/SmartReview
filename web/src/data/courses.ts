import type { CourseData } from '../types';

import algoQuestions from './questions/COMP3251 - Algorithm Design/questions.json';
import mlQuestions from './questions/Machine Learning/questions.json';

const courses: CourseData[] = [
  algoQuestions as CourseData,
  mlQuestions as CourseData,
];

export function getCourses(): CourseData[] {
  return courses;
}

export function getCourseByName(name: string): CourseData | undefined {
  return courses.find(
    (c) => c.course_name.toLowerCase() === name.toLowerCase()
  );
}

export function getCourseList(): { name: string; questionCount: number }[] {
  return courses.map((c) => ({
    name: c.course_name,
    questionCount: c.questions.length,
  }));
}
