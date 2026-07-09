import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Handshake, Plus, Pencil, Trash2, Phone, Mail, MapPin, History, CreditCard,
  IdCard, Tags, Coins, Printer, Wallet, Building2,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, SearchInput, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PrintPrompt } from '@/components/ui/PrintPrompt';
import { MediatorForm, type MediatorFormData } from '@/components/forms/MediatorForm';
import { mediatorStats } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, initials } from '@/lib/utils';
import { roomName } from '@/lib/lookups';
import { buildMediatorPaymentReceiptHTML, printHTML } from '@/lib/print';
import type { Mediator, Payment } from '@/types';

export default function Mediateurs() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addMediator = useApp((s) => s.addMediator);
  const updateMediator = useApp((s) => s.updateMediator);
  const deleteMediator = useApp((s) => s.deleteMediator);
  const perms = useCurrentPermissions();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Mediator | null>(null);
  const [historyMediator, setHistoryMediator] = useState<Mediator | null>(null);
  const [payFor, setPayFor] = useState<Mediator | null>(null);
  const [toDelete, setToDelete] = useState<Mediator | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.mediators;
    return data.mediators.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email ?? '').toLowerCase().includes(q),
    );
  }, [data.mediators, search]);

  // Keep modals bound to the live store record so payments show immediately.
  const liveHistory = historyMediator ? data.mediators.find((m) => m.id === historyMediator.id) ?? null : null;
  const livePay = payFor ? data.mediators.find((m) => m.id === payFor.id) ?? null : null;

  const save = async (form: MediatorFormData) => {
    if (editing) {
      await updateMediator(editing.id, form);
      toast.success(t('toast.updated'));
    } else {
      await addMediator(form);
      toast.success(t('toast.created'));
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        icon={<Handshake size={24} />}
        title={t('mediators.title')}
        subtitle={t('mediators.subtitle')}
        actions={can(perms, 'mediators', 'create') && (
          <GradientButton icon={<Plus size={18} />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            {t('mediators.new')}
          </GradientButton>
        )}
      />

      <div className="mb-5 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('common.search')} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Handshake size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((m, idx) => {
              const stats = mediatorStats(m, data.sales);
              return (
                <motion.div key={m.id} variants={listItem} layout exit="exit">
                  <GradientCard className="p-5 h-full flex flex-col border border-white/10 shadow-xl" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}>
                    <div className="flex items-start gap-3">
                      <div className={['bg-grad-gold', 'bg-grad-rose', 'bg-grad-teal', 'bg-grad-purple'][idx % 4] + ' grid h-12 w-12 place-items-center rounded-xl text-white font-bold shrink-0'}>
                        {initials(`${m.firstName} ${m.lastName}`)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white truncate">{m.firstName} {m.lastName}</h3>
                        {m.cin && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-white/10 border border-white/10 text-sky-200 rounded-full px-2 py-0.5">
                            <IdCard size={10} /> {m.cin}
                          </span>
                        )}
                      </div>
                      {stats.remaining > 0 && (
                        <span className="text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-0.5 shrink-0">
                          {formatDA(stats.remaining)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm text-slate-200 flex-1">
                      <p className="flex items-center gap-2"><Phone size={14} className="text-sky-300" /> {m.phone}</p>
                      {m.email && <p className="flex items-center gap-2 truncate"><Mail size={14} className="text-sky-300 shrink-0" /> <span className="truncate">{m.email}</span></p>}
                      {m.city && <p className="flex items-center gap-2"><MapPin size={14} className="text-sky-300" /> {m.city}</p>}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-md p-2.5">
                      <div>
                        <p className="text-[10px] text-slate-300">{t('mediators.salesCount')}</p>
                        <p className="text-xs font-bold text-white">{stats.salesCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-300">{t('common.paid')}</p>
                        <p className="text-xs font-bold text-emerald-300">{formatDA(stats.paid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-300">{t('common.remaining')}</p>
                        <p className={`text-xs font-bold ${stats.remaining > 0 ? 'text-amber-300' : 'text-slate-300'}`}>{formatDA(stats.remaining)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3">
                      <button onClick={() => setHistoryMediator(m)} className="btn-card-action btn-action-view flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold">
                        <History size={15} /> {t('common.history')}
                      </button>
                      {can(perms, 'mediators', 'pay') && stats.remaining > 0 && (
                        <button onClick={() => setPayFor(m)} className="btn-card-action btn-action-pay" title={t('common.pay')}><CreditCard size={15} /></button>
                      )}
                      {can(perms, 'mediators', 'edit') && (
                        <button onClick={() => { setEditing(m); setFormOpen(true); }} className="btn-card-action btn-action-edit" title={t('common.edit')}><Pencil size={15} /></button>
                      )}
                      {can(perms, 'mediators', 'delete') && (
                        <button onClick={() => setToDelete(m)} className="btn-card-action btn-action-delete" title={t('common.delete')}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </GradientCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <Drawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? `${editing.firstName} ${editing.lastName}` : t('mediators.new')}
        subtitle={t('clients.personalInfo')}
        width="max-w-2xl"
      >
        <MediatorForm initial={editing ?? undefined} onSave={save} onCancel={() => { setFormOpen(false); setEditing(null); }} />
      </Drawer>

      <MediatorHistory mediator={liveHistory} onClose={() => setHistoryMediator(null)} onPay={(m) => { setHistoryMediator(null); setPayFor(m); }} data={data} lang={lang} perms={perms} />
      <MediatorPaymentModal mediator={livePay} onClose={() => setPayFor(null)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await deleteMediator(toDelete.id); toast.success(t('toast.deleted')); } }}
        message={toDelete ? `${t('common.deleteMsg')} (${toDelete.firstName} ${toDelete.lastName})` : ''}
      />
    </div>
  );
}

function MediatorHistory({
  mediator, onClose, onPay, data, lang, perms,
}: {
  mediator: Mediator | null;
  onClose: () => void;
  onPay: (m: Mediator) => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
  perms: ReturnType<typeof useCurrentPermissions>;
}) {
  const { t } = useI18n();
  const stats = mediator ? mediatorStats(mediator, data.sales) : null;
  const sales = useMemo(
    () => (mediator ? data.sales.filter((s) => s.mediatorId === mediator.id) : []),
    [mediator, data.sales],
  );

  return (
    <Modal
      open={!!mediator}
      onClose={onClose}
      title={mediator ? `${mediator.firstName} ${mediator.lastName}` : ''}
      subtitle={t('common.history')}
      size="lg"
      footer={mediator && stats && stats.remaining > 0 && can(perms, 'mediators', 'pay') ? (
        <div className="flex justify-end">
          <GradientButton variant="success" icon={<CreditCard size={16} />} onClick={() => onPay(mediator)}>{t('mediators.payTitle')}</GradientButton>
        </div>
      ) : undefined}
    >
      {mediator && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('mediators.salesCount')} value={stats.salesCount} />
            <Stat label={t('mediators.commissionEarned')} value={formatDA(stats.commissionEarned)} />
            <Stat label={t('mediators.commissionPaid')} value={formatDA(stats.paid)} tone="success" />
            <Stat label={t('mediators.commissionRemaining')} value={formatDA(stats.remaining)} tone={stats.remaining > 0 ? 'danger' : 'default'} />
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-primary mb-2 flex items-center gap-1.5"><Tags size={15} className="text-brand-500" /> {t('mediators.salesHistory')}</h4>
            <div className="space-y-2">
              {sales.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-4">{t('common.noData')}</p>
              ) : (
                sales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-primary flex items-center gap-1.5"><Building2 size={13} className="text-brand-500" /> {s.code} · {roomName(data, s.roomId)}</p>
                      <p className="text-xs text-ink-muted">{formatDate(s.date, lang)} · {t('sales.salePrice')}: {formatDA(s.price)}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-600 shrink-0">{formatDA(s.mediatorCommission)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-primary mb-2 flex items-center gap-1.5"><Coins size={15} className="text-emerald-500" /> {t('mediators.paymentsHistory')}</h4>
            <div className="space-y-2">
              {mediator.payments.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-4">{t('common.noData')}</p>
              ) : (
                mediator.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary">{formatDate(p.date, lang)}</p>
                      {p.note && <p className="text-xs text-ink-muted">{p.note}</p>}
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 shrink-0">+{formatDA(p.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MediatorPaymentModal({ mediator, onClose }: { mediator: Mediator | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const addMediatorPayment = useApp((s) => s.addMediatorPayment);
  const [amount, setAmount] = useState('');
  const [printAsk, setPrintAsk] = useState<{ mediator: Mediator; payment: Payment } | null>(null);

  const m = mediator;
  const stats = m ? mediatorStats(m, data.sales) : null;
  const remaining = stats?.remaining ?? 0;
  const payNum = amount === '' ? 0 : Number(amount);
  const after = Math.max(0, remaining - payNum);

  const save = async () => {
    if (!m || payNum <= 0) return toast.error(t('login.required'));
    const payment = await addMediatorPayment(m.id, payNum, 'Paiement commission');
    toast.success(t('toast.paid'));
    setAmount('');
    onClose();
    const fresh = useApp.getState().mediators.find((x) => x.id === m.id) ?? m;
    if (payment) setPrintAsk({ mediator: fresh, payment });
  };

  return (
    <>
      <Modal
        open={!!mediator}
        onClose={onClose}
        title={t('mediators.payTitle')}
        subtitle={m ? `${m.firstName} ${m.lastName}` : ''}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
            <GradientButton variant="success" icon={<Wallet size={16} />} onClick={save}>{t('res.savePayment')}</GradientButton>
          </div>
        }
      >
        {m && stats && (
          <div className="space-y-4">
            <div className="rounded-xl bg-grad-warning/10 border border-amber-400/30 p-4 text-center">
              <p className="text-xs text-ink-secondary">{t('mediators.commissionRemaining')}</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{formatDA(remaining)}</p>
            </div>
            {m.payments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('mediators.paymentsHistory')}</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {m.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm rounded-lg bg-slate-100/70 px-3 py-1.5">
                      <span className="text-ink-secondary">{formatDate(p.date, lang)}</span>
                      <span className="text-emerald-600 font-medium">{formatDA(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <TextFieldNumber label={`${t('mediators.payNow')} (DA)`} value={amount} onChange={setAmount} />
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
        onConfirm={() => { if (printAsk) printHTML(`commission-${printAsk.mediator.lastName}`, buildMediatorPaymentReceiptHTML(data, printAsk.mediator, printAsk.payment, storeInfo)); }}
        title={t('mediators.receiptTitle')}
        message={t('mediators.askPrintPayment')}
      />
    </>
  );
}

function TextFieldNumber({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        className="w-full h-11 rounded-xl bg-slate-100/70 border border-slate-200 px-3.5 text-sm text-ink-primary outline-none transition-all focus:border-brand-400/60 focus:bg-slate-100 focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}
