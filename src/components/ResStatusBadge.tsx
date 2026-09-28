import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { ReservationStatus } from '@/types';

const config = (dark?: boolean) => ({
  paid: {
    label: 'res.statusPaid',
    classes: dark
      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      : 'bg-emerald-500/15 text-emerald-700 border border-emerald-400/30',
    dotClasses: 'bg-emerald-400',
    pulse: false,
  },
  debt: {
    label: 'res.statusDebt',
    classes: dark
      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
      : 'bg-orange-500/15 text-orange-700 border border-orange-400/30',
    dotClasses: 'bg-orange-450',
    pulse: true,
  },
  active: {
    label: 'res.statusActive',
    classes: dark
      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
      : 'bg-sky-500/15 text-sky-700 border border-sky-400/30',
    dotClasses: 'bg-sky-400',
    pulse: true,
  },
  pending: {
    label: 'res.statusPending',
    classes: dark
      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
      : 'bg-violet-500/15 text-violet-700 border border-violet-400/30',
    dotClasses: 'bg-violet-400',
    pulse: false,
  },
  cancelled: {
    label: 'res.statusCancelled',
    classes: dark
      ? 'bg-white/10 text-slate-350 border border-white/10'
      : 'bg-slate-100 text-slate-500 border border-slate-200',
    dotClasses: 'bg-slate-400',
    pulse: false,
  },
  terminated: {
    label: 'res.statusTerminated',
    classes: dark
      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
      : 'bg-rose-500/15 text-rose-700 border border-rose-400/30',
    dotClasses: 'bg-rose-400',
    pulse: false,
  },
});

export function ResStatusBadge({ status, dark }: { status: ReservationStatus; dark?: boolean }) {
  const { t } = useI18n();
  const c = config(dark)[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', c.classes)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dotClasses, c.pulse && 'animate-pulse-dot')} />
      {t(c.label)}
    </span>
  );
}
