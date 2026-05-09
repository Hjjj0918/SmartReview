import { useMemo, useState } from 'react';
import type { QuestionType, QuizSessionRequest } from '../types';

const TYPES: QuestionType[] = ['MCQ', 'FILL', 'ESSAY', 'PROOF'];

export default function QuizSetupCard(props: {
  courseId: string;
  chapterId: string | null;
  defaultTrack: 'auto' | 'humanities' | 'stem';
  defaultCounts: Record<QuestionType, number>;
  maxTotal: number;
  isStarting: boolean;
  error: string | null;
  onStart: (req: QuizSessionRequest) => void;
}) {
  const [courseTrack, setCourseTrack] = useState(props.defaultTrack);
  const [counts, setCounts] = useState(props.defaultCounts);

  const total = useMemo(
    () => TYPES.reduce((sum, t) => sum + (counts[t] ?? 0), 0),
    [counts],
  );

  const canStart = total > 0 && total <= props.maxTotal && !props.isStarting;

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-soft-lg p-6 sm:p-8 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Quiz setup</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose question types and counts before starting.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Course track
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                { label: 'Auto', value: 'auto' },
                { label: 'Humanities', value: 'humanities' },
                { label: 'STEM', value: 'stem' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCourseTrack(opt.value)}
                  className={`h-9 rounded-xl text-xs font-semibold border transition-colors ${
                    courseTrack === opt.value
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Counts (max {props.maxTotal})
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <label key={t} className="text-xs text-slate-600">
                  <span className="block mb-1 font-semibold text-slate-500">{t}</span>
                  <input
                    type="number"
                    min={0}
                    value={counts[t] ?? 0}
                    onChange={(e) => {
                      const next = Math.max(0, Number(e.target.value || 0));
                      setCounts((prev) => ({ ...prev, [t]: next }));
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Total: {total}</p>
          </div>

          {props.error && (
            <p className="text-xs text-rose-600 break-words">{props.error}</p>
          )}

          <button
            type="button"
            disabled={!canStart}
            onClick={() =>
              props.onStart({
                courseId: props.courseId,
                chapterId: props.chapterId,
                courseTrack,
                counts,
              })
            }
            className={`mt-2 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              canStart
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {props.isStarting ? 'Starting…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  );
}
