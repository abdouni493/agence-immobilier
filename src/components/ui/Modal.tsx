import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlay, modalPanel } from '@/animations';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  hideClose?: boolean;
}

const sizes: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[96vw]',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  hideClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={modalOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            variants={modalOverlay}
          />
          <motion.div
            className={cn(
              'relative w-full glass-strong rounded-3xl shadow-card border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden',
              sizes[size],
            )}
            variants={modalPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-200">
                <div>
                  {title && <h2 className="text-xl font-bold text-ink-primary">{title}</h2>}
                  {subtitle && <p className="text-sm text-ink-secondary mt-0.5">{subtitle}</p>}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-xl p-2 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors focus-ring"
                    aria-label="Fermer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
