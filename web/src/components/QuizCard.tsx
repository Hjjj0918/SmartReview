import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import type { Question, AnswerKey } from '../types';
import OptionButton from './OptionButton';
import ExplanationCard from './ExplanationCard';

interface QuizCardProps {
  question: Question;
  selectedAnswer: AnswerKey | null;
  isSubmitted: boolean;
  showExplanation: boolean;
  isLastQuestion: boolean;
  onSelect: (key: AnswerKey) => void;
  onSubmit: () => void;
  onNext: () => void;
}

const OPTION_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];

export default function QuizCard({
  question,
  selectedAnswer,
  isSubmitted,
  showExplanation,
  isLastQuestion,
  onSelect,
  onSubmit,
  onNext,
}: QuizCardProps) {
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
        {/* Question header */}
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-500">
            <Hash size={12} />
            {question.id}
          </span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {question.type}
          </span>
        </div>

        {/* Question text */}
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed mb-6">
          {question.question}
        </h2>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5">
          {OPTION_KEYS.map((key) => (
            <OptionButton
              key={key}
              label={key}
              text={question.options[key]}
              isSelected={selectedAnswer === key}
              isRevealed={isSubmitted}
              isCorrect={selectedAnswer === key && selectedAnswer === question.answer}
              isCorrectAnswer={key === question.answer}
              onClick={() => onSelect(key)}
              disabled={isSubmitted}
            />
          ))}
        </div>

        {/* Submit button */}
        {!isSubmitted && (
          <motion.button
            whileHover={selectedAnswer ? { scale: 1.01 } : {}}
            whileTap={selectedAnswer ? { scale: 0.99 } : {}}
            onClick={onSubmit}
            disabled={!selectedAnswer}
            className={`mt-5 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              selectedAnswer
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Submit Answer
          </motion.button>
        )}

        {/* Explanation */}
        <ExplanationCard
          question={question}
          selectedAnswer={selectedAnswer ?? 'A'}
          isVisible={showExplanation}
          isLastQuestion={isLastQuestion}
          onNext={onNext}
        />
      </div>
    </motion.div>
  );
}
