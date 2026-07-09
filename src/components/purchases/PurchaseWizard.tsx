import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, UserPlus, Search, ArrowLeft, ArrowRight, Building2, X,
  Home, Users, FileText, UserCheck, MapPin, Coins,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextField } from '@/components/ui/Field';
import { ClientForm } from '@/components/forms/ClientForm';
import { ApartmentFields, emptyAptDraft, type AptDraft } from '@/components/forms/ApartmentFields';
import { purchasePaid } from '@/store/selectors';
import { cn, formatDA, formatDate, todayISO, initials } from '@/lib/utils';
import type { Purchase, Payment } from '@/types';

const STEP_ICONS: Record<string, React.ReactNode> = {
  apartment: <Home size={16} />,
  client: <Users size={16} />,
  recap: <FileText size={16} />,
};

function BackButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const { t } = useI18n();
  if (disabled) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-slate-200 bg-white text-ink-secondary text-sm font-semibold hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-95"
    >
      <ArrowLeft size={16} className="rtl:rotate-180" /> {t('common.previous')}
    </button>
  );
}

export function PurchaseWizard({
  open, onClose, editing, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Purchase | null;
  onCreated?: (purchase: Purchase) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addClient = useApp((s) => s.addClient);
  const addRoom = useApp((s) => s.addRoom);
  const addFloor = useApp((s) => s.addFloor);
  const updateRoom = useApp((s) => s.updateRoom);
  const addPurchase = useApp((s) => s.addPurchase);
  const updatePurchase = useApp((s) => s.updatePurchase);

  const [step, setStep] = useState(0);

  // Apartment: when editing an existing purchase we keep its room; when
  // creating we always capture a fresh apartment fiche.
  const existingRoom = editing ? data.rooms.find((r) => r.id === editing.roomId) : undefined;
  const [aptDraft, setAptDraft] = useState<AptDraft>(
    existingRoom
      ? {
          name: existingRoom.name,
          wilaya: existingRoom.wilaya ?? '',
          commune: existingRoom.commune ?? '',
          secteur: existingRoom.secteur ?? '',
          floorId: existingRoom.floorId ?? '',
          capacity: String(existingRoom.capacity ?? 1),
          description: existingRoom.description ?? '',
        }
      : emptyAptDraft,
  );

  const [purchasePrice, setPurchasePrice] = useState(editing ? String(editing.purchasePrice) : '');
  const [salePrice, setSalePrice] = useState(editing ? String(editing.salePrice) : '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [time, setTime] = useState(editing?.time ?? '10:00');

  // Seller client
  const [clientId, setClientId] = useState<string | null>(editing?.clientId ?? null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Recap
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const client = data.clients.find((c) => c.id === clientId);
  const purchaseNum = purchasePrice === '' ? 0 : Number(purchasePrice);
  const alreadyPaid = editing ? purchasePaid(editing) : 0;
  const paidNum = amountPaid === '' ? (editing ? alreadyPaid : purchaseNum) : Number(amountPaid);
  const remaining = Math.max(0, purchaseNum - paidNum);

  const steps = useMemo(() => [
    { key: 'apartment', label: t('purchases.stepApartment') },
    { key: 'client', label: t('purchases.stepClient') },
    { key: 'recap', label: t('purchases.stepRecap') },
  ], [t]);
  const currentKey = steps[step]?.key;

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return (q
      ? data.clients.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.phone.includes(q))
      : data.clients
    ).slice(0, 8);
  }, [clientSearch, data.clients]);

  const canNext = () => {
    if (currentKey === 'apartment') return !!aptDraft.name.trim() && purchaseNum > 0;
    if (currentKey === 'client') return !!clientId;
    return true;
  };
  const goNext = () => {
    if (currentKey === 'apartment' && !aptDraft.name.trim()) return toast.error(t('login.required'));
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!clientId || !aptDraft.name.trim() || purchaseNum <= 0) return toast.error(t('login.required'));
    const today = todayISO();
    const saleNum = salePrice === '' ? 0 : Number(salePrice);

    const roomPayload = {
      name: aptDraft.name.trim(),
      capacity: Number(aptDraft.capacity) || 1,
      floorId: aptDraft.floorId,
      categoryId: '',
      pricePerNight: 0,
      wilaya: aptDraft.wilaya.trim() || undefined,
      commune: aptDraft.commune.trim() || undefined,
      secteur: aptDraft.secteur.trim() || undefined,
      description: aptDraft.description.trim() || undefined,
      propertyType: 'sale' as const,
      ownerClientId: clientId,
      salePrice: saleNum || undefined,
      purchasePrice: purchaseNum,
    };

    if (editing) {
      // Keep the linked apartment in sync with the edited fiche.
      if (editing.roomId) await updateRoom(editing.roomId, roomPayload);
      const patch: Partial<Purchase> = {
        clientId, purchasePrice: purchaseNum, salePrice: saleNum, date, time,
        notes: notes.trim() || undefined,
      };
      const diff = paidNum - alreadyPaid;
      if (diff !== 0) {
        patch.payments = [
          ...editing.payments,
          { id: `pay-${Date.now()}`, amount: diff, date: today, note: diff > 0 ? 'Ajustement' : 'Correction' },
        ];
      }
      await updatePurchase(editing.id, patch);
      toast.success(t('toast.updated'));
      onClose();
    } else {
      const room = await addRoom(roomPayload);
      if (!room) { toast.error(t('toast.error')); return; }
      const payments: Payment[] = paidNum > 0
        ? [{ id: `pay-${Date.now()}`, amount: paidNum, date: today, note: 'Paiement initial' }]
        : [];
      const created = await addPurchase({
        roomId: room.id, clientId, purchasePrice: purchaseNum, salePrice: saleNum,
        date, time, payments, status: 'debt', notes: notes.trim() || undefined,
      });
      if (created) {
        toast.success(t('purchases.createdOk'));
        onClose();
        onCreated?.(created);
      } else {
        toast.error(t('toast.error'));
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="purchase-wiz"
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: '#f8fafc' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        >
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-slate-200 bg-white shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary text-white shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-primary leading-tight">
                  {editing ? `Modifier · ${editing.code}` : t('purchases.new')}
                </p>
                <p className="text-[11px] text-ink-muted leading-tight">{steps[step]?.label}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 text-ink-secondary transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
              <div className="p-5 space-y-1 flex-1">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">Étapes</p>
                {steps.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  const pending = i > step;
                  return (
                    <div key={s.key} className="relative">
                      {i < steps.length - 1 && (
                        <div className={cn('absolute left-4 top-10 w-0.5 h-6 rounded-full', done ? 'bg-emerald-400' : 'bg-slate-200')} />
                      )}
                      <div className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                        active && 'bg-brand-50 border border-brand-200/60',
                        done && 'opacity-70',
                        pending && 'opacity-40',
                      )}>
                        <div className={cn(
                          'grid h-8 w-8 place-items-center rounded-lg text-sm font-bold shrink-0 transition-all',
                          done && 'bg-emerald-500 text-white',
                          active && 'bg-brand-600 text-white shadow-glow',
                          pending && 'bg-slate-200 text-ink-muted',
                        )}>
                          {done ? <Check size={14} strokeWidth={3} /> : STEP_ICONS[s.key] ?? i + 1}
                        </div>
                        <span className={cn('text-sm font-semibold', active ? 'text-brand-700' : 'text-ink-secondary')}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(aptDraft.name || client) && (
                <div className="p-5 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Résumé</p>
                  {aptDraft.name && (
                    <p className="text-xs font-semibold text-ink-primary flex items-center gap-1">
                      <Building2 size={11} className="text-brand-400" /> {aptDraft.name}
                    </p>
                  )}
                  {client && (
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-grad-teal text-white text-[10px] font-bold shrink-0">
                        {initials(`${client.firstName} ${client.lastName}`)}
                      </span>
                      <span className="text-xs font-semibold text-ink-primary truncate">{client.firstName} {client.lastName}</span>
                    </div>
                  )}
                  {purchaseNum > 0 && <p className="text-sm font-extrabold text-brand-700">{formatDA(purchaseNum)}</p>}
                </div>
              )}
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="lg:hidden shrink-0 px-4 py-3 bg-white border-b border-slate-200">
                <div className="flex items-center gap-1.5 justify-center">
                  {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1">
                      <div className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all',
                        i < step && 'bg-emerald-100 text-emerald-600',
                        i === step && 'bg-brand-600 text-white',
                        i > step && 'bg-slate-100 text-ink-muted',
                      )}>
                        {i < step ? <Check size={10} strokeWidth={3} /> : i + 1}
                        <span className={i === step ? 'inline' : 'hidden sm:inline'}>{s.label}</span>
                      </div>
                      {i < steps.length - 1 && <div className={cn('w-4 h-0.5 rounded-full', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="p-5 sm:p-6 max-w-2xl mx-auto"
                  >
                    {/* STEP: Apartment info + prices + date */}
                    {currentKey === 'apartment' && (
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
                            <Home size={12} /> {t('purchases.apartmentInfo')}
                          </p>
                          <ApartmentFields draft={aptDraft} onChange={setAptDraft} floors={data.floors} onAddFloor={addFloor} />
                        </div>

                        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <TextField label={`${t('purchases.purchasePrice')} (DA)`} required type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
                          <TextField label={`${t('purchases.resalePrice')} (DA)`} type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                          <TextField label={t('purchases.purchaseDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                          <TextField label={t('purchases.purchaseTime')} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {/* STEP: Seller client */}
                    {currentKey === 'client' && (
                      <div className="space-y-4">
                        <p className="text-xs text-ink-muted flex items-center gap-1.5"><Users size={13} /> {t('purchases.sellerHint')}</p>
                        {creatingClient ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <ClientForm submitLabel={t('common.create')} onCancel={() => setCreatingClient(false)}
                              onSave={async (form) => { const c = await addClient(form); setClientId(c.id); setCreatingClient(false); toast.success(t('toast.created')); }} />
                          </div>
                        ) : client ? (
                          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                            className="rounded-2xl border-2 border-emerald-400/50 bg-emerald-50 p-5 flex items-center gap-4 shadow-sm">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-grad-success text-white text-xl font-bold shrink-0 shadow-md">
                              {initials(`${client.firstName} ${client.lastName}`)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-ink-primary text-base flex items-center gap-2">
                                <UserCheck size={18} className="text-emerald-600" /> {client.firstName} {client.lastName}
                              </p>
                              <p className="text-sm text-ink-secondary mt-0.5">{client.phone}</p>
                            </div>
                            <button onClick={() => setClientId(null)} className="text-xs font-semibold text-ink-secondary hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg px-3 py-1.5 transition-all bg-white">
                              {t('common.change')}
                            </button>
                          </motion.div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-1">
                                <Search size={16} className="absolute inset-y-0 start-3.5 my-auto text-ink-muted pointer-events-none" />
                                <input autoFocus value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder={t('res.searchPlaceholder')}
                                  className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 ps-11 pe-4 text-sm text-ink-primary outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm" />
                              </div>
                              <GradientButton icon={<UserPlus size={16} />} onClick={() => setCreatingClient(true)}>{t('res.newClient')}</GradientButton>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                              {filteredClients.map((c, i) => (
                                <motion.button key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                  onClick={() => setClientId(c.id)}
                                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-start hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm transition-all">
                                  <span className={cn('grid h-10 w-10 place-items-center rounded-xl text-white text-xs font-bold shrink-0',
                                    ['bg-grad-rose', 'bg-grad-teal', 'bg-grad-purple', 'bg-grad-gold'][i % 4])}>
                                    {initials(`${c.firstName} ${c.lastName}`)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-ink-primary truncate">{c.firstName} {c.lastName}</span>
                                    <span className="block text-xs text-ink-muted">{c.phone}</span>
                                  </span>
                                  <ArrowRight size={14} className="ml-auto text-slate-300 shrink-0" />
                                </motion.button>
                              ))}
                              {filteredClients.length === 0 && <p className="col-span-full text-center text-sm text-ink-muted py-10">{t('common.noResults')}</p>}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* STEP: Recap */}
                    {currentKey === 'recap' && (
                      <div className="space-y-4">
                        <SummaryCard icon={<Building2 size={16} />} title={t('purchases.stepApartment')} color="sky">
                          <p className="text-sm font-bold">{aptDraft.name}</p>
                          <p className="text-xs text-ink-muted flex items-center gap-1">
                            <MapPin size={11} /> {[aptDraft.wilaya, aptDraft.commune, aptDraft.secteur].filter(Boolean).join(', ') || '—'}
                          </p>
                        </SummaryCard>

                        {client && (
                          <SummaryCard icon={<UserCheck size={16} />} title={t('purchases.seller')} color="teal">
                            <p className="text-sm font-bold">{client.firstName} {client.lastName}</p>
                            <p className="text-xs text-ink-muted">{client.phone}{client.email ? ` · ${client.email}` : ''}</p>
                          </SummaryCard>
                        )}

                        <SummaryCard icon={<Coins size={16} />} title={t('purchases.stepRecap')} color="gold">
                          <div className="flex justify-between text-sm"><span className="text-ink-secondary">{t('purchases.purchasePrice')}</span><span className="font-semibold">{formatDA(purchaseNum)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-ink-secondary">{t('purchases.resalePrice')}</span><span className="font-semibold">{formatDA(salePrice === '' ? 0 : Number(salePrice))}</span></div>
                          <p className="text-xs text-ink-muted pt-1">{formatDate(date)} · {time}</p>
                        </SummaryCard>

                        <div className="rounded-2xl border-2 border-brand-200 bg-white overflow-hidden shadow-sm">
                          <div className="bg-grad-primary px-5 py-3">
                            <p className="text-white/80 text-xs font-medium">{t('purchases.agencyPays')}</p>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="flex justify-between font-extrabold text-brand-700">
                              <span className="text-sm">{t('purchases.purchasePrice')}</span>
                              <span className="text-xl">{formatDA(purchaseNum)}</span>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-ink-muted block mb-1.5">{t('purchases.agencyPays')} (DA)</label>
                              <input type="number" value={amountPaid === '' ? String(editing ? alreadyPaid : purchaseNum) : amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                                className="w-full h-11 rounded-xl border-2 border-slate-200 px-4 text-sm font-bold text-ink-primary outline-none focus:border-brand-400 transition-all" />
                            </div>
                            <div className={cn('flex items-center justify-between rounded-xl px-4 py-3', remaining > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200')}>
                              <span className="text-sm font-semibold text-ink-secondary">{t('purchases.remainingToPay')}</span>
                              <span className={cn('text-2xl font-extrabold', remaining > 0 ? 'text-amber-600' : 'text-emerald-600')}>{formatDA(remaining)}</span>
                            </div>
                          </div>
                        </div>

                        <SummaryCard icon={<FileText size={16} />} title={t('res.notes')} color="teal">
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('res.notesPlaceholder')} rows={3}
                            className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm text-ink-primary outline-none focus:border-brand-400 transition-all resize-y" />
                        </SummaryCard>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
                  <BackButton onClick={goBack} disabled={step === 0} />
                  {step === 0 && <div />}
                  <div className="text-sm text-ink-secondary hidden sm:block">
                    {purchaseNum > 0 && <span className="font-bold text-brand-700">{formatDA(purchaseNum)}</span>}
                  </div>
                  {currentKey === 'recap' ? (
                    <GradientButton icon={<Check size={18} />} onClick={handleSubmit} glow>
                      {editing ? t('common.save') : t('purchases.createPurchase')}
                    </GradientButton>
                  ) : (
                    <GradientButton iconRight={<ArrowRight size={16} />} onClick={goNext} disabled={!canNext()}>
                      {t('common.next')}
                    </GradientButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SummaryCard({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: 'sky' | 'emerald' | 'teal' | 'gold';
  children: React.ReactNode;
}) {
  const colors = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
    gold: 'border-amber-200 bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-2 px-4 py-2.5 border-b text-xs font-bold uppercase tracking-wide', colors[color])}>
        {icon} {title}
      </div>
      <div className="px-4 py-3 space-y-1.5">{children}</div>
    </div>
  );
}
