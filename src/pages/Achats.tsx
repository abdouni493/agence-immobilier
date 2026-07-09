import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Eye, Pencil, Printer, CreditCard, User, Phone, Building2, MapPin,
  Trash2, Wallet, CalendarDays, DollarSign, FileText, TrendingUp,
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
import { PurchaseWizard } from '@/components/purchases/PurchaseWizard';
import { purchasePaid, purchaseRemaining } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate } from '@/lib/utils';
import { clientName, clientById, roomName, roomLocation } from '@/lib/lookups';
import {
  buildPurchaseInvoiceHTML, buildPurchasePaymentReceiptHTML, printHTML,
} from '@/lib/print';
import type { Purchase, Payment } from '@/types';

type StatusFilter = 'all' | 'paid' | 'debt';

function PurchaseStatusBadge({ status }: { status: Purchase['status'] }) {
  const { t } = useI18n();
  if (status === 'paid') {
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('sales.statusPaid')}</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-dot" /> {t('sales.statusDebt')}</span>;
}

export default function Achats() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();
  const deletePurchase = useApp((s) => s.deletePurchase);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [payFor, setPayFor] = useState<Purchase | null>(null);
  const [deleteOne, setDeleteOne] = useState<Purchase | null>(null);
  const [printAsk, setPrintAsk] = useState<Purchase | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.purchases
      .filter((p) => {
        if (status !== 'all' && p.status !== status) return false;
        if (q) {
          const c = clientById(data, p.clientId);
          const hay = `${c?.firstName ?? ''} ${c?.lastName ?? ''} ${c?.phone ?? ''} ${roomName(data, p.roomId)} ${p.code}`.toLowerCase();
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
    let total = 0, paid = 0, remaining = 0;
    for (const p of data.purchases) { total += p.purchasePrice; paid += purchasePaid(p); remaining += purchaseRemaining(p); }
    return { total, paid, remaining };
  }, [data.purchases]);

  const openCreate = () => { setEditing(null); setWizardOpen(true); };
  const openEdit = (p: Purchase) => { setEditing(p); setWizardOpen(true); };
  const printInvoice = (p: Purchase) => printHTML(p.code, buildPurchaseInvoiceHTML(data, p, storeInfo));

  const canDelete = can(perms, 'achats', 'delete');

  return (
    <div>
      <PageHeader
        icon={<ShoppingBag size={24} />}
        title={t('purchases.title')}
        subtitle={t('purchases.subtitle')}
        actions={can(perms, 'achats', 'create') && (
          <GradientButton icon={<Plus size={18} />} onClick={openCreate}>{t('purchases.new')}</GradientButton>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label={t('purchases.totalPurchases')} value={formatDA(totals.total)} />
        <Stat label={t('purchases.paidOut')} value={formatDA(totals.paid)} tone="success" />
        <Stat label={t('purchases.remainingToPay')} value={formatDA(totals.remaining)} tone={totals.remaining > 0 ? 'danger' : 'default'} />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder={t('purchases.searchPlaceholder')} className="flex-1" />
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
          icon={<ShoppingBag size={36} />}
          title={t('common.noResults')}
          hint={t('common.emptyHint')}
          action={can(perms, 'achats', 'create') && <GradientButton icon={<Plus size={18} />} onClick={openCreate}>{t('purchases.new')}</GradientButton>}
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p) => {
              const remaining = purchaseRemaining(p);
              const margin = p.salePrice - p.purchasePrice;
              return (
                <motion.div key={p.id} variants={listItem} layout exit={{ opacity: 0, scale: 0.95 }}>
                  <GradientCard className="p-5 h-full flex flex-col border border-white/10 shadow-xl" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-sky-200 truncate">{p.code}</span>
                      <PurchaseStatusBadge status={p.status} />
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Building2 size={15} className="text-sky-300" /> {roomName(data, p.roomId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <MapPin size={13} className="text-sky-300" /> {roomLocation(data, p.roomId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <User size={13} className="text-sky-300" /> {clientName(data, p.clientId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <Phone size={13} className="text-sky-300" /> {clientById(data, p.clientId)?.phone}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-300">
                        <CalendarDays size={13} className="text-sky-300" /> {formatDate(p.date, lang)} · {p.time}
                      </p>
                      {p.salePrice > 0 && (
                        <p className="flex items-center gap-2 text-xs text-emerald-200">
                          <TrendingUp size={13} className="text-emerald-300" /> Marge prévue · {formatDA(margin)}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-md p-2.5">
                      <div>
                        <p className="text-[10px] text-slate-300">{t('purchases.purchasePrice')}</p>
                        <p className="text-xs font-bold text-white">{formatDA(p.purchasePrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-300">{t('common.paid')}</p>
                        <p className="text-xs font-bold text-emerald-300">{formatDA(purchasePaid(p))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-300">{t('common.remaining')}</p>
                        <p className={`text-xs font-bold ${remaining > 0 ? 'text-amber-300' : 'text-slate-300'}`}>{formatDA(remaining)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 flex-wrap">
                      <button onClick={() => setDetail(p)} className="btn-card-action btn-action-view flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold" title={t('common.view')}>
                        <Eye size={15} /> {t('common.view')}
                      </button>
                      {can(perms, 'achats', 'edit') && (
                        <button onClick={() => openEdit(p)} className="btn-card-action btn-action-edit" title={t('common.edit')}><Pencil size={15} /></button>
                      )}
                      {can(perms, 'achats', 'print') && (
                        <button onClick={() => printInvoice(p)} className="btn-card-action btn-action-print" title={t('common.print')}><Printer size={15} /></button>
                      )}
                      {can(perms, 'achats', 'pay') && remaining > 0 && (
                        <button onClick={() => setPayFor(p)} className="btn-card-action btn-action-pay" title={t('common.pay')}><CreditCard size={15} /></button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteOne(p)} className="btn-card-action btn-action-delete" title={t('common.delete')}><Trash2 size={15} /></button>
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
        <PurchaseWizard
          open={wizardOpen}
          editing={editing}
          onClose={() => { setWizardOpen(false); setEditing(null); }}
          onCreated={(p) => setPrintAsk(p)}
        />
      )}

      <PurchaseDetailModal purchase={detail} onClose={() => setDetail(null)} onPrint={printInvoice} onPay={(p) => { setDetail(null); setPayFor(p); }} data={data} lang={lang} />
      <PurchasePaymentModal purchase={payFor} onClose={() => setPayFor(null)} />

      <PrintPrompt
        open={!!printAsk}
        onClose={() => setPrintAsk(null)}
        onConfirm={() => { if (printAsk) printInvoice(printAsk); }}
        title={t('purchases.invoiceTitle')}
        message={t('purchases.askPrint')}
      />

      <ConfirmDialog
        open={!!deleteOne}
        onClose={() => setDeleteOne(null)}
        onConfirm={async () => { if (deleteOne) { await deletePurchase(deleteOne.id); toast.success(t('toast.deleted')); } }}
        title={t('purchases.deleteTitle')}
        message={`${t('common.deleteMsg')} (${deleteOne?.code})`}
      />
    </div>
  );
}

function PurchaseDetailModal({
  purchase, onClose, onPrint, onPay, data, lang,
}: {
  purchase: Purchase | null;
  onClose: () => void;
  onPrint: (p: Purchase) => void;
  onPay: (p: Purchase) => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const p = purchase;
  if (!p) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const client = clientById(data, p.clientId);
  const room = data.rooms.find((r) => r.id === p.roomId);
  const paid = purchasePaid(p);
  const remaining = purchaseRemaining(p);
  const pct = p.purchasePrice > 0 ? Math.min(100, Math.round((paid / p.purchasePrice) * 100)) : 0;
  const margin = p.salePrice - p.purchasePrice;

  return (
    <Modal
      open={!!purchase}
      onClose={onClose}
      title={<div className="flex items-center gap-3"><span className="text-xl font-bold bg-gradient-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end bg-clip-text text-transparent">{p.code}</span><PurchaseStatusBadge status={p.status} /></div>}
      subtitle={client ? `${client.firstName} ${client.lastName}` : ''}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end items-center">
          <button onClick={() => onPrint(p)} className="flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 bg-white text-ink-secondary text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
            <Printer size={16} /> {t('common.print')}
          </button>
          {remaining > 0 && (
            <button onClick={() => onPay(p)} className="btn-saas-primary h-11 px-6 text-sm active:scale-95 flex items-center gap-2">
              <CreditCard size={16} /> {t('common.pay')}
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-800">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Building2 size={14} className="text-saas-primary-via" /> {t('purchases.stepApartment')}
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

          {client && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <User size={14} className="text-saas-primary-via" /> {t('purchases.seller')}
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

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <CalendarDays size={14} className="text-saas-primary-via" /> {t('purchases.stepRecap')}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoLine label={t('purchases.purchasePrice')} value={formatDA(p.purchasePrice)} />
              <InfoLine label={t('purchases.resalePrice')} value={formatDA(p.salePrice)} />
              <InfoLine label={t('common.date')} value={`${formatDate(p.date, lang)} · ${p.time}`} />
              <InfoLine label="Marge prévue" value={formatDA(margin)} />
            </div>
          </div>

          {p.notes && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FileText size={14} className="text-saas-primary-via" /> {t('res.notes')}
              </h4>
              <p className="text-sm text-ink-primary whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-920 to-slate-950 p-5 shadow-lg text-white space-y-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <DollarSign size={14} className="text-brand-400" /> Informations Financières
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-slate-400">{t('purchases.purchasePrice')}</span><span className="text-lg font-black text-white">{formatDA(p.purchasePrice)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-400">{t('purchases.paidOut')}</span><span className="text-base font-bold text-emerald-450">{formatDA(paid)}</span></div>
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
            {p.payments.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-4">Aucun paiement enregistré</p>
            ) : (
              <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 py-1">
                {p.payments.map((pay) => (
                  <div key={pay.id} className="relative space-y-0.5">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-50" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-600">{formatDA(pay.amount)}</span>
                      <span className="text-ink-muted text-[10px]">{formatDate(pay.date, lang)}</span>
                    </div>
                    {pay.note && <p className="text-ink-secondary text-[11px] leading-tight">{pay.note}</p>}
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

function PurchasePaymentModal({ purchase, onClose }: { purchase: Purchase | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const addPurchasePayment = useApp((s) => s.addPurchasePayment);
  const [amount, setAmount] = useState('');
  const [printAsk, setPrintAsk] = useState<{ purchase: Purchase; payment: Payment } | null>(null);

  const p = purchase;
  const remaining = p ? purchaseRemaining(p) : 0;
  const payNum = amount === '' ? 0 : Number(amount);
  const after = Math.max(0, remaining - payNum);

  const save = async () => {
    if (!p || payNum <= 0) return toast.error(t('login.required'));
    const payment = await addPurchasePayment(p.id, Math.min(payNum, remaining), 'Paiement vendeur');
    toast.success(t('toast.paid'));
    setAmount('');
    onClose();
    const fresh = useApp.getState().purchases.find((x) => x.id === p.id) ?? p;
    if (payment) setPrintAsk({ purchase: fresh, payment });
  };

  return (
    <>
      <Modal
        open={!!purchase}
        onClose={onClose}
        title={t('res.payDebt')}
        subtitle={p?.code}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
            <GradientButton variant="success" icon={<Wallet size={16} />} onClick={save}>{t('res.savePayment')}</GradientButton>
          </div>
        }
      >
        {p && (
          <div className="space-y-4">
            <div className="rounded-xl bg-grad-warning/10 border border-amber-400/30 p-4 text-center">
              <p className="text-xs text-ink-secondary">{t('purchases.remainingToPay')}</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{formatDA(remaining)}</p>
            </div>
            {p.payments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('res.paymentHistory')}</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {p.payments.map((pay) => (
                    <div key={pay.id} className="flex justify-between text-sm rounded-lg bg-slate-100/70 px-3 py-1.5">
                      <span className="text-ink-secondary">{formatDate(pay.date, lang)}</span>
                      <span className="text-emerald-600 font-medium">{formatDA(pay.amount)}</span>
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
        onConfirm={() => { if (printAsk) printHTML(`${printAsk.purchase.code}-recu`, buildPurchasePaymentReceiptHTML(data, printAsk.purchase, printAsk.payment, storeInfo)); }}
        title={t('purchases.receiptTitle')}
        message={t('purchases.askPrintPayment')}
      />
    </>
  );
}
