import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeInUp } from '@/animations';
import { GRADIENT_CLASS, type GradientKey } from '@/design-tokens';
import { AnimatedNumber } from './AnimatedCounter';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number;
  icon: ReactNode;
  gradient: GradientKey;
  format?: (n: number) => string;
  suffix?: string;
  subtitle?: ReactNode;
  textValue?: string; // for non-numeric values
  to?: string; // when set, the whole card navigates on click
}

export function StatsCard({ label, value, icon, gradient, format, suffix, subtitle, textValue, to }: Props) {
  const navigate = useNavigate();
  const clickable = !!to;
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onClick={clickable ? () => navigate(to!) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(to!); } } : undefined}
      className={cn(
        'relative overflow-hidden glass rounded-2xl border border-slate-200 p-5 shadow-card group',
        clickable && 'cursor-pointer transition-shadow hover:border-brand-300 hover:shadow-lg focus-ring',
      )}
    >
      {/* Decorative gradient blob */}
      <div
        className={cn(
          'absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40',
          GRADIENT_CLASS[gradient],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-secondary truncate">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-ink-primary tracking-tight">
            {textValue !== undefined ? (
              <span className="text-xl">{textValue}</span>
            ) : (
              <>
                <AnimatedNumber value={value} format={format} />
                {suffix && <span className="text-lg font-bold text-ink-secondary ml-1">{suffix}</span>}
              </>
            )}
          </p>
          {subtitle && <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>}
        </div>
        <div
          className={cn(
            'shrink-0 grid place-items-center h-12 w-12 rounded-xl text-white shadow-lg',
            GRADIENT_CLASS[gradient],
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
