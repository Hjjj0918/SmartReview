import type { QuizSessionRequest, QuizSessionResponse } from '../types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Request failed (${resp.status})`);
  }
  return (await resp.json()) as T;
}

export async function createQuizSession(
  req: QuizSessionRequest,
): Promise<QuizSessionResponse> {
  return requestJson<QuizSessionResponse>('/api/quiz/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}
