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
  occupancyByFloor, expensesByCategory, reservationRemaining,
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
import { clientName, reservationRoomLabels, expenseCategoryName, clientById } from '@/lib/lookups';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import type { Reservation } from '@/types';

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

  const recentRes = data.reservations.slice(0, 5);
  const recentTx = data.cashTransactions.slice(0, 5);
  const recentExp = data.expenses.slice(0, 5);

  const kpiCards = [
    { label: t('dash.revenue'), value: kpis.monthRevenue, icon: <TrendingUp size={22} />, gradient: 'success' as const, format: formatDA, to: '/app/caisse' },
    { label: t('dash.expenses'), value: kpis.monthExpenses, icon: <TrendingDown size={22} />, gradient: 'warning' as const, format: formatDA, to: '/app/expenses' },
    { label: t('dash.balance'), value: kpis.balance, icon: <Wallet size={22} />, gradient: 'secondary' as const, format: formatDA, to: '/app/caisse' },
    { label: t('dash.debts'), value: kpis.clientDebts, icon: <AlertCircle size={22} />, gradient: 'gold' as const, format: formatDA, to: '/app/reservations' },
    { label: t('dash.roomsAvailable'), value: kpis.roomsAvailable, icon: <BedDouble size={22} />, gradient: 'primary' as const, suffix: `/ ${kpis.roomsTotal}`, to: '/app/chambres' },
    { label: t('dash.activeReservations'), value: kpis.activeToday, icon: <CalendarCheck size={22} />, gradient: 'purple' as const, to: '/app/reservations' },
    { label: t('dash.occupancy'), value: kpis.occupancy, icon: <PieIcon size={22} />, gradient: 'cyan' as const, suffix: '%', to: '/app/chambres' },
    { label: t('dash.maintenance'), value: kpis.roomsMaintenance, icon: <Wrench size={22} />, gradient: 'warning' as const, to: '/app/chambres' },
    { label: t('dash.totalClients'), value: kpis.totalClients, icon: <Users size={22} />, gradient: 'rose' as const, to: '/app/clients' },
    { label: t('dash.activeWorkers'), value: kpis.activeWorkers, icon: <HardHat size={22} />, gradient: 'teal' as const, to: '/app/workers' },
    { label: t('dash.monthReservations'), value: kpis.monthReservations, icon: <CalendarDays size={22} />, gradient: 'purple' as const, to: '/app/reservations' },
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
        {kpiCards.map((c) => (
          <StatsCard key={c.label} {...c} />
        ))}
        {/* Top service - text card */}
        <StatsCard
          label={t('dash.topService')}
          value={0}
          textValue={kpis.topService}
          icon={<Sparkles size={22} />}
          gradient="gold"
          to="/app/services"
        />
      </motion.div>

      {/* Reservation alerts — today / overdue / imminent (activation & checkout) */}
      {totalResAlerts > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50/40 p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
              <span className="absolute inset-0 rounded-xl bg-amber-500 opacity-40 animate-ping" />
              <Bell size={17} className="relative" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-700">{t('dash.resAlertsTitle')}</p>
              <p className="text-[11px] text-amber-600">{t('resAlert.filterHint', { count: totalResAlerts })}</p>
            </div>
          </div>
          <div className="space-y-4">
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
  const toneClass =
    tone === 'danger'
      ? 'border-rose-400/30 bg-rose-500/10 text-rose-600'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-600'
        : 'border-sky-400/30 bg-sky-500/10 text-sky-600';
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${toneClass}`}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-primary truncate">{title}</p>
        <p className="text-xs text-ink-secondary truncate">{sub}</p>
      </div>
      <Badge tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'info'}>{value}</Badge>
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
    <div className={`rounded-2xl border p-4 ${tone.banner}`}>
      <div className={`flex items-center gap-2 mb-1 font-bold text-sm ${tone.title}`}>
        <span className="relative grid h-7 w-7 place-items-center rounded-lg text-white shrink-0" >
          <span className={`absolute inset-0 rounded-lg ${tone.solid}`} />
          {urgent && <span className={`absolute inset-0 rounded-lg opacity-40 animate-ping ${tone.solid}`} />}
          <Icon size={14} className="relative" />
        </span>
        {t(meta.titleKey)}
        <span className="ml-1 rounded-full bg-white/80 px-2 py-0.5 text-xs">{reservations.length}</span>
      </div>
      <p className="mb-3 ml-9 text-[11px] text-slate-600">
        {t(type.startsWith('activate') ? 'resAlert.actionActivate' : 'resAlert.actionCheckout')}
      </p>
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {reservations.map((r) => {
          const remaining = reservationRemaining(r);
          const client = clientById(data, r.clientId);
          return (
            <motion.button
              key={r.id}
              variants={listItem}
              onClick={() => onSelect(r)}
              className="text-left rounded-xl border border-white/60 bg-white/70 p-3 transition-colors cursor-pointer hover:bg-white"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-ink-primary">{r.code}</span>
                <ResStatusBadge status={r.status} />
              </div>
              <p className="text-sm font-medium text-ink-primary truncate">{client?.firstName} {client?.lastName}</p>
              <div className="flex items-center gap-1 text-xs text-ink-secondary mt-0.5">
                <Phone size={11} /> {client?.phone}
              </div>
              <div className="flex items-center gap-1 text-xs text-ink-secondary mt-0.5">
                <Building2 size={11} /> {reservationRoomLabels(data, r)}
              </div>
              <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                <CalendarDays size={11} />
                {formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}
              </div>
              {remaining > 0 && (
                <p className="text-xs font-semibold text-amber-600 mt-1">{t('common.remaining')}: {formatDA(remaining)}</p>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
