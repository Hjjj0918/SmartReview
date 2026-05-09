import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { Question, AnswerRecord } from '../types';

interface ExplanationCardProps {
  question: Question;
  answerRecord: AnswerRecord | null;
  isVisible: boolean;
  isLastQuestion: boolean;
  onNext: () => void;
}

export default function ExplanationCard({
  question,
  answerRecord,
  isVisible,
  isLastQuestion,
  onNext,
}: ExplanationCardProps) {
  const scored = answerRecord?.scored ?? false;
  const isCorrect = answerRecord?.correct === true;

  const variant: 'correct' | 'incorrect' | 'info' = !answerRecord
    ? 'info'
    : scored
      ? isCorrect
        ? 'correct'
        : 'incorrect'
      : 'info';

  const containerClass =
    variant === 'correct'
      ? 'bg-emerald-50/80 border-emerald-400'
      : variant === 'incorrect'
        ? 'bg-rose-50/80 border-rose-400'
        : 'bg-slate-50/80 border-slate-300';

  const iconClass =
    variant === 'correct'
      ? 'text-emerald-600'
      : variant === 'incorrect'
        ? 'text-rose-600'
        : 'text-slate-600';

  const titleClass =
    variant === 'correct'
      ? 'text-emerald-800'
      : variant === 'incorrect'
        ? 'text-rose-800'
        : 'text-slate-800';

  const buttonClass =
    variant === 'correct'
      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
      : variant === 'incorrect'
        ? 'bg-rose-600 text-white hover:bg-rose-700'
        : 'bg-indigo-600 text-white hover:bg-indigo-700';

  let headline = '';
  let detail: string | null = null;
  let body: string | null = null;

  if (question.type === 'MCQ') {
    headline = scored ? (isCorrect ? 'Correct!' : 'Not quite.') : 'Answer';
    detail = `The answer is ${question.answer}.`;
    body = question.explanation;
  } else if (question.type === 'FILL') {
    headline = scored ? (isCorrect ? 'Correct!' : 'Not quite.') : 'Answer';
    const tolText =
      question.tolerance !== undefined
        ? ` (tolerance ±${question.tolerance})`
        : '';
    detail = `Accepted answers: ${question.answers.join(', ')}${tolText}.`;
    body = question.explanation ?? null;
  } else {
    headline = 'Reference answer';
    body = question.answer;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={`mt-5 p-5 rounded-xl border-l-4 ${containerClass}`}>
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className={`shrink-0 mt-0.5 ${iconClass}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold mb-1.5 ${titleClass}`}>
                  {headline}
                  {detail && (
                    <span className="font-normal opacity-80"> {detail}</span>
                  )}
                </p>
                {body && (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {body}
                  </p>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onNext}
              className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${buttonClass}`}
            >
              {isLastQuestion ? 'View Results' : 'Next Question'}
              <ArrowRight size={15} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
