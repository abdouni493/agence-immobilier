import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/animations';

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-grad-primary text-white shadow-glow shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-700">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </motion.div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={18}
        className="absolute inset-y-0 start-3.5 my-auto text-ink-muted pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl bg-slate-100/70 border border-slate-200 ps-11 pe-4 text-sm text-ink-primary placeholder:text-ink-muted outline-none transition-all focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="grid h-20 w-20 place-items-center rounded-3xl glass border border-slate-200 text-brand-400 mb-4">
        {icon ?? <Inbox size={36} />}
      </div>
      <h3 className="text-lg font-bold text-ink-primary">{title}</h3>
      {hint && <p className="text-sm text-ink-secondary mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function Stat({
  label,
  value,
  tone = 'default',
  dark = false,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  dark?: boolean;
}) {
  const toneClass = dark
    ? tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : tone === 'warning'
          ? 'text-amber-300'
          : 'text-white'
    : tone === 'success'
      ? 'text-emerald-600'
      : tone === 'danger'
        ? 'text-rose-600'
        : tone === 'warning'
          ? 'text-amber-600'
          : 'text-ink-primary';
  return (
    <div className={cn('rounded-xl px-4 py-3', dark ? 'bg-white/10 border border-white/10' : 'bg-slate-100/70 border border-slate-200')}>
      <p className={cn('text-xs', dark ? 'text-ink-secondary' : 'text-ink-muted')}>{label}</p>
      <p className={cn('text-lg font-bold mt-0.5', toneClass)}>{value}</p>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-slate-100/70 border border-slate-200 p-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
            value === tab.value ? 'text-white' : 'text-ink-secondary hover:text-ink-primary',
          )}
        >
          {value === tab.value && (
            <motion.span
              layoutId="tab-bg"
              className="absolute inset-0 rounded-xl bg-grad-primary shadow-glow"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
