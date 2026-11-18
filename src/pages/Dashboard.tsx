import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, Building2, CalendarCheck,
  PieChart as PieIcon, Wrench, Users, HardHat, Sparkles, CalendarDays,
  LayoutDashboard, Bell, Receipt, ArrowDownLeft, ArrowUpRight, Phone,
  BedDouble,
} from 'lucide-react';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import {
  computeKpis, lastNMonths, monthLabel, revenueByMonth, reservationsByMonth,
  occupancyByFloor, expensesByCategory, reservationRemaining, effectiveRoomStatus,
} from '@/store/selectors';
import { StatsCard } from '@/components/ui/StatsCard';
import { SectionCard } from '@/components/ui/GradientCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Misc';
import { RevenueAreaChart, CountBarChart, HorizontalBars, DonutChart, ChartLegend } from '@/components/ui/Charts';
import {
  buildAlertIndex, ALERT_META, ALERT_ORDER, alertTone, type ReservationAlertType,
} from '@/components/reservations/reservationAlerts';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, clamp } from '@/lib/utils';
import { useToday } from '@/lib/useToday';
import { clientName, reservationRoomLabels, expenseCategoryName, clientById, rentalPeriodOf } from '@/lib/lookups';
import { Link } from 'react-router-dom';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import type { Reservation, DashCard } from '@/types';
import { useCurrentPermissions, canSeeDashCard } from '@/store/appStore';

