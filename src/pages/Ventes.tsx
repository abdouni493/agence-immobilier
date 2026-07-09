import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tags, Plus, Eye, Pencil, Printer, CreditCard, User, Phone, Building2, MapPin,
  Trash2, Wallet, Handshake, CalendarDays, DollarSign, FileText, Coins,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, SearchInput, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { TextField, SegmentedControl } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PrintPrompt } from '@/components/ui/PrintPrompt';
import { SaleWizard } from '@/components/sales/SaleWizard';
import { salePaid, saleRemaining } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, cn } from '@/lib/utils';
import { clientName, clientById, roomName, mediatorName, roomLocation } from '@/lib/lookups';
import {
  buildSaleInvoiceHTML, buildSalePaymentReceiptHTML, printHTML,
} from '@/lib/print';
import type { Sale, Payment } from '@/types';

type StatusFilter = 'all' | 'paid' | 'debt';

function SaleStatusBadge({ status }: { status: Sale['status'] }) {
  const { t } = useI18n();
  if (status === 'paid') {
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('sales.statusPaid')}</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-dot" /> {t('sales.statusDebt')}</span>;
}

export default function Ventes() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();
  const deleteSale = useApp((s) => s.deleteSale);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [payFor, setPayFor] = useState<Sale | null>(null);
  const [deleteOne, setDeleteOne] = useState<Sale | null>(null);
  const [printAsk, setPrintAsk] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.sales
      .filter((s) => {
        if (status !== 'all' && s.status !== status) return false;
        if (q) {
          const c = clientById(data, s.clientId);
          const hay = `${c?.firstName ?? ''} ${c?.lastName ?? ''} ${c?.phone ?? ''} ${roomName(data, s.roomId)} ${s.code}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const byCreated = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        if (byCreated !== 0) return byCreated;
        return b.code.localeCompare(a.code);
      });
  }, [data, search, status]);

  const totals = useMemo(() => {
    let total = 0, collected = 0, debts = 0;
    for (const s of data.sales) { total += s.price; collected += salePaid(s); debts += saleRemaining(s); }
    return { total, collected, debts };
  }, [data.sales]);

  const openCreate = () => { setEditing(null); setWizardOpen(true); };
  const openEdit = (s: Sale) => { setEditing(s); setWizardOpen(true); };
  const printInvoice = (s: Sale) => printHTML(s.code, buildSaleInvoiceHTML(data, s, storeInfo));

  const canDelete = can(perms, 'ventes', 'delete');

  return (
    <div>
      <PageHeader
        icon={<Tags size={24} />}
        title={t('sales.title')}
        subtitle={t('sales.subtitle')}
        actions={can(perms, 'ventes', 'create') && (
          <GradientButton icon={<Plus size={18} />} onClick={openCreate}>{t('sales.new')}</GradientButton>
        )}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label={t('sales.totalSales')} value={formatDA(totals.total)} />
        <Stat label={t('sales.collected')} value={formatDA(totals.collected)} tone="success" />
        <Stat label={t('sales.debts')} value={formatDA(totals.debts)} tone={totals.debts > 0 ? 'danger' : 'default'} />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder={t('sales.searchPlaceholder')} className="flex-1" />
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={setStatus}
          size="sm"
          options={[
            { value: 'all', label: t('res.filterAll') },
            { value: 'paid', label: t('sales.statusPaid') },
            { value: 'debt', label: t('sales.statusDebt') },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Tags size={36} />}
          title={t('common.noResults')}
          hint={t('common.emptyHint')}
          action={can(perms, 'ventes', 'create') && <GradientButton icon={<Plus size={18} />} onClick={openCreate}>{t('sales.new')}</GradientButton>}
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((s) => {
              const remaining = saleRemaining(s);
              return (
                <motion.div key={s.id} variants={listItem} layout exit={{ opacity: 0, scale: 0.95 }}>
                  <GradientCard className="p-5 h-full flex flex-col border border-white/10 shadow-xl" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-sky-200 truncate">{s.code}</span>
                      <SaleStatusBadge status={s.status} />
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Building2 size={15} className="text-sky-300" /> {roomName(data, s.roomId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <MapPin size={13} className="text-sky-300" /> {roomLocation(data, s.roomId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <User size={13} className="text-sky-300" /> {clientName(data, s.clientId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <Phone size={13} className="text-sky-300" /> {clientById(data, s.clientId)?.phone}
                      </p>
                      {s.mediatorId && (
                        <p className="flex items-center gap-2 text-xs text-amber-200">
                          <Handshake size={13} className="text-amber-300" /> {mediatorName(data, s.mediatorId)} · {formatDA(s.mediatorCommission)}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <CalendarDays size={13} className="text-sky-300" /> {formatDate(s.date, lang)} · {s.time}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-md p-2.5">
                      <div>
                        <p className="text-[10px] text-slate-300">{t('sales.salePrice')}</p>
                        <p className="text-xs font-bold text-white">{formatDA(s.price)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-300">{t('common.paid')}</p>
                        <p className="text-xs font-bold text-emerald-300">{formatDA(salePaid(s))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-300">{t('common.remaining')}</p>
                        <p className={`text-xs font-bold ${remaining > 0 ? 'text-amber-300' : 'text-slate-300'}`}>{formatDA(remaining)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 flex-wrap">
                      <button onClick={() => setDetail(s)} className="btn-card-action btn-action-view flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold" title={t('common.view')}>
                        <Eye size={15} /> {t('common.view')}
                      </button>
                      {can(perms, 'ventes', 'edit') && (
                        <button onClick={() => openEdit(s)} className="btn-card-action btn-action-edit" title={t('common.edit')}><Pencil size={15} /></button>
                      )}
                      {can(perms, 'ventes', 'print') && (
                        <button onClick={() => printInvoice(s)} className="btn-card-action btn-action-print" title={t('common.print')}><Printer size={15} /></button>
                      )}
                      {can(perms, 'ventes', 'pay') && remaining > 0 && (
                        <button onClick={() => setPayFor(s)} className="btn-card-action btn-action-pay" title={t('common.pay')}><CreditCard size={15} /></button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteOne(s)} className="btn-card-action btn-action-delete" title={t('common.delete')}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </GradientCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {wizardOpen && (
        <SaleWizard
          open={wizardOpen}
          editing={editing}
          onClose={() => { setWizardOpen(false); setEditing(null); }}
          onCreated={(s) => setPrintAsk(s)}
        />
      )}

      <SaleDetailModal sale={detail} onClose={() => setDetail(null)} onPrint={printInvoice} onPay={(s) => { setDetail(null); setPayFor(s); }} data={data} lang={lang} />
      <SalePaymentModal sale={payFor} onClose={() => setPayFor(null)} />

      {/* Print prompt after creation */}
      <PrintPrompt
        open={!!printAsk}
        onClose={() => setPrintAsk(null)}
        onConfirm={() => { if (printAsk) printInvoice(printAsk); }}
        title={t('sales.printInvoice')}
        message={t('sales.askPrint')}
      />

      <ConfirmDialog
        open={!!deleteOne}
        onClose={() => setDeleteOne(null)}
        onConfirm={async () => { if (deleteOne) { await deleteSale(deleteOne.id); toast.success(t('toast.deleted')); } }}
        title={t('sales.deleteTitle')}
        message={`${t('common.deleteMsg')} (${deleteOne?.code})`}
      />
    </div>
  );
}

function SaleDetailModal({
  sale, onClose, onPrint, onPay, data, lang,
}: {
  sale: Sale | null;
  onClose: () => void;
  onPrint: (s: Sale) => void;
  onPay: (s: Sale) => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const s = sale;
  if (!s) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const client = clientById(data, s.clientId);
  const room = data.rooms.find((r) => r.id === s.roomId);
  const paid = salePaid(s);
  const remaining = saleRemaining(s);
  const pct = s.price > 0 ? Math.min(100, Math.round((paid / s.price) * 100)) : 0;

  return (
    <Modal
      open={!!sale}
      onClose={onClose}
      title={<div className="flex items-center gap-3"><span className="text-xl font-bold bg-gradient-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end bg-clip-text text-transparent">{s.code}</span><SaleStatusBadge status={s.status} /></div>}
      subtitle={client ? `${client.firstName} ${client.lastName}` : ''}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end items-center">
          <button onClick={() => onPrint(s)} className="flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 bg-white text-ink-secondary text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
            <Printer size={16} /> {t('common.print')}
          </button>
          {remaining > 0 && (
            <button onClick={() => onPay(s)} className="btn-saas-primary h-11 px-6 text-sm active:scale-95 flex items-center gap-2">
              <CreditCard size={16} /> {t('common.pay')}
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-800">
        <div className="lg:col-span-8 space-y-6">
          {/* Apartment */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Building2 size={14} className="text-saas-primary-via" /> {t('sales.stepApartment')}
            </h4>
            {room ? (
              <div className="space-y-2 text-sm">
                <p className="text-base font-bold text-ink-primary">{room.name}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {room.wilaya && <InfoLine label={t('apt.wilaya')} value={room.wilaya} />}
                  {room.commune && <InfoLine label={t('apt.commune')} value={room.commune} />}
                  {room.secteur && <InfoLine label={t('apt.secteur')} value={room.secteur} />}
                  <InfoLine label={t('apt.roomsNumber')} value={String(room.capacity)} />
                </div>
                {room.description && <p className="text-xs text-ink-secondary pt-2 border-t border-slate-100">{room.description}</p>}
              </div>
            ) : <p className="text-sm text-ink-muted">—</p>}
          </div>

          {/* Buyer */}
          {client && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <User size={14} className="text-saas-primary-via" /> {t('sales.buyer')}
              </h4>
              <p className="text-base font-bold text-ink-primary">{client.firstName} {client.lastName}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <InfoLine label={t('common.phone')} value={client.phone} />
                {client.email && <InfoLine label={t('common.email')} value={client.email} />}
                {client.city && <InfoLine label={t('clients.city')} value={client.city} />}
                {client.documentNumber && <InfoLine label={client.documentType ?? t('clients.idDocument')} value={client.documentNumber} />}
              </div>
            </div>
          )}

          {/* Mediator */}
          {s.mediatorId && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-100 pb-3">
                <Handshake size={14} /> {t('sales.stepMediator')}
              </h4>
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-ink-primary">{mediatorName(data, s.mediatorId)}</p>
                <span className="text-lg font-extrabold text-amber-600">{formatDA(s.mediatorCommission)}</span>
              </div>
              <p className="text-xs text-ink-muted">{s.commissionType === 'percent' ? `${s.commissionPercent ?? 0}% ${t('sales.salePrice').toLowerCase()}` : t('sales.commissionAmount')}</p>
            </div>
          )}

          {s.notes && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FileText size={14} className="text-saas-primary-via" /> {t('res.notes')}
              </h4>
              <p className="text-sm text-ink-primary whitespace-pre-wrap">{s.notes}</p>
            </div>
          )}
        </div>

        {/* Financial */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-920 to-slate-950 p-5 shadow-lg text-white space-y-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <DollarSign size={14} className="text-brand-400" /> Informations Financières
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-slate-400">{t('sales.salePrice')}</span><span className="text-lg font-black text-white">{formatDA(s.price)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-400">{t('common.paid')}</span><span className="text-base font-bold text-emerald-450">{formatDA(paid)}</span></div>
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center"><span className="text-xs text-slate-400">{t('common.remaining')}</span><span className={`text-base font-extrabold ${remaining > 0 ? 'text-rose-450' : 'text-emerald-450'}`}>{formatDA(remaining)}</span></div>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold"><span>Paiement</span><span>{pct}%</span></div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Wallet size={14} className="text-saas-primary-via" /> {t('res.paymentHistory')}
            </h4>
            {s.payments.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-4">Aucun paiement enregistré</p>
            ) : (
              <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 py-1">
                {s.payments.map((p) => (
                  <div key={p.id} className="relative space-y-0.5">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-50" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-600">{formatDA(p.amount)}</span>
                      <span className="text-ink-muted text-[10px]">{formatDate(p.date, lang)}</span>
                    </div>
                    {p.note && <p className="text-ink-secondary text-[11px] leading-tight">{p.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{label}</p>
      <p className="text-ink-primary font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function SalePaymentModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const addSalePayment = useApp((s) => s.addSalePayment);
  const [amount, setAmount] = useState('');
  const [printAsk, setPrintAsk] = useState<{ sale: Sale; payment: Payment } | null>(null);

  const s = sale;
  const remaining = s ? saleRemaining(s) : 0;
  const payNum = amount === '' ? 0 : Number(amount);
  const after = Math.max(0, remaining - payNum);

  const save = async () => {
    if (!s || payNum <= 0) return toast.error(t('login.required'));
    const payment = await addSalePayment(s.id, Math.min(payNum, remaining), 'Paiement dette');
    toast.success(t('toast.paid'));
    setAmount('');
    onClose();
    // Fetch the fresh sale so the receipt shows the updated running total.
    const fresh = useApp.getState().sales.find((x) => x.id === s.id) ?? s;
    if (payment) setPrintAsk({ sale: fresh, payment });
  };

  return (
    <>
      <Modal
        open={!!sale}
        onClose={onClose}
        title={t('res.payDebt')}
        subtitle={s?.code}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
            <GradientButton variant="success" icon={<Wallet size={16} />} onClick={save}>{t('res.savePayment')}</GradientButton>
          </div>
        }
      >
        {s && (
          <div className="space-y-4">
            <div className="rounded-xl bg-grad-warning/10 border border-amber-400/30 p-4 text-center">
              <p className="text-xs text-ink-secondary">{t('common.remaining')}</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{formatDA(remaining)}</p>
            </div>
            {s.payments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('res.paymentHistory')}</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {s.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm rounded-lg bg-slate-100/70 px-3 py-1.5">
                      <span className="text-ink-secondary">{formatDate(p.date, lang)}</span>
                      <span className="text-emerald-600 font-medium">{formatDA(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <TextField label={`${t('res.payNow')} (DA)`} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus max={remaining} />
            <div className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
              <span className="text-sm text-ink-secondary">{t('res.remainingAfter')}</span>
              <span className={`text-lg font-bold ${after > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatDA(after)}</span>
            </div>
          </div>
        )}
      </Modal>

      <PrintPrompt
        open={!!printAsk}
        onClose={() => setPrintAsk(null)}
        onConfirm={() => { if (printAsk) printHTML(`${printAsk.sale.code}-recu`, buildSalePaymentReceiptHTML(data, printAsk.sale, printAsk.payment, storeInfo)); }}
        title={t('sales.receiptTitle')}
        message={t('sales.askPrintPayment')}
      />
    </>
  );
}
