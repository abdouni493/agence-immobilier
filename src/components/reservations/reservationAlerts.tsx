import { motion } from 'framer-motion';
import {
  AlarmClock, AlertTriangle, BellRing, CheckCircle2, LogIn, LogOut, PlayCircle, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn, addDaysISO, nightsBetween } from '@/lib/utils';
import type { Reservation } from '@/types';

/* ============================================================================
 * Reservation alert engine — shared by Reservations page and Dashboard.
 *
 * A reservation has AT MOST one alert at a time:
 *  - pending → needs to be activated (arrival)
 *  - active  → needs to be terminated / closed (departure)
 * The alert urgency depends on how the check-in / check-out date compares to
 * today (overdue / today / soon).
 * ========================================================================== */

export type ReservationAlertType =
  | 'activateOverdue'
  | 'activateToday'
  | 'activateSoon'
  | 'checkoutOverdue'
  | 'checkoutToday'
  | 'checkoutSoon';

export type AlertFilterValue = 'all' | ReservationAlertType;

export interface ReservationAlertInfo {
  type: ReservationAlertType;
  /** 0 = today · >0 = days remaining (soon) · for overdue = days late (positive) */
  days: number;
  /** true for "today" and "overdue" alerts that require immediate action */
  urgent: boolean;
  /** which action resolves the alert */
  action: 'activate' | 'checkout';
}

/** How many days ahead counts as an "imminent" alert. */
export const SOON_DAYS = 3;

export function getReservationAlert(
  r: Reservation,
  today: string,
  soonDays = SOON_DAYS,
): ReservationAlertInfo | null {
  const soonLimit = addDaysISO(today, soonDays);

  if (r.status === 'pending') {
    if (r.checkIn < today) return { type: 'activateOverdue', days: nightsBetween(r.checkIn, today), urgent: true, action: 'activate' };
    if (r.checkIn === today) return { type: 'activateToday', days: 0, urgent: true, action: 'activate' };
    if (r.checkIn <= soonLimit) return { type: 'activateSoon', days: nightsBetween(today, r.checkIn), urgent: false, action: 'activate' };
  } else if (r.status === 'active') {
    if (r.checkOut < today) return { type: 'checkoutOverdue', days: nightsBetween(r.checkOut, today), urgent: true, action: 'checkout' };
    if (r.checkOut === today) return { type: 'checkoutToday', days: 0, urgent: true, action: 'checkout' };
    if (r.checkOut <= soonLimit) return { type: 'checkoutSoon', days: nightsBetween(today, r.checkOut), urgent: false, action: 'checkout' };
  }
  return null;
}

/** Build an id→alert map + per-type counts for a list of reservations. */
export function buildAlertIndex(reservations: Reservation[], today: string, soonDays = SOON_DAYS) {
  const map = new Map<string, ReservationAlertInfo>();
  const counts: Record<ReservationAlertType, number> = {
    activateOverdue: 0, activateToday: 0, activateSoon: 0,
    checkoutOverdue: 0, checkoutToday: 0, checkoutSoon: 0,
  };
  for (const r of reservations) {
    const a = getReservationAlert(r, today, soonDays);
    if (a) {
      map.set(r.id, a);
      counts[a.type] += 1;
    }
  }
  const total = map.size;
  return { map, counts, total };
}

/** Display order — most urgent first. */
export const ALERT_ORDER: ReservationAlertType[] = [
  'activateToday', 'checkoutToday',
  'activateOverdue', 'checkoutOverdue',
  'activateSoon', 'checkoutSoon',
];

interface ToneClasses {
  banner: string;   // light banner surface
  title: string;    // banner title text color
  solid: string;    // solid bg (icon circle / action button / dot)
  pillOn: string;   // active filter pill
  pillOff: string;  // idle filter pill
  glow: string;     // rgba used for the pulsing shadow
  accent: string;   // strong border colour (start accent bar)
  soft: string;     // soft chip (bg + text)
  ring: string;     // light ring around a panel
}

