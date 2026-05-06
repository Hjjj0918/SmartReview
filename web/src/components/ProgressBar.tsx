import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  progress: number;
}

export default function ProgressBar({
  current,
  total,
  progress,
}: ProgressBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
        <span className="font-medium">
          Question {Math.min(current + 1, total)} of {total}
        </span>
        <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
