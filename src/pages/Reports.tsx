import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, FileText, Printer, Sparkles, CalendarCheck, Users,
  BedDouble, Wrench, TrendingDown, HardHat, Landmark, Tags, ShoppingBag, Handshake,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { PageHeader, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { buildReportData, buildReportHTML, type ReportData } from '@/lib/report';
import { printHTML } from '@/lib/print';
import { reservationPaid, salePaid } from '@/store/selectors';
import { formatDA, formatDate, todayISO, addDaysISO, cn } from '@/lib/utils';
import { clientName, roomName } from '@/lib/lookups';

export default function Reports() {
  const { t, lang } = useI18n();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();

  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'activity' | 'salesPurchases' | 'clients' | 'charges'>('summary');

  const generate = () => {
    setLoading(true);
    setReport(null);
    setTimeout(() => {
      setReport(buildReportData(data, from, to));
      setLoading(false);
    }, 900);
  };

  const print = () => {
    if (report) printHTML('Rapport', buildReportHTML(data, report, storeInfo, from, to));
  };

  return (
    <div>
      <PageHeader
        icon={<BarChart3 size={24} />}
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          report && can(perms, 'reports', 'print') && (
            <GradientButton variant="glass" icon={<Printer size={18} />} onClick={print}>{t('reports.printReport')}</GradientButton>
          )
        }
      />

      <GradientCard className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} wrapClassName="flex-1 w-full" />
          <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} wrapClassName="flex-1 w-full" />
          <GradientButton icon={<Sparkles size={18} />} onClick={generate} glow>{t('reports.generate')}</GradientButton>
        </div>
      </GradientCard>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2]" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 0.9 }} />
                </div>
                <span className="text-sm text-ink-secondary">{t('reports.generating')}</span>
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </motion.div>
        ) : report ? (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Tab navigation */}
            <div className="flex border-b border-white/10 mb-6 overflow-x-auto scrollbar-none gap-2">
              {[
                { id: 'summary', label: t('reports.tabSummary'), icon: <FileText size={16} /> },
                { id: 'activity', label: t('reports.tabActivity'), icon: <CalendarCheck size={16} /> },
                { id: 'salesPurchases', label: t('reports.tabSalesPurchases'), icon: <Tags size={16} /> },
                { id: 'clients', label: t('reports.tabClients'), icon: <Users size={16} /> },
                { id: 'charges', label: t('reports.tabCharges'), icon: <TrendingDown size={16} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-205 whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-sky-500 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div
                  className="rounded-2xl border border-white/10 p-6 shadow-xl"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                    <FileText size={18} className="text-sky-305 text-sky-300" />
                    {t('reports.execSummary')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Stat label={t('reports.totalRevenue')} value={formatDA(report.totalRevenue)} tone="success" dark />
                    <Stat label={t('reports.totalExpenses')} value={formatDA(report.totalExpenses)} tone="danger" dark />
                    <Stat label={t('reports.netGain')} value={formatDA(report.netGain)} tone={report.netGain >= 0 ? 'success' : 'danger'} dark />
                    <Stat label={t('reports.avgOccupancy')} value={`${report.avgOccupancy}%`} dark />
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-white/10 p-6 shadow-xl"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                    <Landmark size={18} className="text-sky-305 text-sky-300" />
                    {t('reports.caisse')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Stat label={t('caisse.totalIn')} value={formatDA(report.caisse.totalIn)} tone="success" dark />
                    <Stat label={t('caisse.totalOut')} value={formatDA(report.caisse.totalOut)} tone="danger" dark />
                    <Stat label={t('caisse.netBalance')} value={formatDA(report.caisse.net)} tone={report.caisse.net >= 0 ? 'success' : 'danger'} dark />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className="lg:col-span-2 rounded-2xl border border-white/10 p-6 shadow-xl space-y-4"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <CalendarCheck size={18} className="text-sky-305 text-sky-300" />
                    {t('reports.reservations')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral" className="bg-white/10 border-white/10 text-white">{t('common.total')}: {report.reservations.total}</Badge>
                    <Badge tone="success" className="bg-emerald-500/15 border-emerald-450/30 text-emerald-300">{t('res.statusPaid')}: {report.reservations.paid}</Badge>
                    <Badge tone="danger" className="bg-rose-500/15 border-rose-450/30 text-rose-300">{t('res.statusDebt')}: {report.reservations.debt}</Badge>
                    <Badge tone="neutral" className="bg-white/10 border-white/10 text-white">{t('res.statusCancelled')}: {report.reservations.cancelled}</Badge>
                    {report.reservations.topClient && (
                      <Badge tone="purple" className="bg-violet-500/15 border-violet-400/30 text-violet-300">★ {report.reservations.topClient.name}</Badge>
                    )}
                  </div>
                  <ReportTable
                    head={['Code', t('clients.title'), t('res.checkIn'), t('common.nights'), t('common.total'), t('common.paid')]}
                    rows={report.reservations.list.slice(0, 12).map((r) => [
                      r.code, clientName(data, r.clientId), formatDate(r.checkIn, lang), String(r.nights), formatDate(r.checkIn, lang) === '—' ? '—' : formatDA(r.total), formatDA(reservationPaid(r)),
                    ])}
                  />
                </div>

                <div
                  className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <BedDouble size={18} className="text-sky-355 text-sky-300" />
                    {t('reports.rooms')}
                  </h3>
                  <div>
                    <p className="text-xs font-bold text-sky-200/80 uppercase mb-3">{t('dash.occupancyByFloor')}</p>
                    <div className="space-y-3">
                      {report.rooms.occupancy.map((o) => (
                        <div key={o.name} className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200 w-16 truncate">{o.name}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400" style={{ width: `${o.rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-white w-10 text-end">{o.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <Stat label={t('reports.mostProfitableRoom')} value={report.rooms.mostProfitable ? `${report.rooms.mostProfitable.name} · ${formatDA(report.rooms.mostProfitable.revenue)}` : '—'} tone="success" dark />
                    <Stat label={t('expenses.tabMaintenance')} value={`${report.rooms.maintenances.length} · ${formatDA(report.rooms.maintTotal)}`} tone="danger" dark />
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs font-bold text-sky-200/80 uppercase mb-2">{t('reports.nightsSold')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.reservations.nightsSold.slice(0, 8).map((n) => (
                        <span key={n.name} className="text-[11px] font-semibold rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-slate-200">{n.name}: {n.nights}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'salesPurchases' && (
              <div className="space-y-6">
                {/* KPI strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-2xl border border-white/10 p-6 shadow-xl" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                      <Tags size={18} className="text-emerald-300" /> {t('reports.sales')} ({report.sales.count})
                    </h3>
                    <div className="space-y-3">
                      <Stat label={t('sales.totalSales')} value={formatDA(report.sales.totalValue)} dark />
                      <Stat label={t('reports.salesRevenue')} value={formatDA(report.sales.collected)} tone="success" dark />
                      <Stat label={t('reports.salesDebts')} value={formatDA(report.sales.debts)} tone={report.sales.debts > 0 ? 'danger' : 'default'} dark />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 p-6 shadow-xl" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                      <ShoppingBag size={18} className="text-amber-300" /> {t('reports.purchases')} ({report.purchases.count})
                    </h3>
                    <div className="space-y-3">
                      <Stat label={t('reports.purchasesCost')} value={formatDA(report.purchases.totalCost)} dark />
                      <Stat label={t('reports.purchasesPaid')} value={formatDA(report.purchases.paid)} tone="success" dark />
                      <Stat label={t('reports.purchasesRemaining')} value={formatDA(report.purchases.remaining)} tone={report.purchases.remaining > 0 ? 'danger' : 'default'} dark />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 p-6 shadow-xl" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                      <Handshake size={18} className="text-sky-300" /> {t('reports.mediators')}
                    </h3>
                    <div className="space-y-3">
                      <Stat label={t('reports.commissionsEarned')} value={formatDA(report.mediators.commissionsEarned)} dark />
                      <Stat label={t('reports.commissionsPaid')} value={formatDA(report.mediators.commissionsPaid)} tone="success" dark />
                      <Stat label={t('reports.commissionsOwed')} value={formatDA(report.mediators.commissionsOwed)} tone={report.mediators.commissionsOwed > 0 ? 'danger' : 'default'} dark />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                      <Tags size={18} className="text-emerald-300" /> {t('reports.sales')}
                    </h3>
                    <ReportTable
                      head={['Code', t('rooms.title'), t('clients.title'), t('common.total'), t('common.paid')]}
                      rows={report.sales.list.slice(0, 12).map((s) => [s.code, roomName(data, s.roomId), clientName(data, s.clientId), formatDA(s.price), formatDA(salePaid(s))])}
                      empty={report.sales.list.length === 0}
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                      <ShoppingBag size={18} className="text-amber-300" /> {t('reports.purchases')}
                    </h3>
                    <ReportTable
                      head={['Code', t('rooms.title'), t('purchases.seller'), t('purchases.purchasePrice'), t('common.paid')]}
                      rows={report.purchases.list.slice(0, 12).map((p) => [p.code, roomName(data, p.roomId), clientName(data, p.clientId), formatDA(p.purchasePrice), formatDA(p.payments.reduce((s, x) => s + x.amount, 0))])}
                      empty={report.purchases.list.length === 0}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <Handshake size={18} className="text-sky-300" /> {t('reports.mediators')}
                  </h3>
                  <ReportTable
                    head={[t('common.name'), t('mediators.salesCount'), t('reports.commissionsEarned'), t('reports.commissionsOwed')]}
                    rows={report.mediators.top.map((m) => [m.name, String(m.count), formatDA(m.earned), formatDA(m.owed)])}
                    empty={report.mediators.top.length === 0}
                  />
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className="lg:col-span-2 rounded-2xl border border-white/10 p-6 shadow-xl space-y-4"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <Users size={18} className="text-sky-355 text-sky-300" />
                    {t('reports.clients')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-sky-200/80 uppercase mb-2">{t('reports.topClients')}</p>
                      <div className="space-y-1">
                        {report.clients.top.map((c, i) => (
                          <div key={c.name} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
                            <span className="text-slate-200 font-medium">{i + 1}. {c.name}</span>
                            <span className="text-white font-bold">{formatDA(c.total)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-white mt-4 bg-white/10 border border-white/10 rounded-xl px-3 py-2 inline-block">
                        {t('reports.newClients')}: <span className="text-sky-300 font-bold">{report.clients.newCount}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sky-200/80 uppercase mb-2">{t('dash.debts')} ({formatDA(report.clients.totalDebt)})</p>
                      <div className="space-y-1">
                        {report.clients.debts.slice(0, 6).map((d) => (
                          <div key={d.name} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
                            <span className="text-slate-200 font-medium">{d.name}</span>
                            <span className="text-rose-300 font-bold">{formatDA(d.amount)}</span>
                          </div>
                        ))}
                        {report.clients.debts.length === 0 && <p className="text-sm text-slate-350">—</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <Sparkles size={18} className="text-sky-355 text-sky-300" />
                    {t('reports.services')}
                  </h3>
                  <ReportTable
                    head={[t('common.name'), t('common.total'), 'CA']}
                    rows={report.services.sold.map((s) => [s.name, String(s.qty), formatDA(s.revenue)])}
                    empty={report.services.sold.length === 0}
                  />
                </div>
              </div>
            )}

            {activeTab === 'charges' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                  className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <TrendingDown size={18} className="text-rose-300" />
                    {t('reports.expensesDetail')}
                  </h3>
                  <ReportTable
                    head={[t('common.category'), t('common.amount')]}
                    rows={report.expensesDetail.byCategory.map((c) => [c.name, formatDA(c.total)])}
                    empty={report.expensesDetail.byCategory.length === 0}
                  />
                  <p className="text-sm text-slate-200 mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                    <Wrench size={16} className="text-sky-300" />
                    {t('caisse.maintenances')}: <span className="text-rose-300 font-bold">{formatDA(report.rooms.maintTotal)}</span>
                  </p>
                </div>

                <div
                  className="rounded-2xl border border-white/10 p-6 shadow-xl space-y-4"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                    <HardHat size={18} className="text-sky-355 text-sky-300" />
                    {t('reports.staff')}
                  </h3>
                  <ReportTable
                    head={[t('nav.workers'), t('common.paid')]}
                    rows={report.staff.payments.map((p) => [p.name, formatDA(p.total)])}
                    empty={report.staff.payments.length === 0}
                  />
                  <div className="text-xs text-sky-200/80 mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-2">
                    <p>{t('workers.advances')}: <span className="font-semibold text-white">{formatDA(report.staff.advances)}</span></p>
                    <p>{t('workers.absences')}: <span className="font-semibold text-white">{report.staff.absences}</span></p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center py-20 rounded-2xl border border-white/10 shadow-xl px-6"
            style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/10 text-white mb-5 shadow-sm"><BarChart3 size={36} /></div>
            <h3 className="text-lg font-bold text-white">Aucun rapport généré</h3>
            <p className="text-sm text-sky-200/80 mt-2 max-w-sm">Choisissez une période ci-dessus puis cliquez sur le bouton <strong>Générer</strong> pour obtenir les statistiques détaillées.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function ReportTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty?: boolean }) {
  const { t } = useI18n();
  if (empty || rows.length === 0) return <p className="text-sm text-sky-200/60 text-center py-4">{t('common.noData')}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {head.map((h, i) => <th key={h} className={cn('py-2 px-3 text-xs font-semibold text-sky-200/80 uppercase', i === 0 ? 'text-start' : 'text-end')}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5">
              {row.map((cell, ci) => <td key={ci} className={cn('py-2 px-3', ci === 0 ? 'text-start text-white font-medium' : 'text-end text-slate-205 text-slate-200')}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