const TONES: Record<string, ToneClasses> = {
  rose: {
    banner: 'bg-rose-50 border-rose-200',
    title: 'text-rose-700',
    solid: 'bg-rose-500',
    pillOn: 'bg-rose-500 text-white border-rose-500 shadow-sm',
    pillOff: 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50',
    glow: 'rgba(244,63,94,0.45)',
    accent: 'border-rose-500',
    soft: 'bg-rose-50 text-rose-700',
    ring: 'ring-rose-200',
  },
  orange: {
    banner: 'bg-orange-50 border-orange-200',
    title: 'text-orange-700',
    solid: 'bg-orange-500',
    pillOn: 'bg-orange-500 text-white border-orange-500 shadow-sm',
    pillOff: 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50',
    glow: 'rgba(249,115,22,0.45)',
    accent: 'border-orange-500',
    soft: 'bg-orange-50 text-orange-700',
    ring: 'ring-orange-200',
  },
  amber: {
    banner: 'bg-amber-50 border-amber-200',
    title: 'text-amber-700',
    solid: 'bg-amber-500',
    pillOn: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    pillOff: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
    glow: 'rgba(245,158,11,0.45)',
    accent: 'border-amber-500',
    soft: 'bg-amber-50 text-amber-700',
    ring: 'ring-amber-200',
  },
  teal: {
    banner: 'bg-teal-50 border-teal-200',
    title: 'text-teal-700',
    solid: 'bg-teal-500',
    pillOn: 'bg-teal-500 text-white border-teal-500 shadow-sm',
    pillOff: 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50',
    glow: 'rgba(20,184,166,0.45)',
    accent: 'border-teal-500',
    soft: 'bg-teal-50 text-teal-700',
    ring: 'ring-teal-200',
  },
  sky: {
    banner: 'bg-sky-50 border-sky-200',
    title: 'text-sky-700',
    solid: 'bg-sky-500',
    pillOn: 'bg-sky-500 text-white border-sky-500 shadow-sm',
    pillOff: 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50',
    glow: 'rgba(14,165,233,0.4)',
    accent: 'border-sky-500',
    soft: 'bg-sky-50 text-sky-700',
    ring: 'ring-sky-200',
  },
  violet: {
    banner: 'bg-violet-50 border-violet-200',
    title: 'text-violet-700',
    solid: 'bg-violet-500',
    pillOn: 'bg-violet-500 text-white border-violet-500 shadow-sm',
    pillOff: 'bg-white text-violet-700 border-violet-200 hover:bg-violet-50',
    glow: 'rgba(139,92,246,0.4)',
    accent: 'border-violet-500',
    soft: 'bg-violet-50 text-violet-700',
    ring: 'ring-violet-200',
  },
};

interface AlertMeta {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  titleKey: string;
  descKey: string;
  actionKey: string;
}

export const ALERT_META: Record<ReservationAlertType, AlertMeta> = {
  activateToday:   { icon: PlayCircle,    tone: 'amber',  titleKey: 'resAlert.activateToday',   descKey: 'resAlert.activateTodayDesc',   actionKey: 'res.activate' },
  checkoutToday:   { icon: CheckCircle2,  tone: 'teal',   titleKey: 'resAlert.checkoutToday',   descKey: 'resAlert.checkoutTodayDesc',   actionKey: 'res.cloture' },
  activateOverdue: { icon: AlertTriangle, tone: 'orange', titleKey: 'resAlert.activateOverdue', descKey: 'resAlert.activateOverdueDesc', actionKey: 'res.activate' },
  checkoutOverdue: { icon: AlarmClock,    tone: 'rose',   titleKey: 'resAlert.checkoutOverdue', descKey: 'resAlert.checkoutOverdueDesc', actionKey: 'res.cloture' },
  activateSoon:    { icon: LogIn,         tone: 'sky',    titleKey: 'resAlert.activateSoon',    descKey: 'resAlert.activateSoonDesc',    actionKey: 'res.activate' },
  checkoutSoon:    { icon: LogOut,        tone: 'violet', titleKey: 'resAlert.checkoutSoon',    descKey: 'resAlert.checkoutSoonDesc',    actionKey: 'res.cloture' },
};

