import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { Question, AnswerKey } from '../types';

interface ExplanationCardProps {
  question: Question;
  selectedAnswer: AnswerKey;
  isVisible: boolean;
  isLastQuestion: boolean;
  onNext: () => void;
}

export default function ExplanationCard({
  question,
  selectedAnswer,
  isVisible,
  isLastQuestion,
  onNext,
}: ExplanationCardProps) {
  const isCorrect = selectedAnswer === question.answer;

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
          <div
            className={`mt-5 p-5 rounded-xl border-l-4 ${
              isCorrect
                ? 'bg-emerald-50/80 border-emerald-400'
                : 'bg-rose-50/80 border-rose-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <Lightbulb
                size={18}
                className={`shrink-0 mt-0.5 ${
                  isCorrect ? 'text-emerald-600' : 'text-rose-600'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold mb-1.5 ${
                    isCorrect ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {isCorrect ? 'Correct!' : 'Not quite.'}{' '}
                  <span className="font-normal opacity-80">
                    The answer is {question.answer}.
                  </span>
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onNext}
              className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isCorrect
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
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
