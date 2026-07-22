import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlay } from '@/animations';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  side?: 'right' | 'left';
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-2xl',
  side,
}: DrawerProps) {
  const { dir } = useI18n();
  // In RTL, "end" side is the left; keep panel on the inline-end side by default.
  const realSide = side ?? (dir === 'rtl' ? 'left' : 'right');

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

  const offscreen = realSide === 'right' ? '100%' : '-100%';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
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
              'absolute top-0 bottom-0 w-full glass-strong border-slate-200 shadow-card flex flex-col',
              realSide === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              width,
            )}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-200">
              <div>
                {title && <h2 className="text-xl font-bold text-ink-primary">{title}</h2>}
                {subtitle && <p className="text-sm text-ink-secondary mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors focus-ring"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
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