export function alertTone(type: ReservationAlertType): ToneClasses {
  return TONES[ALERT_META[type].tone];
}

/* ------------------------------------------------------------------ */
/* Banner shown on a reservation card / dashboard card.                */
/* ------------------------------------------------------------------ */
export function ReservationAlertBanner({
  alert, onAction, canAct, className,
}: {
  alert: ReservationAlertInfo;
  onAction?: () => void;
  canAct?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const meta = ALERT_META[alert.type];
  const tone = TONES[meta.tone];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={
        alert.urgent
          ? { opacity: 1, y: 0, scale: 1, boxShadow: ['0 0 0 0 rgba(0,0,0,0)', `0 0 0 4px ${tone.glow}`, '0 0 0 0 rgba(0,0,0,0)'] }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={
        alert.urgent
          ? { boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }, default: { duration: 0.3 } }
          : { duration: 0.3 }
      }
      className={cn('relative overflow-hidden rounded-xl border p-2.5', tone.banner, className)}
    >
      <div className="flex items-start gap-2.5">
        <span className="relative mt-0.5 shrink-0">
          {alert.urgent && (
            <span className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', tone.solid)} />
          )}
          <span className={cn('relative grid h-7 w-7 place-items-center rounded-full text-white', tone.solid)}>
            <Icon size={14} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-bold leading-tight', tone.title)}>{t(meta.titleKey)}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
            {t(meta.descKey, { days: alert.days })}
          </p>
        </div>
        {onAction && canAct && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(); }}
            className={cn(
              'shrink-0 self-center rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95 hover:brightness-110',
              tone.solid,
            )}
          >
            {t(meta.actionKey)}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar shown on the Reservations page.                          */
/* ------------------------------------------------------------------ */
function AlertPill({
  active, onClick, tone, icon: Icon, label, count, pulse,
}: {
  active: boolean;
  onClick: () => void;
  tone: ToneClasses;
  icon?: LucideIcon;
  label: string;
  count: number;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
        active ? tone.pillOn : tone.pillOff,
      )}
    >
      {pulse && !active && (
        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', tone.solid)} />
          <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', tone.solid)} />
        </span>
      )}
      {Icon && <Icon size={13} />}
      <span>{label}</span>
      <span
        className={cn(
          'ml-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold',
          active ? 'bg-white/25 text-white' : 'bg-black/5 text-current',
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function AlertFilterBar({
  counts, total, value, onChange,
}: {
  counts: Record<ReservationAlertType, number>;
  total: number;
  value: AlertFilterValue | null;
  onChange: (v: AlertFilterValue | null) => void;
}) {
  const { t } = useI18n();
  if (total === 0) return null;

  const activePills = ALERT_ORDER.filter((tp) => counts[tp] > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50/40 p-3.5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
            <span className="absolute inset-0 rounded-xl bg-amber-500 opacity-40 animate-ping" />
            <BellRing size={17} className="relative" />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-700">{t('resAlert.filterTitle')}</p>
            <p className="text-[11px] text-amber-600">{t('resAlert.filterHint', { count: total })}</p>
          </div>
        </div>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
          >
            <X size={12} /> {t('resAlert.clear')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <AlertPill
          active={value === 'all'}
          onClick={() => onChange(value === 'all' ? null : 'all')}
          tone={TONES.amber}
          icon={BellRing}
          label={t('resAlert.allAlerts')}
          count={total}
          pulse
        />
        {activePills.map((tp) => {
          const meta = ALERT_META[tp];
          return (
            <AlertPill
              key={tp}
              active={value === tp}
              onClick={() => onChange(value === tp ? null : tp)}
              tone={TONES[meta.tone]}
              icon={meta.icon}
              label={t(meta.titleKey)}
              count={counts[tp]}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
