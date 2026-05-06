export type ApiErrorBody = {
  error?: {
    message?: unknown;
    status_code?: unknown;
    details?: unknown;
  };
  detail?: unknown;
  message?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function extractApiErrorMessage(body: unknown): string | null {
  const str = asNonEmptyString(body);
  if (str) return str;

  if (body && typeof body === 'object') {
    const obj = body as ApiErrorBody;

    const nested = asNonEmptyString(obj?.error?.message);
    if (nested) return nested;

    const detail = asNonEmptyString(obj?.detail);
    if (detail) return detail;

    const message = asNonEmptyString(obj?.message);
    if (message) return message;
  }

  return null;
}

export async function readApiErrorMessage(resp: Response): Promise<string> {
  const fallback = `Request failed (${resp.status})`;

  let text: string;
  try {
    text = await resp.text();
  } catch {
    return fallback;
  }

  const direct = asNonEmptyString(text);
  if (!direct) return fallback;

  try {
    const parsed = JSON.parse(text) as unknown;
    return extractApiErrorMessage(parsed) ?? direct;
  } catch {
    return direct;
  }
}
