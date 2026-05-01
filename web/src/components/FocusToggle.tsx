import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft } from 'lucide-react';

interface FocusToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function FocusToggle({ isVisible, onToggle }: FocusToggleProps) {
  useEffect(() => {
    if (!isVisible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onToggle();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onToggle]);

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.button
          key="focus-exit"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          onClick={onToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed top-4 left-4 z-[9999] w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-soft text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          title="Exit focus mode (Esc)"
        >
          <PanelLeft size={17} />
        </motion.button>
      )}
    </AnimatePresence>,
    document.body,
  );
}