export default function Dashboard() {
  const { t, lang } = useI18n();
  const data = useAppData();
  // Live LOCAL date (toISOString would give the UTC date, which lags the
  // system date and made same-day alerts show as "in 1 day").
  const today = useToday();
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  const kpis = useMemo(() => computeKpis(data, today), [data, today]);
  const months = useMemo(() => lastNMonths(6, today), [today]);
  const revenueData = useMemo(
    () => months.map((mk, i) => ({ name: monthLabel(mk, lang), value: revenueByMonth(data.reservations, months)[i] })),
    [data.reservations, months, lang],
  );
  const resData = useMemo(
    () => months.map((mk, i) => ({ name: monthLabel(mk, lang), value: reservationsByMonth(data.reservations, months)[i] })),
    [data.reservations, months, lang],
  );
  const occFloor = useMemo(() => occupancyByFloor(data, today), [data, today]);
  const expCat = useMemo(() => expensesByCategory(data), [data]);

  // Alerts
  const debtClients = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data.reservations) {
      const rem = reservationRemaining(r);
      if (rem > 0) map.set(r.clientId, (map.get(r.clientId) ?? 0) + rem);
    }
    return [...map.entries()]
      .filter(([, v]) => v > 5000)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [data.reservations]);

  const expiringToday = useMemo(
    () => data.reservations.filter((r) => r.checkOut === today && r.status !== 'cancelled'),
    [data.reservations, today],
  );
  const maintRooms = useMemo(() => data.rooms.filter((r) => r.status === 'maintenance'), [data.rooms]);

  // Rental apartments free today — the agency's most-asked-for list.
  const availableRooms = useMemo(
    () =>
      data.rooms
        .filter(
          (r) =>
            (r.propertyType ?? 'rental') === 'rental' &&
            effectiveRoomStatus(r, data.reservations, today) === 'available',
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.rooms, data.reservations, today],
  );

  const recentRes = data.reservations.slice(0, 5);
  const recentTx = data.cashTransactions.slice(0, 5);
  const recentExp = data.expenses.slice(0, 5);

  /** Dashboard cards whose real value this account may see (admin: all). */
  const dashPerms = useCurrentPermissions();
  const seeCard = (c: DashCard) => canSeeDashCard(dashPerms, c);

  const kpiCards = [
    { card: 'revenue' as DashCard, label: t('dash.revenue'), value: kpis.monthRevenue, icon: <TrendingUp size={22} />, gradient: 'success' as const, format: formatDA, to: '/app/caisse' },
    { card: 'expenses' as DashCard, label: t('dash.expenses'), value: kpis.monthExpenses, icon: <TrendingDown size={22} />, gradient: 'warning' as const, format: formatDA, to: '/app/expenses' },
    { card: 'balance' as DashCard, label: t('dash.balance'), value: kpis.balance, icon: <Wallet size={22} />, gradient: 'secondary' as const, format: formatDA, to: '/app/caisse' },
    { card: 'debts' as DashCard, label: t('dash.debts'), value: kpis.clientDebts, icon: <AlertCircle size={22} />, gradient: 'gold' as const, format: formatDA, to: '/app/reservations' },
    { card: 'roomsAvailable' as DashCard, label: t('dash.roomsAvailable'), value: kpis.roomsAvailable, icon: <BedDouble size={22} />, gradient: 'primary' as const, suffix: `/ ${seeCard('roomsAvailable') ? kpis.roomsTotal : 0}`, to: '/app/chambres' },
    { card: 'activeReservations' as DashCard, label: t('dash.activeReservations'), value: kpis.activeToday, icon: <CalendarCheck size={22} />, gradient: 'purple' as const, to: '/app/reservations' },
    { card: 'occupancy' as DashCard, label: t('dash.occupancy'), value: kpis.occupancy, icon: <PieIcon size={22} />, gradient: 'cyan' as const, suffix: '%', to: '/app/chambres' },
    { card: 'maintenance' as DashCard, label: t('dash.maintenance'), value: kpis.roomsMaintenance, icon: <Wrench size={22} />, gradient: 'warning' as const, to: '/app/chambres' },
    { card: 'totalClients' as DashCard, label: t('dash.totalClients'), value: kpis.totalClients, icon: <Users size={22} />, gradient: 'rose' as const, to: '/app/clients' },
    { card: 'activeWorkers' as DashCard, label: t('dash.activeWorkers'), value: kpis.activeWorkers, icon: <HardHat size={22} />, gradient: 'teal' as const, to: '/app/workers' },
    { card: 'monthReservations' as DashCard, label: t('dash.monthReservations'), value: kpis.monthReservations, icon: <CalendarDays size={22} />, gradient: 'purple' as const, to: '/app/reservations' },
  ];

  const hasAlerts = debtClients.length || expiringToday.length || maintRooms.length;

  // Imminent / today / overdue reservation alerts (shared engine with Reservations page)
  const resAlertGroups = useMemo(() => {
    const { map } = buildAlertIndex(data.reservations, today);
    const groups: Record<ReservationAlertType, Reservation[]> = {
      activateOverdue: [], activateToday: [], activateSoon: [],
      checkoutOverdue: [], checkoutToday: [], checkoutSoon: [],
    };
    for (const r of data.reservations) {
      const a = map.get(r.id);
      if (a) groups[a.type].push(r);
    }
    for (const key of Object.keys(groups) as ReservationAlertType[]) {
      const dateField = key.startsWith('activate') ? 'checkIn' : 'checkOut';
      groups[key].sort((a, b) => a[dateField].localeCompare(b[dateField]));
    }
    return groups;
  }, [data.reservations, today]);

  const totalResAlerts = ALERT_ORDER.reduce((s, k) => s + resAlertGroups[k].length, 0);

  return (
    <div>
      <PageHeader icon={<LayoutDashboard size={24} />} title={t('dash.title')} subtitle={t('dash.subtitle')} />

      {/* KPI grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {kpiCards.map(({ card, ...c }) => (
          // A card the account may not see stays in place but shows zero.
          <StatsCard key={c.label} {...c} value={seeCard(card) ? c.value : 0} />
        ))}
        {/* Top service - text card */}
        <StatsCard
          label={t('dash.topService')}
          value={0}
          textValue={seeCard('topService') ? kpis.topService : '0'}
          icon={<Sparkles size={22} />}
          gradient="gold"
          to="/app/services"
        />
      </motion.div>

      {/* Reservation alerts — today / overdue / imminent (activation & checkout) */}
      {totalResAlerts > 0 && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_-20px_rgba(15,23,42,0.45)]">
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-900 to-sky-800 px-5 py-4">
            <div className="pointer-events-none absolute -end-10 -top-12 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" />
            <div className="relative flex flex-wrap items-center gap-4">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
                <span className="absolute inset-0 rounded-2xl bg-amber-400/30 animate-ping" />
                <Bell size={20} className="relative" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-white">{t('dash.resAlertsTitle')}</p>
                <p className="text-xs text-sky-100/80">{t('resAlert.filterHint', { count: totalResAlerts })}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALERT_ORDER.filter((k) => resAlertGroups[k].length > 0).map((k) => {
                  const Icon = ALERT_META[k].icon;
                  return (
                    <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                      <span className={`grid h-4 w-4 place-items-center rounded-full ${alertTone(k).solid}`}><Icon size={10} /></span>
                      {t(ALERT_META[k].titleKey)}
                      <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">{resAlertGroups[k].length}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 lg:grid-cols-2">
            {ALERT_ORDER.map((type) => (
              <ReservationAlertGroup
                key={type}
                type={type}
                reservations={resAlertGroups[type]}
                data={data}
                lang={lang}
                onSelect={setDetailRes}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inline detail panel */}
      <AnimatePresence>
        {detailRes && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sky-700">{detailRes.code}</span>
                <ResStatusBadge status={detailRes.status} />
              </div>
              <button onClick={() => setDetailRes(null)} className="text-ink-muted hover:text-ink-primary text-lg leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-ink-muted">Client</p><p className="font-medium">{clientName(data, detailRes.clientId)}</p></div>
              <div><p className="text-xs text-ink-muted">Tél</p><p className="font-medium">{clientById(data, detailRes.clientId)?.phone ?? '—'}</p></div>
              <div><p className="text-xs text-ink-muted">Arrivée</p><p className="font-medium">{formatDate(detailRes.checkIn, lang)}</p></div>
              <div><p className="text-xs text-ink-muted">Départ</p><p className="font-medium">{formatDate(detailRes.checkOut, lang)}</p></div>
              <div><p className="text-xs text-ink-muted">Appartements</p><p className="font-medium">{reservationRoomLabels(data, detailRes)}</p></div>
              <div><p className="text-xs text-ink-muted">Total</p><p className="font-medium">{formatDA(detailRes.total)}</p></div>
              <div><p className="text-xs text-ink-muted">Reste dû</p><p className={`font-bold ${reservationRemaining(detailRes) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatDA(reservationRemaining(detailRes))}</p></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available apartments */}
      <SectionCard
        title={`${t('dash.availableApartments')} (${availableRooms.length})`}
        icon={<BedDouble size={18} />}
        className="mb-6"
        action={
          <Link to="/app/chambres" className="text-xs font-semibold text-brand-700 hover:text-brand-400">
            {t('common.viewAll')}
          </Link>
        }
      >
        {availableRooms.length === 0 ? (
          <p className="text-sm text-ink-secondary py-4 text-center">{t('dash.noAvailableApartments')}</p>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            {availableRooms.map((r) => (
              <motion.div key={r.id} variants={listItem}>
                <Link
                  to="/app/chambres"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/5 p-3 hover:border-brand-400 hover:bg-white/10 transition-all"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-grad-primary text-white shrink-0">
                    <BedDouble size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-primary truncate">{r.name}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {[r.commune, r.furnished ? t('apt.furnished') : t('apt.unfurnished')]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold text-emerald-600">{formatDA(r.pricePerNight)}</p>
                    <p className="text-[10px] text-ink-muted">
                      / {rentalPeriodOf(r) === 'month' ? t('common.monthUnit') : t('common.night')}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </SectionCard>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title={t('dash.revenueChart')} icon={<TrendingUp size={18} />}>
          <RevenueAreaChart data={revenueData} />
        </SectionCard>
        <SectionCard title={t('dash.reservationsChart')} icon={<CalendarCheck size={18} />}>
          <CountBarChart data={resData} />
        </SectionCard>
        <SectionCard title={t('dash.occupancyByFloor')} icon={<BedDouble size={18} />}>
          <HorizontalBars data={occFloor} />
        </SectionCard>
        <SectionCard title={t('dash.expensesByCategory')} icon={<PieIcon size={18} />}>
          <DonutChart data={expCat} />
          <ChartLegend data={expCat} />
        </SectionCard>
      </div>

      {/* Alerts */}
      <SectionCard title={t('dash.alerts')} icon={<Bell size={18} />} className="mb-6">
        {hasAlerts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {debtClients.map(([cid, amount]) => (
              <AlertRow
                key={cid}
                tone="danger"
                icon={<AlertCircle size={16} />}
                title={clientName(data, cid)}
                sub={t('dash.alertDebt')}
                value={formatDA(amount)}
              />
            ))}
            {expiringToday.map((r) => (
              <AlertRow
                key={r.id}
                tone="warning"
                icon={<CalendarCheck size={16} />}
                title={`${r.code} · ${clientName(data, r.clientId)}`}
                sub={t('dash.alertExpiring')}
                value={formatDate(r.checkOut, lang)}
              />
            ))}
            {maintRooms.map((r) => (
              <AlertRow
                key={r.id}
                tone="info"
                icon={<Wrench size={16} />}
                title={`${t('nav.chambres')} ${r.name}`}
                sub={t('dash.alertMaintenance')}
                value={r.maintenanceNote ?? '—'}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-secondary py-4 text-center">{t('dash.noAlerts')}</p>
        )}
      </SectionCard>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title={t('dash.recentReservations')} icon={<CalendarCheck size={18} />}>
          <ul className="space-y-2.5">
            {recentRes.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary truncate">{clientName(data, r.clientId)}</p>
                  <p className="text-xs text-ink-muted truncate">{reservationRoomLabels(data, r)}</p>
                </div>
                <ResStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t('dash.recentTransactions')} icon={<Wallet size={18} />}>
          <ul className="space-y-2.5">
            {recentTx.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${tx.type === 'deposit' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink-primary truncate">{tx.description}</p>
                    <p className="text-xs text-ink-muted">{formatDate(tx.date, lang)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'deposit' ? '+' : '−'}{formatDA(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t('dash.recentExpenses')} icon={<Receipt size={18} />}>
          <ul className="space-y-2.5">
            {recentExp.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary truncate">{e.name}</p>
                  <p className="text-xs text-ink-muted truncate">{expenseCategoryName(data, e.categoryId)}</p>
                </div>
                <span className="text-sm font-semibold text-rose-600 shrink-0">−{formatDA(e.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function AlertRow({
  tone,
  icon,
  title,
  sub,
  value,
}: {
  tone: 'danger' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  sub: string;
  value: string;
}) {
  const c = tone === 'danger'
    ? { bar: 'border-rose-500', tile: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30', pill: 'bg-rose-50 text-rose-700 ring-rose-200', sub: 'text-rose-600' }
    : tone === 'warning'
      ? { bar: 'border-amber-500', tile: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30', pill: 'bg-amber-50 text-amber-700 ring-amber-200', sub: 'text-amber-600' }
      : { bar: 'border-sky-500', tile: 'bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-500/30', pill: 'bg-sky-50 text-sky-700 ring-sky-200', sub: 'text-sky-600' };
  return (
    <div className={`group flex items-center gap-3 rounded-2xl border border-slate-200 border-s-4 ${c.bar} bg-white px-3.5 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md ${c.tile}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{title}</p>
        <p className={`truncate text-[11px] font-semibold uppercase tracking-wide ${c.sub}`}>{sub}</p>
      </div>
      <span className={`max-w-[45%] shrink-0 truncate rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${c.pill}`}>{value}</span>
    </div>
  );
}

function ReservationAlertGroup({
  type, reservations, data, lang, onSelect,
}: {
  type: ReservationAlertType;
  reservations: Reservation[];
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
  onSelect: (r: Reservation) => void;
}) {
  const { t } = useI18n();
  if (reservations.length === 0) return null;
  const meta = ALERT_META[type];
  const tone = alertTone(type);
  const Icon = meta.icon;
  const urgent = type.endsWith('Today') || type.endsWith('Overdue');

  return (
    <div className={`overflow-hidden rounded-2xl border-s-4 ${tone.accent} bg-white shadow-sm ring-1 ${tone.ring}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-md">
          <span className={`absolute inset-0 rounded-xl ${tone.solid}`} />
          {urgent && <span className={`absolute inset-0 rounded-xl opacity-40 animate-ping ${tone.solid}`} />}
          <Icon size={17} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-extrabold ${tone.title}`}>{t(meta.titleKey)}</p>
          <p className="truncate text-[11px] text-slate-500">
            {t(type.startsWith('activate') ? 'resAlert.actionActivate' : 'resAlert.actionCheckout')}
          </p>
        </div>
        <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-extrabold ${tone.soft}`}>{reservations.length}</span>
      </div>
      <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="divide-y divide-slate-100">
        {reservations.map((r) => {
          const remaining = reservationRemaining(r);
          const client = clientById(data, r.clientId);
          const name = `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim();
          const initials = name ? name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
          return (
            <motion.li key={r.id} variants={listItem}>
              <button
                onClick={() => onSelect(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-slate-50"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-extrabold ${tone.soft}`}>{initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-slate-800">{name || '—'}</span>
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{r.code}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    {client?.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {client.phone}</span>}
                    <span className="inline-flex items-center gap-1"><Building2 size={11} /> {reservationRoomLabels(data, r)}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ResStatusBadge status={r.status} />
                  {remaining > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">{formatDA(remaining)}</span>
                  )}
                </div>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
