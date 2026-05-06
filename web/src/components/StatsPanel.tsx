import { motion } from 'framer-motion';
import { Trophy, Clock, Target, RotateCcw, BookOpen } from 'lucide-react';
import type { QuizStats } from '../types';

interface StatsPanelProps {
  stats: QuizStats;
  courseName: string;
  onRetry: () => void;
  onChangeCourse: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function StatsPanel({
  stats,
  courseName,
  onRetry,
  onChangeCourse,
}: StatsPanelProps) {
  const accuracy = stats.accuracy;
  const emoji =
    accuracy >= 90
      ? '🏆'
      : accuracy >= 70
        ? '👏'
        : accuracy >= 50
          ? '📚'
          : '💪';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-soft-lg p-8 border border-slate-100 text-center">
        {/* Big score circle */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke={
                accuracy >= 70
                  ? '#10b981'
                  : accuracy >= 50
                    ? '#f59e0b'
                    : '#f43f5e'
              }
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(accuracy / 100) * 352} 352`}
              initial={{ strokeDashoffset: 352 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-800 tabular-nums">
              {stats.accuracy}%
            </span>
            <span className="text-xs text-slate-500">Accuracy</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-1">
          {emoji} Quiz Complete!
        </h2>
        <p className="text-sm text-slate-500 mb-6">{courseName}</p>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-indigo-50 rounded-xl p-3">
            <Trophy size={18} className="text-indigo-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-indigo-700 tabular-nums">
              {stats.correct}/{stats.total}
            </div>
            <div className="text-xs text-indigo-400">Correct</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <Clock size={18} className="text-amber-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-amber-700 tabular-nums">
              {formatTime(stats.duration)}
            </div>
            <div className="text-xs text-amber-400">Duration</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <Target size={18} className="text-emerald-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-emerald-700 tabular-nums">
              {stats.accuracy}%
            </div>
            <div className="text-xs text-emerald-400">Accuracy</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <RotateCcw size={16} />
            Retry
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onChangeCourse}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            <BookOpen size={16} />
            Courses
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
