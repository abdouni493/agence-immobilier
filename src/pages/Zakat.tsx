import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark, Calculator, RotateCcw, Printer, Coins, Wallet, Building2,
  Handshake, Package, PlusCircle, TrendingDown, Info, CheckCircle2, XCircle, Sparkles,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { SectionCard } from '@/components/ui/GradientCard';
import { TextField, SelectField } from '@/components/ui/Field';
import { caisseRecap, saleRemaining, purchaseRemaining, mediatorRemaining, reservationRemaining } from '@/store/selectors';
import { printDoc, buildZakatReportHTML } from '@/lib/print';
import { todayISO } from '@/lib/utils';
import {
  computeZakat, emptyZakatInputs, formatDZD, parseAmount, zakatYearRange,
  DEFAULT_NISAB_DZD, NISAB_GOLD_GRAMS, ZAKAT_RATE,
  type ZakatInputs,
} from '@/lib/zakat';

/** The seven amount fields, in the order they appear in the form. */
type AmountKey = Exclude<keyof ZakatInputs, never>;

export default function Zakat() {
  const { t } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();

  const currentYear = Number(todayISO().slice(0, 4));
  const [year, setYear] = useState(currentYear);

  // Raw strings so the field can be cleared while typing; parsed on every render.
  const [raw, setRaw] = useState<Record<AmountKey, string>>(() => ({
    bankCash: '',
    cashOnHand: '',
    receivableCommissions: '',
    propertiesForSale: '',
    tradeInventory: '',
    otherAssets: '',
    currentLiabilities: '',
    nisabInput: String(DEFAULT_NISAB_DZD),
    goldPricePerGram: '',
  }));
  const [result, setResult] = useState<ReturnType<typeof computeZakat> | null>(null);

  const set = (key: AmountKey, value: string) => {
    setRaw((r) => ({ ...r, [key]: value }));
    setResult(null);
  };

  const parsed = useMemo(() => {
    const out = {} as ZakatInputs;
    const errors = {} as Record<AmountKey, boolean>;
    for (const key of Object.keys(raw) as AmountKey[]) {
      const { value, error } = parseAmount(raw[key]);
      out[key] = value;
      errors[key] = error;
    }
    if (raw.nisabInput.trim() === '') out.nisabInput = DEFAULT_NISAB_DZD;
    return { inputs: out, errors, hasError: Object.values(errors).some(Boolean) };
  }, [raw]);

  /** Live preview (also what "Calculer" freezes into `result`). */
  const preview = useMemo(() => computeZakat(parsed.inputs), [parsed.inputs]);

  // ── Figures pulled from the agency's own books for the selected year ──────
  const yearFigures = useMemo(() => {
    const { from, to } = zakatYearRange(year);
    const recap = caisseRecap(data, from, to);

    // Cash actually available at the end of the year (all flows up to 31 Dec).
    const cashAtYearEnd = caisseRecap(data, '2000-01-01', to).net;

    // Money the agency is still owed on operations closed within the year.
    const receivable =
      data.sales
        .filter((s) => s.date >= from && s.date <= to)
        .reduce((sum, s) => sum + saleRemaining(s), 0) +
      data.reservations
        .filter((r) => r.status !== 'cancelled' && r.checkIn >= from && r.checkIn <= to)
        .reduce((sum, r) => sum + reservationRemaining(r), 0);

    // Properties the agency owns and still holds for resale.
    const soldRoomIds = new Set(data.sales.map((s) => s.roomId));
    const stock = data.rooms
      .filter((r) => r.propertyType === 'sale' && !soldRoomIds.has(r.id))
      .reduce((sum, r) => sum + (r.salePrice ?? r.purchasePrice ?? 0), 0);

    // Debts due now: unpaid purchases + commissions owed to mediators.
    const liabilities =
      data.purchases.reduce((sum, p) => sum + purchaseRemaining(p), 0) +
      data.mediators.reduce((sum, m) => sum + mediatorRemaining(m, data.sales), 0);

    return { from, to, netGain: recap.net, totalIn: recap.totalIn, totalOut: recap.totalOut, cashAtYearEnd, receivable, stock, liabilities };
  }, [data, year]);

  const autoFill = () => {
    setRaw((r) => ({
      ...r,
      cashOnHand: String(Math.max(0, Math.round(yearFigures.cashAtYearEnd))),
      receivableCommissions: String(Math.max(0, Math.round(yearFigures.receivable))),
      propertiesForSale: String(Math.max(0, Math.round(yearFigures.stock))),
      currentLiabilities: String(Math.max(0, Math.round(yearFigures.liabilities))),
    }));
    setResult(null);
    toast.success(t('zakat.autoFilled'));
  };

  const calculate = () => {
    if (parsed.hasError) return toast.error(t('zakat.invalidInput'));
    setResult(computeZakat(parsed.inputs));
  };

  const reset = () => {
    setRaw({
      bankCash: '', cashOnHand: '', receivableCommissions: '', propertiesForSale: '',
      tradeInventory: '', otherAssets: '', currentLiabilities: '',
      nisabInput: String(DEFAULT_NISAB_DZD), goldPricePerGram: '',
    });
    setResult(null);
  };

  const print = () => {
    const r = result ?? preview;
    printDoc(t('zakat.title'), () => buildZakatReportHTML(storeInfo, parsed.inputs, r, year));
  };

  const shown = result ?? preview;
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);

  const assetRows: { key: AmountKey; label: string; icon: React.ReactNode }[] = [
    { key: 'bankCash', label: t('zakat.bankCash'), icon: <Landmark size={16} /> },
    { key: 'cashOnHand', label: t('zakat.cashOnHand'), icon: <Wallet size={16} /> },
    { key: 'receivableCommissions', label: t('zakat.receivableCommissions'), icon: <Handshake size={16} /> },
    { key: 'propertiesForSale', label: t('zakat.propertiesForSale'), icon: <Building2 size={16} /> },
    { key: 'tradeInventory', label: t('zakat.tradeInventory'), icon: <Package size={16} /> },
    { key: 'otherAssets', label: t('zakat.otherAssets'), icon: <PlusCircle size={16} /> },
  ];

  return (
    <div>
      <PageHeader
        icon={<Coins size={24} />}
        title={t('zakat.title')}
        subtitle={t('zakat.subtitle')}
        actions={
          can(perms, 'reports', 'print') && (
            <GradientButton variant="glass" icon={<Printer size={18} />} onClick={print}>
              {t('common.print')}
            </GradientButton>
          )
        }
      />

      {/* Accounting year — 1 Jan → 31 Dec */}
      <SectionCard className="mb-6" title={t('zakat.periodTitle')} icon={<Sparkles size={18} />}>
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <SelectField
            label={t('zakat.year')}
            wrapClassName="w-full lg:w-48"
            value={String(year)}
            onChange={(e) => { setYear(Number(e.target.value)); setResult(null); }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </SelectField>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Figure label={t('caisse.totalIn')} value={formatDZD(yearFigures.totalIn)} tone="success" />
            <Figure label={t('caisse.totalOut')} value={formatDZD(yearFigures.totalOut)} tone="danger" />
            <Figure
              label={t('zakat.yearNetGain')}
              value={formatDZD(yearFigures.netGain)}
              tone={yearFigures.netGain >= 0 ? 'success' : 'danger'}
            />
            <Figure label={t('zakat.cashAtYearEnd')} value={formatDZD(yearFigures.cashAtYearEnd)} />
          </div>
          <GradientButton icon={<Sparkles size={17} />} onClick={autoFill}>
            {t('zakat.autoFill')}
          </GradientButton>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-muted">
          <Info size={13} className="mt-0.5 shrink-0 text-brand-400" />
          {t('zakat.periodHint', { from: yearFigures.from, to: yearFigures.to })}
        </p>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Inputs ── */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title={t('zakat.assetsTitle')} icon={<Wallet size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assetRows.map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  icon={f.icon}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={raw[f.key]}
                  error={parsed.errors[f.key] ? t('zakat.negative') : undefined}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <span className="text-sm font-semibold text-ink-secondary">{t('zakat.totalAssets')}</span>
              <span className="text-lg font-extrabold text-emerald-600">{formatDZD(shown.totalAssets)}</span>
            </div>
          </SectionCard>

          <SectionCard title={t('zakat.liabilitiesTitle')} icon={<TrendingDown size={18} />}>
            <TextField
              label={t('zakat.currentLiabilities')}
              icon={<TrendingDown size={16} />}
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={raw.currentLiabilities}
              error={parsed.errors.currentLiabilities ? t('zakat.negative') : undefined}
              onChange={(e) => set('currentLiabilities', e.target.value)}
            />
            <p className="mt-2 text-[11px] text-ink-muted">{t('zakat.liabilitiesHint')}</p>
          </SectionCard>

          <SectionCard title={t('zakat.nisabTitle')} icon={<Coins size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label={t('zakat.goldPrice')}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={raw.goldPricePerGram}
                error={parsed.errors.goldPricePerGram ? t('zakat.negative') : undefined}
                onChange={(e) => set('goldPricePerGram', e.target.value)}
              />
              <TextField
                label={t('zakat.nisabManual')}
                type="number"
                min={0}
                step="0.01"
                value={raw.nisabInput}
                error={parsed.errors.nisabInput ? t('zakat.negative') : undefined}
                onChange={(e) => set('nisabInput', e.target.value)}
                disabled={parsed.inputs.goldPricePerGram > 0}
              />
            </div>
            <p className="mt-2 flex items-start gap-2 text-[11px] text-ink-muted">
              <Info size={13} className="mt-0.5 shrink-0 text-brand-400" />
              {t('zakat.nisabHint', { grams: String(NISAB_GOLD_GRAMS), value: formatDZD(DEFAULT_NISAB_DZD) })}
            </p>
          </SectionCard>

          <div className="flex flex-wrap gap-3">
            <GradientButton icon={<Calculator size={18} />} onClick={calculate} glow>
              {t('zakat.calculate')}
            </GradientButton>
            <GradientButton variant="glass" icon={<RotateCcw size={18} />} onClick={reset}>
              {t('zakat.reset')}
            </GradientButton>
          </div>
        </div>

        {/* ── Result ── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 shadow-xl overflow-hidden sticky top-24 card-dark"
          >
            <div className="bg-white/10 px-5 py-4">
              <p className="text-xs text-sky-200/80">{t('zakat.resultTitle')}</p>
              <p className="text-sm font-semibold text-white">{yearFigures.from} → {yearFigures.to}</p>
            </div>

            <div className="p-5 space-y-2.5 text-sm">
              <ResultLine label={t('zakat.totalAssets')} value={formatDZD(shown.totalAssets)} tone="success" />
              <ResultLine label={t('zakat.totalLiabilities')} value={formatDZD(shown.totalLiabilities)} tone="danger" />
              <div className="border-t border-white/10 pt-2.5">
                <ResultLine label={t('zakat.netWealth')} value={formatDZD(shown.netWealth)} strong />
              </div>
              <ResultLine
                label={`${t('zakat.nisab')}${shown.nisabFromGold ? ` (${NISAB_GOLD_GRAMS} g)` : ''}`}
                value={formatDZD(shown.nisab)}
              />

              <div
                className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 ${
                  shown.isDue
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border border-white/10 text-ink-secondary'
                }`}
              >
                {shown.isDue ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                <span className="text-xs font-semibold">
                  {shown.isDue ? t('zakat.nisabReached') : t('zakat.nisabNotReached')}
                </span>
              </div>

              <div className="border-t-2 border-white/20 mt-3 pt-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-sky-200/80">
                  {t('zakat.zakatDue')} · {(ZAKAT_RATE * 100).toFixed(1)}%
                </p>
                <p className={`mt-1 text-3xl font-extrabold ${shown.isDue ? 'text-emerald-300' : 'text-ink-secondary'}`}>
                  {formatDZD(shown.zakat)}
                </p>
                {!shown.isDue && <p className="mt-2 text-xs text-ink-muted">{t('zakat.noZakat')}</p>}
              </div>
            </div>

            {/* Calculation steps */}
            <div className="border-t border-white/10 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-200/80 mb-2">
                {t('zakat.stepsTitle')}
              </p>
              <table className="w-full text-xs">
                <tbody>
                  <StepRow label={t('zakat.stepAssets')} value={formatDZD(shown.totalAssets)} />
                  <StepRow label={t('zakat.stepLiabilities')} value={`− ${formatDZD(shown.totalLiabilities)}`} />
                  <StepRow label={t('zakat.stepNet')} value={formatDZD(shown.netWealth)} strong />
                  <StepRow label={t('zakat.stepNisab')} value={formatDZD(shown.nisab)} />
                  <StepRow
                    label={t('zakat.stepRate')}
                    value={shown.isDue ? `${formatDZD(shown.netWealth)} × 2.5%` : '—'}
                  />
                  <StepRow label={t('zakat.stepZakat')} value={formatDZD(shown.zakat)} strong />
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="rounded-xl bg-slate-100/70 border border-slate-200 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted truncate">{label}</p>
      <p
        className={`text-sm font-bold mt-0.5 truncate ${
          tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-rose-600' : 'text-ink-primary'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ResultLine({
  label, value, tone, strong,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-ink-secondary">
      <span className={strong ? 'font-semibold text-white' : ''}>{label}</span>
      <span
        className={`text-end ${strong ? 'font-extrabold text-white' : 'font-medium'} ${
          tone === 'success' ? 'text-emerald-300' : tone === 'danger' ? 'text-rose-300' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StepRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className={`py-1.5 pe-2 ${strong ? 'font-bold text-white' : 'text-ink-secondary'}`}>{label}</td>
      <td className={`py-1.5 text-end ${strong ? 'font-bold text-white' : 'text-ink-secondary'}`}>{value}</td>
    </tr>
  );
}
