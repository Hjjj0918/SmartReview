import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { AnswerKey } from '../types';

interface OptionButtonProps {
  label: AnswerKey;
  text: string;
  isSelected: boolean;
  isRevealed: boolean;
  isCorrect: boolean;
  isCorrectAnswer: boolean;
  onClick: () => void;
  disabled: boolean;
}

const labelColors: Record<AnswerKey, string> = {
  A: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  B: 'bg-violet-100 text-violet-700 border-violet-200',
  C: 'bg-sky-100 text-sky-700 border-sky-200',
  D: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function OptionButton({
  label,
  text,
  isSelected,
  isRevealed,
  isCorrect,
  isCorrectAnswer,
  onClick,
  disabled,
}: OptionButtonProps) {
  let borderStyle = 'border-slate-200 hover:border-indigo-300 hover:shadow-md';
  let bgStyle = 'bg-white hover:bg-indigo-50/50';
  let shake = false;
  let bounce = false;

  if (isRevealed) {
    if (isSelected && isCorrect) {
      borderStyle = 'border-emerald-400';
      bgStyle = 'bg-emerald-50';
      bounce = true;
    } else if (isSelected && !isCorrect) {
      borderStyle = 'border-rose-400';
      bgStyle = 'bg-rose-50';
      shake = true;
    } else if (isCorrectAnswer) {
      borderStyle = 'border-emerald-400';
      bgStyle = 'bg-emerald-50/60';
    } else {
      bgStyle = 'bg-white/50';
    }
  } else if (isSelected) {
    borderStyle = 'border-indigo-400 ring-2 ring-indigo-200';
    bgStyle = 'bg-indigo-50';
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      animate={
        shake
          ? { x: [0, -4, 4, -4, 4, -2, 2, 0] }
          : bounce
            ? { scale: [1, 1.03, 1] }
            : {}
      }
      transition={
        shake
          ? { duration: 0.5, ease: 'easeInOut' }
          : bounce
            ? { duration: 0.4, ease: 'easeOut' }
            : {}
      }
      whileHover={disabled ? {} : { scale: 1.01, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      className={`group relative w-full text-left p-4 rounded-xl border-2 transition-colors duration-200
        ${borderStyle} ${bgStyle}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
        ${isRevealed && !isSelected && !isCorrectAnswer ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 w-7 h-7 rounded-lg border text-xs font-semibold flex items-center justify-center
            ${isRevealed && isSelected && isCorrect ? 'bg-emerald-500 text-white border-emerald-500' : ''}
            ${isRevealed && isSelected && !isCorrect ? 'bg-rose-500 text-white border-rose-500' : ''}
            ${!isRevealed || (!isSelected && !isCorrectAnswer) ? labelColors[label] : ''}
            ${isRevealed && isCorrectAnswer && !isSelected ? 'bg-emerald-500 text-white border-emerald-500' : ''}`}
        >
          {isRevealed && isSelected && isCorrect ? (
            <Check size={14} strokeWidth={3} />
          ) : isRevealed && isSelected && !isCorrect ? (
            <X size={14} strokeWidth={3} />
          ) : (
            label
          )}
        </span>
        <span className="text-sm leading-relaxed text-slate-700 flex-1 pt-0.5">
          {text}
        </span>
        {isRevealed && isCorrectAnswer && (
          <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
        )}
      </div>
    </motion.button>
  );
}
