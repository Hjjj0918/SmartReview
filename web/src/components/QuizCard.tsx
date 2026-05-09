import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import type { Question, AnswerKey, AnswerRecord } from '../types';
import OptionButton from './OptionButton';
import ExplanationCard from './ExplanationCard';

interface QuizCardProps {
  question: Question;
  selectedAnswer: AnswerKey | null;
  fillDraft: string;
  isSubmitted: boolean;
  showExplanation: boolean;
  answerRecord: AnswerRecord | null;
  isLastQuestion: boolean;
  onSelect: (key: AnswerKey) => void;
  onFillDraftChange: (text: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}

const OPTION_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];

export default function QuizCard({
  question,
  selectedAnswer,
  fillDraft,
  isSubmitted,
  showExplanation,
  answerRecord,
  isLastQuestion,
  onSelect,
  onFillDraftChange,
  onSubmit,
  onNext,
}: QuizCardProps) {
  const canSubmit =
    question.type === 'MCQ'
      ? selectedAnswer !== null
      : question.type === 'FILL'
        ? fillDraft.trim().length > 0
        : true;

  const submitLabel =
    question.type === 'ESSAY' || question.type === 'PROOF'
      ? 'Reveal Answer'
      : 'Submit Answer';

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-soft-lg p-6 sm:p-8 border border-slate-100">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-500">
            <Hash size={12} />
            {question.id}
          </span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {question.type}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed mb-6">
          {question.question}
        </h2>

        {question.type === 'MCQ' && (
          <div className="grid grid-cols-1 gap-2.5">
            {OPTION_KEYS.map((key) => (
              <OptionButton
                key={key}
                label={key}
                text={question.options[key]}
                isSelected={selectedAnswer === key}
                isRevealed={isSubmitted}
                isCorrect={
                  selectedAnswer === key && selectedAnswer === question.answer
                }
                isCorrectAnswer={key === question.answer}
                onClick={() => onSelect(key)}
                disabled={isSubmitted}
              />
            ))}
          </div>
        )}

        {question.type === 'FILL' && (
          <div>
            <input
              type="text"
              value={fillDraft}
              onChange={(e) => onFillDraftChange(e.target.value)}
              disabled={isSubmitted}
              placeholder="Type your answer"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        )}

        {!isSubmitted && (
          <motion.button
            whileHover={canSubmit ? { scale: 1.01 } : {}}
            whileTap={canSubmit ? { scale: 0.99 } : {}}
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`mt-5 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              canSubmit
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitLabel}
          </motion.button>
        )}

        <ExplanationCard
          question={question}
          answerRecord={answerRecord}
          isVisible={showExplanation}
          isLastQuestion={isLastQuestion}
          onNext={onNext}
        />
      </div>
    </motion.div>
  );
}
