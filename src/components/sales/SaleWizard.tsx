import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, UserPlus, Search, ArrowLeft, ArrowRight, Building2, X,
  Home, Users, Handshake, FileText, UserCheck, Plus, MapPin, Percent, Coins,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextField } from '@/components/ui/Field';
import { ClientForm } from '@/components/forms/ClientForm';
import { MediatorForm } from '@/components/forms/MediatorForm';
import { ApartmentFields, emptyAptDraft, type AptDraft } from '@/components/forms/ApartmentFields';
import { salePaid } from '@/store/selectors';
import { cn, formatDA, todayISO, initials } from '@/lib/utils';
import type { Sale, CommissionType, Payment } from '@/types';

const STEP_ICONS: Record<string, React.ReactNode> = {
  apartment: <Home size={16} />,
  client: <Users size={16} />,
  mediator: <Handshake size={16} />,
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

export function SaleWizard({
  open, onClose, editing, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Sale | null;
  onCreated?: (sale: Sale) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addClient = useApp((s) => s.addClient);
  const addMediator = useApp((s) => s.addMediator);
  const addRoom = useApp((s) => s.addRoom);
  const addFloor = useApp((s) => s.addFloor);
  const addSale = useApp((s) => s.addSale);
  const updateSale = useApp((s) => s.updateSale);

  const [step, setStep] = useState(0);

  // Apartment (choose existing, or create a new one)
  const [roomId, setRoomId] = useState<string | null>(editing?.roomId ?? null);
  const [aptSearch, setAptSearch] = useState('');
  const [creatingApt, setCreatingApt] = useState(false);
  const [aptDraft, setAptDraft] = useState<AptDraft>(emptyAptDraft);

  // Client (buyer)
  const [clientId, setClientId] = useState<string | null>(editing?.clientId ?? null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Mediator
  const [useMediator, setUseMediator] = useState(!!editing?.mediatorId);
  const [mediatorId, setMediatorId] = useState<string | null>(editing?.mediatorId ?? null);
  const [creatingMediator, setCreatingMediator] = useState(false);
  const [mediatorSearch, setMediatorSearch] = useState('');
  const [commissionType, setCommissionType] = useState<CommissionType>(editing?.commissionType ?? 'amount');
  const [commissionAmount, setCommissionAmount] = useState(
    editing && editing.commissionType === 'amount' ? String(editing.mediatorCommission) : '',
  );
  const [commissionPercent, setCommissionPercent] = useState(
    editing?.commissionPercent != null ? String(editing.commissionPercent) : '',
  );

  // Recap
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [saleDate, setSaleDate] = useState(editing?.date ?? todayISO());
  const [saleTime, setSaleTime] = useState(editing?.time ?? '10:00');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const room = data.rooms.find((r) => r.id === roomId);
  const client = data.clients.find((c) => c.id === clientId);
  const mediator = data.mediators.find((m) => m.id === mediatorId);

  const priceNum = price === '' ? 0 : Number(price);
  const commissionValue = useMemo(() => {
    if (!useMediator || !mediatorId) return 0;
    if (commissionType === 'percent') {
      const pct = commissionPercent === '' ? 0 : Number(commissionPercent);
      return Math.round((priceNum * pct) / 100);
    }
    return commissionAmount === '' ? 0 : Number(commissionAmount);
  }, [useMediator, mediatorId, commissionType, commissionPercent, commissionAmount, priceNum]);

  const alreadyPaid = editing ? salePaid(editing) : 0;
  const paidNum = amountPaid === '' ? (editing ? alreadyPaid : priceNum) : Number(amountPaid);
  const remaining = Math.max(0, priceNum - paidNum);

  const steps = useMemo(() => [
    { key: 'apartment', label: t('sales.stepApartment') },
    { key: 'client', label: t('sales.stepClient') },
    { key: 'mediator', label: t('sales.stepMediator') },
    { key: 'recap', label: t('sales.stepRecap') },
  ], [t]);
  const currentKey = steps[step]?.key;

  const saleRooms = useMemo(
    () => data.rooms.filter((r) => r.propertyType !== 'rental'),
    [data.rooms],
  );
  const filteredApts = useMemo(() => {
    const q = aptSearch.trim().toLowerCase();
    const pool = saleRooms.length > 0 ? saleRooms : data.rooms;
    return (q
      ? pool.filter((r) =>
          r.name.toLowerCase().includes(q) ||
          (r.wilaya ?? '').toLowerCase().includes(q) ||
          (r.commune ?? '').toLowerCase().includes(q))
      : pool
    ).slice(0, 12);
  }, [aptSearch, saleRooms, data.rooms]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return (q
      ? data.clients.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.phone.includes(q))
      : data.clients
    ).slice(0, 8);
  }, [clientSearch, data.clients]);

  const filteredMediators = useMemo(() => {
    const q = mediatorSearch.trim().toLowerCase();
    return (q
      ? data.mediators.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.phone.includes(q))
      : data.mediators
    ).slice(0, 8);
  }, [mediatorSearch, data.mediators]);

  useEffect(() => {
    if (!editing && roomId && price === '') {
      const r = data.rooms.find((x) => x.id === roomId);
      if (r?.salePrice) setPrice(String(r.salePrice));
    }
  }, [roomId, editing, data.rooms, price]);

  const canNext = () => {
    if (currentKey === 'apartment') return !!roomId;
    if (currentKey === 'client') return !!clientId;
    if (currentKey === 'mediator') {
      if (!useMediator) return true;
      return !!mediatorId;
    }
    return true;
  };

  const goNext = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleCreateApt = async () => {
    if (!aptDraft.name.trim()) return toast.error(t('login.required'));
    const created = await addRoom({
      name: aptDraft.name.trim(),
      capacity: Number(aptDraft.capacity) || 1,
      floorId: aptDraft.floorId,
      categoryId: '',
      pricePerNight: 0,
      wilaya: aptDraft.wilaya.trim() || undefined,
      commune: aptDraft.commune.trim() || undefined,
      secteur: aptDraft.secteur.trim() || undefined,
      description: aptDraft.description.trim() || undefined,
      propertyType: 'sale',
    });
    if (created) {
      setRoomId(created.id);
      setCreatingApt(false);
      setAptDraft(emptyAptDraft);
      toast.success(t('toast.created'));
    } else {
      toast.error(t('toast.error'));
    }
  };

  const handleSubmit = async () => {
    if (!roomId || !clientId || priceNum <= 0) return toast.error(t('login.required'));
    const today = todayISO();

    if (editing) {
      const patch: Partial<Sale> = {
        roomId, clientId,
        mediatorId: useMediator ? mediatorId ?? undefined : undefined,
        commissionType,
        commissionPercent: commissionType === 'percent' && commissionPercent !== '' ? Number(commissionPercent) : undefined,
        mediatorCommission: commissionValue,
        price: priceNum, date: saleDate, time: saleTime,
        notes: notes.trim() || undefined,
      };
      const diff = paidNum - alreadyPaid;
      if (diff !== 0) {
        patch.payments = [
          ...editing.payments,
          { id: `pay-${Date.now()}`, amount: diff, date: today, note: diff > 0 ? 'Ajustement' : 'Correction' },
        ];
      }
      await updateSale(editing.id, patch);
      toast.success(t('toast.updated'));
      onClose();
    } else {
      const payments: Payment[] = paidNum > 0
        ? [{ id: `pay-${Date.now()}`, amount: paidNum, date: today, note: 'Paiement initial' }]
        : [];
      const created = await addSale({
        roomId, clientId,
        mediatorId: useMediator ? mediatorId ?? undefined : undefined,
        commissionType,
        commissionPercent: commissionType === 'percent' && commissionPercent !== '' ? Number(commissionPercent) : undefined,
        mediatorCommission: commissionValue,
        price: priceNum, date: saleDate, time: saleTime,
        payments,
        status: 'debt',
        notes: notes.trim() || undefined,
      });
      if (created) {
        toast.success(t('sales.createdOk'));
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
          key="sale-wiz"
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: '#f8fafc' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-slate-200 bg-white shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary text-white shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-primary leading-tight">
                  {editing ? `Modifier · ${editing.code}` : t('sales.new')}
                </p>
                <p className="text-[11px] text-ink-muted leading-tight">{steps[step]?.label}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 text-ink-secondary transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
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

              {(room || client) && (
                <div className="p-5 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Résumé</p>
                  {room && (
                    <p className="text-xs font-semibold text-ink-primary flex items-center gap-1">
                      <Building2 size={11} className="text-brand-400" /> {room.name}
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
                  {priceNum > 0 && <p className="text-sm font-extrabold text-brand-700">{formatDA(priceNum)}</p>}
                </div>
              )}
            </aside>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile stepper */}
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
                    {/* STEP: Apartment */}
                    {currentKey === 'apartment' && (
                      <div className="space-y-4">
                        {creatingApt ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                            <p className="text-sm font-bold text-ink-primary">{t('sales.newApartment')}</p>
                            <ApartmentFields draft={aptDraft} onChange={setAptDraft} floors={data.floors} onAddFloor={addFloor} />
                            <div className="flex gap-3 justify-end">
                              <GradientButton variant="glass" onClick={() => setCreatingApt(false)}>{t('common.cancel')}</GradientButton>
                              <GradientButton icon={<Check size={16} />} onClick={handleCreateApt}>{t('common.create')}</GradientButton>
                            </div>
                          </div>
                        ) : room ? (
                          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                            className="rounded-2xl border-2 border-emerald-400/50 bg-emerald-50 p-5 flex items-center gap-4 shadow-sm">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-grad-primary text-white shrink-0 shadow-md">
                              <Building2 size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-ink-primary text-base flex items-center gap-2">
                                <Check size={18} className="text-emerald-600" /> {room.name}
                              </p>
                              <p className="text-sm text-ink-secondary mt-0.5 flex items-center gap-1">
                                <MapPin size={13} /> {[room.wilaya, room.commune, room.secteur].filter(Boolean).join(', ') || '—'}
                              </p>
                              {room.salePrice ? <p className="text-xs text-ink-muted mt-0.5">{t('apt.salePrice')}: {formatDA(room.salePrice)}</p> : null}
                            </div>
                            <button onClick={() => setRoomId(null)} className="text-xs font-semibold text-ink-secondary hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg px-3 py-1.5 transition-all bg-white">
                              {t('common.change')}
                            </button>
                          </motion.div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-1">
                                <Search size={16} className="absolute inset-y-0 start-3.5 my-auto text-ink-muted pointer-events-none" />
                                <input autoFocus value={aptSearch} onChange={(e) => setAptSearch(e.target.value)} placeholder={t('sales.searchApartment')}
                                  className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 ps-11 pe-4 text-sm text-ink-primary outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm" />
                              </div>
                              <GradientButton icon={<Plus size={16} />} onClick={() => setCreatingApt(true)}>{t('sales.newApartment')}</GradientButton>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                              {filteredApts.map((r, i) => (
                                <motion.button key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                  onClick={() => setRoomId(r.id)}
                                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-start hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm transition-all">
                                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-grad-primary text-white shrink-0">
                                    <Building2 size={18} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-ink-primary truncate">{r.name}</span>
                                    <span className="block text-xs text-ink-muted truncate">{[r.wilaya, r.commune].filter(Boolean).join(', ') || '—'}</span>
                                  </span>
                                  <ArrowRight size={14} className="ml-auto text-slate-300 shrink-0" />
                                </motion.button>
                              ))}
                              {filteredApts.length === 0 && <p className="col-span-full text-center text-sm text-ink-muted py-10">{t('common.noResults')}</p>}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* STEP: Client */}
                    {currentKey === 'client' && (
                      <div className="space-y-4">
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

                    {/* STEP: Mediator */}
                    {currentKey === 'mediator' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                          <button onClick={() => { setUseMediator(false); setMediatorId(null); }}
                            className={cn('flex-1 h-11 rounded-xl text-sm font-semibold transition-all', !useMediator ? 'bg-grad-primary text-white shadow-glow' : 'text-ink-secondary hover:bg-slate-50')}>
                            {t('sales.noMediator')}
                          </button>
                          <button onClick={() => setUseMediator(true)}
                            className={cn('flex-1 h-11 rounded-xl text-sm font-semibold transition-all', useMediator ? 'bg-grad-primary text-white shadow-glow' : 'text-ink-secondary hover:bg-slate-50')}>
                            {t('sales.withMediator')}
                          </button>
                        </div>

                        {useMediator && (
                          creatingMediator ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                              <MediatorForm submitLabel={t('common.create')} onCancel={() => setCreatingMediator(false)}
                                onSave={async (form) => { const m = await addMediator(form); setMediatorId(m.id); setCreatingMediator(false); toast.success(t('toast.created')); }} />
                            </div>
                          ) : mediator ? (
                            <>
                              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                className="rounded-2xl border-2 border-amber-400/50 bg-amber-50 p-5 flex items-center gap-4 shadow-sm">
                                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-grad-gold text-white shrink-0 shadow-md">
                                  <Handshake size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-ink-primary text-base">{mediator.firstName} {mediator.lastName}</p>
                                  <p className="text-sm text-ink-secondary mt-0.5">{mediator.phone}</p>
                                </div>
                                <button onClick={() => setMediatorId(null)} className="text-xs font-semibold text-ink-secondary hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg px-3 py-1.5 transition-all bg-white">
                                  {t('common.change')}
                                </button>
                              </motion.div>

                              {/* Commission config */}
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                                <p className="text-sm font-bold text-ink-primary">{t('sales.commission')}</p>
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                                  <button onClick={() => setCommissionType('amount')}
                                    className={cn('flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5', commissionType === 'amount' ? 'bg-white shadow text-brand-700' : 'text-ink-secondary')}>
                                    <Coins size={15} /> {t('sales.commissionAmount')}
                                  </button>
                                  <button onClick={() => setCommissionType('percent')}
                                    className={cn('flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5', commissionType === 'percent' ? 'bg-white shadow text-brand-700' : 'text-ink-secondary')}>
                                    <Percent size={15} /> {t('sales.commissionPercent')}
                                  </button>
                                </div>
                                {commissionType === 'amount' ? (
                                  <TextField label={t('sales.commissionAmount')} type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} />
                                ) : (
                                  <TextField label={t('sales.commissionPercent')} type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} />
                                )}
                                <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                  <span className="text-sm font-semibold text-ink-secondary">{t('sales.commissionValue')}</span>
                                  <span className="text-lg font-extrabold text-amber-600">{formatDA(commissionValue)}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                  <Search size={16} className="absolute inset-y-0 start-3.5 my-auto text-ink-muted pointer-events-none" />
                                  <input autoFocus value={mediatorSearch} onChange={(e) => setMediatorSearch(e.target.value)} placeholder={t('sales.searchMediator')}
                                    className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 ps-11 pe-4 text-sm text-ink-primary outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm" />
                                </div>
                                <GradientButton icon={<UserPlus size={16} />} onClick={() => setCreatingMediator(true)}>{t('sales.newMediator')}</GradientButton>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                                {filteredMediators.map((m, i) => (
                                  <motion.button key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                    onClick={() => setMediatorId(m.id)}
                                    className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-start hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm transition-all">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-grad-gold text-white text-xs font-bold shrink-0">
                                      {initials(`${m.firstName} ${m.lastName}`)}
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-sm font-semibold text-ink-primary truncate">{m.firstName} {m.lastName}</span>
                                      <span className="block text-xs text-ink-muted">{m.phone}</span>
                                    </span>
                                    <ArrowRight size={14} className="ml-auto text-slate-300 shrink-0" />
                                  </motion.button>
                                ))}
                                {filteredMediators.length === 0 && <p className="col-span-full text-center text-sm text-ink-muted py-10">{t('common.noResults')}</p>}
                              </div>
                            </>
                          )
                        )}
                      </div>
                    )}

                    {/* STEP: Recap */}
                    {currentKey === 'recap' && (
                      <div className="space-y-4">
                        <SummaryCard icon={<Building2 size={16} />} title={t('sales.stepApartment')} color="sky">
                          {room ? (
                            <>
                              <p className="text-sm font-bold">{room.name}</p>
                              <p className="text-xs text-ink-muted">{[room.wilaya, room.commune, room.secteur].filter(Boolean).join(', ') || '—'}</p>
                            </>
                          ) : <p className="text-sm text-ink-muted">—</p>}
                        </SummaryCard>

                        {client && (
                          <SummaryCard icon={<UserCheck size={16} />} title={t('sales.buyer')} color="teal">
                            <p className="text-sm font-bold">{client.firstName} {client.lastName}</p>
                            <p className="text-xs text-ink-muted">{client.phone}{client.email ? ` · ${client.email}` : ''}</p>
                          </SummaryCard>
                        )}

                        {useMediator && mediator && (
                          <SummaryCard icon={<Handshake size={16} />} title={t('sales.stepMediator')} color="gold">
                            <div className="flex justify-between text-sm">
                              <span className="font-bold">{mediator.firstName} {mediator.lastName}</span>
                              <span className="font-semibold text-amber-700">{formatDA(commissionValue)}</span>
                            </div>
                            <p className="text-xs text-ink-muted">{commissionType === 'percent' ? `${commissionPercent || 0}% du prix de vente` : 'Montant fixe'}</p>
                          </SummaryCard>
                        )}

                        {/* Date / time */}
                        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 grid grid-cols-2 gap-4">
                          <TextField label={t('sales.saleDate')} type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
                          <TextField label={t('sales.saleTime')} type="time" value={saleTime} onChange={(e) => setSaleTime(e.target.value)} />
                        </div>

                        {/* Payment box */}
                        <div className="rounded-2xl border-2 border-brand-200 bg-white overflow-hidden shadow-sm">
                          <div className="bg-grad-primary px-5 py-3">
                            <p className="text-white/80 text-xs font-medium">Détail du montant</p>
                          </div>
                          <div className="p-5 space-y-3">
                            <div>
                              <label className="text-xs font-bold text-ink-muted block mb-1.5">{t('sales.salePrice')} (DA)</label>
                              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                                className="w-full h-11 rounded-xl border-2 border-slate-200 px-4 text-sm font-bold text-ink-primary outline-none focus:border-brand-400 transition-all" />
                            </div>
                            <div className="flex justify-between font-extrabold text-brand-700 border-t border-brand-100 pt-3">
                              <span className="text-sm">Prix de vente</span>
                              <span className="text-xl">{formatDA(priceNum)}</span>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-ink-muted block mb-1.5">{t('res.amountPaid')} (DA)</label>
                              <input type="number" value={amountPaid === '' ? String(editing ? alreadyPaid : priceNum) : amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                                className="w-full h-11 rounded-xl border-2 border-slate-200 px-4 text-sm font-bold text-ink-primary outline-none focus:border-brand-400 transition-all" />
                            </div>
                            <div className={cn('flex items-center justify-between rounded-xl px-4 py-3', remaining > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200')}>
                              <span className="text-sm font-semibold text-ink-secondary">Reste à payer</span>
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

              {/* Footer */}
              <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
                  <BackButton onClick={goBack} disabled={step === 0} />
                  {step === 0 && <div />}
                  <div className="text-sm text-ink-secondary hidden sm:block">
                    {priceNum > 0 && <span className="font-bold text-brand-700">{formatDA(priceNum)}</span>}
                  </div>
                  {currentKey === 'recap' ? (
                    <GradientButton icon={<Check size={18} />} onClick={handleSubmit} glow>
                      {editing ? t('common.save') : t('sales.createSale')}
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
