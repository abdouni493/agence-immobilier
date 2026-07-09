import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Wallet,
  ShoppingCart, Wrench, HardHat, Coins, Plus, Tags, ShoppingBag, Handshake,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { SectionCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { TextField, RadioGroup, SegmentedControl } from '@/components/ui/Field';
import { AnimatedNumber } from '@/components/ui/AnimatedCounter';
import { caisseRecap, caisseBalance } from '@/store/selectors';
import { formatDA, formatDate, todayISO, addDaysISO, monthKey, cn } from '@/lib/utils';
import { clientName, reservationRoomLabels, roomName, mediatorName } from '@/lib/lookups';
import type { CashType } from '@/types';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function Caisse() {
  const { t, lang } = useI18n();
  const data = useAppData();
  const perms = useCurrentPermissions();

  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(addDaysISO(todayISO(), -7));
  const [customTo, setCustomTo] = useState(todayISO());
  const [txModal, setTxModal] = useState<CashType | null>(null);

  const [from, to] = useMemo((): [string, string] => {
    const today = todayISO();
    if (period === 'today') return [today, today];
    if (period === 'week') {
      const d = new Date(today);
      const day = (d.getDay() + 6) % 7;
      const start = addDaysISO(today, -day);
      return [start, addDaysISO(start, 6)];
    }
    if (period === 'month') {
      const mk = monthKey(today);
      return [`${mk}-01`, `${mk}-31`];
    }
    return [customFrom, customTo];
  }, [period, customFrom, customTo]);

  const recap = useMemo(() => caisseRecap(data, from, to), [data, from, to]);
  const balance = useMemo(() => caisseBalance(data), [data]);

  // income items (reservation + sale payments in range)
  const incomeItems = useMemo(() => {
    const items: { id: string; label: string; sub: string; amount: number; date: string; kind: 'res' | 'sale' }[] = [];
    for (const r of data.reservations) {
      if (r.status === 'cancelled') continue;
      for (const p of r.payments) {
        if (p.date >= from && p.date <= to) {
          items.push({ id: p.id, label: clientName(data, r.clientId), sub: `${r.code} · ${reservationRoomLabels(data, r)}`, amount: p.amount, date: p.date, kind: 'res' });
        }
      }
    }
    for (const s of data.sales) {
      for (const p of s.payments) {
        if (p.date >= from && p.date <= to) {
          items.push({ id: p.id, label: clientName(data, s.clientId), sub: `${s.code} · ${roomName(data, s.roomId)}`, amount: p.amount, date: p.date, kind: 'sale' });
        }
      }
    }
    return items.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data, from, to]);

  // outgoing items (purchase payments to sellers + mediator commissions in range)
  const purchaseItems = useMemo(() => {
    const items: { id: string; label: string; sub: string; amount: number; date: string }[] = [];
    for (const pu of data.purchases) {
      for (const p of pu.payments) {
        if (p.date >= from && p.date <= to) {
          items.push({ id: p.id, label: clientName(data, pu.clientId), sub: `${pu.code} · ${roomName(data, pu.roomId)}`, amount: p.amount, date: p.date });
        }
      }
    }
    return items.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data, from, to]);

  const mediatorItems = useMemo(() => {
    const items: { id: string; label: string; sub: string; amount: number; date: string }[] = [];
    for (const m of data.mediators) {
      for (const p of m.payments) {
        if (p.date >= from && p.date <= to) {
          items.push({ id: p.id, label: mediatorName(data, m.id), sub: p.note ?? t('caisse.mediatorsOut'), amount: p.amount, date: p.date });
        }
      }
    }
    return items.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data, from, to, t]);

  const manualTx = useMemo(
    () => data.cashTransactions.filter((tx) => tx.date >= from && tx.date <= to),
    [data.cashTransactions, from, to],
  );

  return (
    <div>
      <PageHeader
        icon={<Landmark size={24} />}
        title={t('caisse.title')}
        subtitle={t('caisse.subtitle')}
        actions={
          can(perms, 'caisse', 'create') && (
            <>
              <GradientButton variant="success" icon={<ArrowDownLeft size={18} />} onClick={() => setTxModal('deposit')}>{t('caisse.deposit')}</GradientButton>
              <GradientButton variant="danger" icon={<ArrowUpRight size={18} />} onClick={() => setTxModal('withdrawal')}>{t('caisse.withdrawal')}</GradientButton>
            </>
          )
        }
      />

      {/* Balance summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-1 relative overflow-hidden rounded-2xl bg-grad-secondary p-6 shadow-glow"
          style={{ backgroundSize: '200% 200%' }}>
          <div className="absolute inset-0 bg-grad-secondary animate-gradient-shift opacity-80" style={{ backgroundSize: '200% 200%' }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/80"><Wallet size={18} /><span className="text-sm font-medium">{t('caisse.balance')}</span></div>
            <p className="mt-2 text-4xl font-extrabold text-white"><AnimatedNumber value={balance} format={formatDA} /></p>
          </div>
        </motion.div>

        <SectionCard
          dark
          style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
          className="flex flex-col justify-center"
        >
          <div className="flex items-center gap-2 text-emerald-305 text-emerald-300"><TrendingUp size={18} /><span className="text-sm font-medium">{t('caisse.totalIn')}</span></div>
          <p className="mt-1 text-2xl font-extrabold text-white"><AnimatedNumber value={recap.totalIn} format={formatDA} /></p>
        </SectionCard>

        <SectionCard
          dark
          style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
          className="flex flex-col justify-center"
        >
          <div className="flex items-center gap-2 text-rose-350 text-rose-300"><TrendingDown size={18} /><span className="text-sm font-medium">{t('caisse.totalOut')}</span></div>
          <p className="mt-1 text-2xl font-extrabold text-white"><AnimatedNumber value={recap.totalOut} format={formatDA} /></p>
        </SectionCard>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SegmentedControl<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'today', label: t('common.today') },
            { value: 'week', label: t('common.week') },
            { value: 'month', label: t('common.month') },
            { value: 'custom', label: t('common.custom') },
          ]}
        />
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <TextField type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-ink-muted">→</span>
            <TextField type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: detail sections */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard
            dark
            style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
            title={t('caisse.gains')}
            icon={<TrendingUp size={18} />}
          >
            {incomeItems.length === 0 ? <Empty /> : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {incomeItems.map((it) => (
                  <Row key={it.id} label={it.label} sub={it.sub} date={formatDate(it.date, lang)} amount={it.amount} positive tag={it.kind === 'sale' ? t('nav.ventes') : undefined} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            dark
            style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
            title={t('caisse.expensesSection')}
            icon={<TrendingDown size={18} />}
          >
            <div className="space-y-3">
              <CatLine icon={<ShoppingCart size={15} />} label={t('caisse.generalExpenses')} total={recap.generalExpenses} breakdown={recap.generalByCategory} />
              <CatLine icon={<Wrench size={15} />} label={t('caisse.maintenances')} total={recap.maintenances} breakdown={recap.maintenanceByRoom} />
              <CatLine icon={<ShoppingBag size={15} />} label={t('caisse.purchasesOut')} total={recap.purchaseOut} breakdown={recap.purchaseByCode} />
              <CatLine icon={<Handshake size={15} />} label={t('caisse.mediatorsOut')} total={recap.mediatorOut} breakdown={recap.mediatorByName} />
              <SimpleLine icon={<HardHat size={15} />} label={t('caisse.salaries')} total={recap.salaries} />
              <SimpleLine icon={<Coins size={15} />} label={t('caisse.advances')} total={recap.advances} />
            </div>
          </SectionCard>

          {/* Mediator commission payments detail */}
          {mediatorItems.length > 0 && (
            <SectionCard
              dark
              style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
              title={t('caisse.mediatorsOut')}
              icon={<Handshake size={18} />}
            >
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mediatorItems.map((it) => (
                  <Row key={it.id} label={it.label} sub={it.sub} date={formatDate(it.date, lang)} amount={it.amount} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Purchase payouts detail */}
          {purchaseItems.length > 0 && (
            <SectionCard
              dark
              style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
              title={t('caisse.purchasesOut')}
              icon={<ShoppingBag size={18} />}
            >
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {purchaseItems.map((it) => (
                  <Row key={it.id} label={it.label} sub={it.sub} date={formatDate(it.date, lang)} amount={it.amount} tag={t('nav.achats')} />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard
            dark
            style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
            title={t('caisse.manualTx')}
            icon={<Wallet size={18} />}
          >
            {manualTx.length === 0 ? <Empty /> : (
              <div className="space-y-2">
                {manualTx.map((tx) => (
                  <Row key={tx.id} label={tx.description} sub={tx.type === 'deposit' ? t('caisse.deposit') : t('caisse.withdrawal')} date={formatDate(tx.date, lang)} amount={tx.amount} positive={tx.type === 'deposit'} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right: recap */}
        <div>
          <div
            className="rounded-2xl border border-white/10 shadow-xl overflow-hidden sticky top-24"
            style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
          >
            <div className="bg-white/10 px-5 py-4">
              <p className="text-sky-200/80 text-xs">{t('caisse.recap')}</p>
              <p className="text-white text-sm font-semibold">{formatDate(from, lang)} → {formatDate(to, lang)}</p>
            </div>
            <div className="p-5 space-y-2.5 text-sm">
              <RecapLine label={t('caisse.reservationsIncome')} value={recap.reservationIncome} positive />
              <RecapLine label={t('caisse.salesIncome')} value={recap.saleIncome} positive />
              <RecapLine label={t('caisse.manualDeposits')} value={recap.manualDeposits} positive />
              <div className="border-t border-white/10 pt-2.5 flex justify-between font-bold text-emerald-300">
                <span>{t('caisse.totalIn')}</span><span>+{formatDA(recap.totalIn)}</span>
              </div>

              <div className="pt-2 space-y-2.5">
                <RecapLine label={t('caisse.generalExpenses')} value={recap.generalExpenses} negative />
                <RecapLine label={t('caisse.maintenances')} value={recap.maintenances} negative />
                <RecapLine label={t('caisse.purchasesOut')} value={recap.purchaseOut} negative />
                <RecapLine label={t('caisse.mediatorsOut')} value={recap.mediatorOut} negative />
                <RecapLine label={t('caisse.salaries')} value={recap.salaries} negative />
                <RecapLine label={t('caisse.advances')} value={recap.advances} negative />
                <RecapLine label={t('caisse.manualWithdrawals')} value={recap.manualWithdrawals} negative />
                <div className="border-t border-white/10 pt-2.5 flex justify-between font-bold text-rose-300">
                  <span>{t('caisse.totalOut')}</span><span>−{formatDA(recap.totalOut)}</span>
                </div>
              </div>

              <div className="border-t-2 border-white/20 mt-2 pt-3 flex justify-between items-center">
                <span className="font-bold text-white">{t('caisse.netBalance')}</span>
                <span className={cn('text-xl font-extrabold', recap.net >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{formatDA(recap.net)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-sky-200/70">
                <span>{t('caisse.balance')}</span><span className="font-semibold text-white">{formatDA(balance)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {txModal && <CashTxModal type={txModal} onClose={() => setTxModal(null)} />}
    </div>
  );
}

function Empty() {
  const { t } = useI18n();
  return <p className="text-sm text-sky-200/60 text-center py-6">{t('common.noData')}</p>;
}

function Row({ label, sub, date, amount, positive, tag }: { label: string; sub: string; date: string; amount: number; positive?: boolean; tag?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
          {label}
          {tag && <span className="text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-white/15 text-sky-200 shrink-0">{tag}</span>}
        </p>
        <p className="text-xs text-sky-200/80 truncate">{sub} · {date}</p>
      </div>
      <span className={cn('text-sm font-bold shrink-0', positive ? 'text-emerald-350 text-emerald-300' : 'text-rose-350 text-rose-300')}>
        {positive ? '+' : '−'}{formatDA(amount)}
      </span>
    </div>
  );
}

function SimpleLine({ icon, label, total }: { icon: React.ReactNode; label: string; total: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/10 border border-white/10 px-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-white"><span className="text-rose-300">{icon}</span> {label}</span>
      <span className="text-sm font-bold text-rose-350 text-rose-300">−{formatDA(total)}</span>
    </div>
  );
}

function CatLine({ icon, label, total, breakdown }: { icon: React.ReactNode; label: string; total: number; breakdown: { name: string; total: number }[] }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/10 px-4 py-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-white"><span className="text-rose-300">{icon}</span> {label}</span>
        <span className="text-sm font-bold text-rose-350 text-rose-300">−{formatDA(total)}</span>
      </div>
      {breakdown.length > 0 && (
        <div className="mt-2 ps-6 space-y-1">
          {breakdown.map((b) => (
            <div key={b.name} className="flex items-center justify-between text-xs text-sky-200/80">
              <span>• {b.name}</span><span>−{formatDA(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecapLine({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between text-slate-250 text-slate-200">
      <span>{label}</span>
      <span className={cn('font-medium', positive ? 'text-emerald-305 text-emerald-300' : negative ? 'text-rose-350 text-rose-300' : 'text-white')}>
        {positive ? '+' : negative ? '−' : ''}{formatDA(value)}
      </span>
    </div>
  );
}

function CashTxModal({ type, onClose }: { type: CashType; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const addCashTransaction = useApp((s) => s.addCashTransaction);
  const [txType, setTxType] = useState<CashType>(type);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());

  const save = async () => {
    if (!amount || !description.trim()) return toast.error(t('login.required'));
    await addCashTransaction({ type: txType, amount: Number(amount), description: description.trim(), date });
    toast.success(t('toast.created'));
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={txType === 'deposit' ? t('caisse.deposit') : t('caisse.withdrawal')} size="sm"
      footer={<div className="flex gap-3 justify-end"><GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton><GradientButton variant={txType === 'deposit' ? 'success' : 'danger'} onClick={save}>{t('common.save')}</GradientButton></div>}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t('caisse.type')}</p>
          <RadioGroup<CashType> value={txType} onChange={setTxType} options={[{ value: 'deposit', label: t('caisse.deposit') }, { value: 'withdrawal', label: t('caisse.withdrawal') }]} />
        </div>
        <TextField label={`${t('common.amount')} (DA)`} required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <TextField label={t('common.description')} required value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </Modal>
  );
}
