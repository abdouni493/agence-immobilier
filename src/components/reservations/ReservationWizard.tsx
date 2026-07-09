import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, UserPlus, Search, ArrowLeft, ArrowRight, Building2,
  CalendarDays, Moon, Sparkles, UserCheck, X, ChevronLeft, ChevronRight,
  AlertTriangle, Calendar, Users, FileText,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextField } from '@/components/ui/Field';
import { ClientForm } from '@/components/forms/ClientForm';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import { reservationPaid } from '@/store/selectors';
import { cn, formatDA, nightsBetween, todayISO, initials } from '@/lib/utils';
import type { Reservation, ReservationService, ReservationStatus } from '@/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isoFromYM(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function rangesOverlap(aS: string, aE: string, bS: string, bE: string) {
  return aS < bE && aE > bS;
}

// ─── Step icon map ─────────────────────────────────────────────────────────────
const STEP_ICONS: Record<string, React.ReactNode> = {
  calendar: <Calendar size={16} />,
  client:   <Users size={16} />,
  services: <Sparkles size={16} />,
  recap:    <FileText size={16} />,
};

// ─── ApartmentCalendar ────────────────────────────────────────────────────────

function ApartmentCalendar({
  checkIn, checkOut, onSelect, roomId, existingReservations, editingId,
}: {
  checkIn: string; checkOut: string;
  onSelect: (ci: string, co: string) => void;
  roomId: string; existingReservations: Reservation[]; editingId?: string;
}) {
  const { lang } = useI18n();
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [selecting, setSelecting] = useState<'in' | 'out'>(checkIn ? 'out' : 'in');
  const [hovered, setHovered] = useState<string | null>(null);
  const [popover, setPopover] = useState<Reservation | null>(null);

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7;

  const occupiedRes = existingReservations.filter(
    r => r.id !== editingId && r.status !== 'cancelled' && r.rooms.some(rr => rr.roomId === roomId),
  );

  const dayOccupants = (iso: string) => occupiedRes.filter(r => r.checkIn <= iso && r.checkOut > iso);

  const isInRange = (iso: string) => {
    if (!checkIn) return false;
    const end = (selecting === 'out' && hovered) ? hovered : checkOut;
    if (!end) return false;
    const [lo, hi] = checkIn <= end ? [checkIn, end] : [end, checkIn];
    return iso > lo && iso < hi;
  };

  const nextRes = useMemo(() => {
    if (!checkIn) return null;
    return occupiedRes
      .filter(r => r.checkIn >= checkIn)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0] ?? null;
  }, [checkIn, occupiedRes]);

  const isDayDisabled = (iso: string) => {
    const today = todayISO();
    if (iso < today) return true;
    
    const occupied = occupiedRes.some(r => r.checkIn <= iso && r.checkOut > iso);
    
    if (selecting === 'in') {
      return occupied;
    } else {
      const isValidCO = iso > checkIn && (!nextRes || iso <= nextRes.checkIn);
      const isValidResetCI = iso <= checkIn && !occupied;
      return !isValidCO && !isValidResetCI;
    }
  };

  const handleDayClick = (iso: string) => {
    if (selecting === 'in') {
      onSelect(iso, '');
      setSelecting('out');
    } else {
      if (iso <= checkIn) { onSelect(iso, ''); setSelecting('out'); return; }
      onSelect(checkIn, iso);
      setSelecting('in');
    }
  };

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);

  const monthName = new Date(year, month, 1).toLocaleDateString(
    lang === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'long', year: 'numeric' },
  );
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, i + 1).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { weekday: 'narrow' }),
  );

  const hasConflict = checkIn && checkOut && occupiedRes.some(r => rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut));

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 text-ink-secondary transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-bold text-ink-primary capitalize text-sm">{monthName}</span>
        <button onClick={nextMonth} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 text-ink-secondary transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-ink-muted uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const iso  = isoFromYM(year, month, day);
          const today = todayISO();
          const past  = iso < today;
          const occupied = dayOccupants(iso).length > 0;
          const isCI  = iso === checkIn;
          const isCO  = iso === checkOut;
          const inRange = isInRange(iso);
          const disabled = isDayDisabled(iso);
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => handleDayClick(iso)}
              onMouseEnter={() => setHovered(iso)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'relative aspect-square w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                disabled && 'text-slate-300 bg-slate-50/30 cursor-not-allowed',
                occupied && !isCI && !isCO && 'bg-rose-50 text-rose-500 line-through opacity-60',
                !disabled && !isCI && !isCO && !inRange && !occupied && 'hover:bg-sky-50 text-ink-secondary',
                (isCI || isCO) && 'bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2] text-white shadow-md font-bold',
                inRange && !isCI && !isCO && 'bg-sky-100 text-sky-700',
              )}
            >
              {day}
              {occupied && !isCI && !isCO && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-rose-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Conflict warning */}
      {hasConflict && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700 text-xs font-medium">
          <AlertTriangle size={13} className="shrink-0" /> Plage chevauche une réservation existante
        </div>
      )}

      {/* Popover */}
      <AnimatePresence>
        {popover && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-orange-700">{popover.code}</span>
              <button onClick={() => setPopover(null)} className="text-ink-muted hover:text-ink-primary"><X size={12} /></button>
            </div>
            <p className="text-orange-600">{popover.checkIn} → {popover.checkOut}</p>
            <ResStatusBadge status={popover.status} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nights counter */}
      {checkIn && checkOut && checkOut > checkIn && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2] py-2.5 text-white text-sm font-bold shadow-glow">
          <Moon size={15} /> {nightsBetween(checkIn, checkOut)} nuit{nightsBetween(checkIn, checkOut) > 1 ? 's' : ''} sélectionnée{nightsBetween(checkIn, checkOut) > 1 ? 's' : ''}
        </motion.div>
      )}

      {/* Selection hint */}
      {(!checkIn || !checkOut) && (
        <p className="text-center text-xs text-ink-muted">
          {!checkIn ? '👆 Cliquez pour choisir la date d\'arrivée' : '👆 Cliquez pour choisir la date de départ'}
        </p>
      )}
    </div>
  );
}

// ─── Back button (always visible) ─────────────────────────────────────────────

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

// ─── ReservationWizard ────────────────────────────────────────────────────────

export function ReservationWizard({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Reservation | null;
}) {
  const { t } = useI18n();
  const toast  = useToast();
  const data   = useAppData();
  const addClient        = useApp(s => s.addClient);
  const addReservation   = useApp(s => s.addReservation);
  const updateReservation = useApp(s => s.updateReservation);

  const hasServices = data.services.length > 0;

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  const [calendarRoomId, setCalendarRoomId] = useState(editing?.rooms[0]?.roomId ?? data.rooms[0]?.id ?? '');
  const [checkIn,    setCheckIn]    = useState(editing?.checkIn ?? '');
  const [checkOut,   setCheckOut]   = useState(editing?.checkOut ?? '');
  const [checkInTime,  setCheckInTime]  = useState(editing?.checkInTime ?? '14:00');
  const [checkOutTime, setCheckOutTime] = useState(editing?.checkOutTime ?? '11:00');
  const [roomIds, setRoomIds] = useState<string[]>(editing?.rooms.map(r => r.roomId) ?? []);

  const [clientId,       setClientId]       = useState<string | null>(editing?.clientId ?? null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSearch,   setClientSearch]   = useState('');

  const [services, setServices] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    editing?.services.forEach(s => { init[s.serviceId] = s.quantity; });
    return init;
  });

  const [editTotal,   setEditTotal]   = useState(false);
  const [editedTotal, setEditedTotal] = useState('');
  const [amountPaid,  setAmountPaid]  = useState('');
  const [notes,       setNotes]       = useState(editing?.notes ?? '');

  // Option: hide apartments that are still tied to an active/upcoming
  // reservation (checkout in the future). They reappear once that reservation
  // expires. The currently-selected apartments always stay visible.
  const [hideBusy, setHideBusy] = useState(false);
  const busyRoomIds = useMemo(() => {
    const today = todayISO();
    const busy = new Set<string>();
    for (const r of data.reservations) {
      if (r.id === editing?.id || r.status === 'cancelled') continue;
      if (r.checkOut > today) r.rooms.forEach((rr) => busy.add(rr.roomId));
    }
    return busy;
  }, [data.reservations, editing]);

  const visibleRooms = useMemo(() => {
    if (!hideBusy) return data.rooms;
    return data.rooms.filter((r) => !busyRoomIds.has(r.id) || roomIds.includes(r.id) || r.id === calendarRoomId);
  }, [hideBusy, data.rooms, busyRoomIds, roomIds, calendarRoomId]);

  // Sync calendarRoomId and roomIds if empty but rooms are loaded
  useEffect(() => {
    if (data.rooms.length > 0) {
      if (!calendarRoomId) {
        setCalendarRoomId(data.rooms[0].id);
      }
      if (roomIds.length === 0 && !editing) {
        setRoomIds([data.rooms[0].id]);
      }
    }
  }, [data.rooms, calendarRoomId, roomIds, editing]);

  // ── Derived values ────────────────────────────────────────────────────────
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const roomsTotal = useMemo(() =>
    roomIds.reduce((sum, id) => {
      const r = data.rooms.find(r => r.id === id);
      return sum + (r ? r.pricePerNight * nights : 0);
    }, 0),
    [roomIds, data.rooms, nights]);

  const servicesTotal = useMemo(() =>
    Object.entries(services).reduce((sum, [id, qty]) => {
      const s = data.services.find(s => s.id === id);
      return sum + (s ? s.price * qty : 0);
    }, 0),
    [services, data.services]);

  const computedTotal = roomsTotal + servicesTotal;
  const finalTotal    = editedTotal === '' ? computedTotal : Number(editedTotal);
  const alreadyPaid   = editing ? reservationPaid(editing) : 0;
  const paidNum       = amountPaid === '' ? (editing ? alreadyPaid : finalTotal) : Number(amountPaid);
  const remaining     = Math.max(0, finalTotal - paidNum);

  const client = data.clients.find(c => c.id === clientId);

  const steps = useMemo(() => {
    const base = [
      { key: 'calendar', label: 'Calendrier' },
      { key: 'client',   label: t('res.step1') },
    ];
    if (hasServices) base.push({ key: 'services', label: t('res.step4') });
    base.push({ key: 'recap', label: t('res.step5') });
    return base;
  }, [hasServices, t]);

  const currentKey = steps[step]?.key;

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return (q
      ? data.clients.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.phone.includes(q))
      : data.clients
    ).slice(0, 8);
  }, [clientSearch, data.clients]);

  const hasConflict = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn || roomIds.length === 0) return false;
    return roomIds.some(roomId => {
      const room = data.rooms.find(r => r.id === roomId);
      if (room?.status === 'maintenance') return true;
      const occupiedRes = data.reservations.filter(
        r => r.id !== editing?.id && r.status !== 'cancelled' && r.rooms.some(rr => rr.roomId === roomId)
      );
      return occupiedRes.some(r => rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut));
    });
  }, [checkIn, checkOut, roomIds, data.reservations, editing, data.rooms]);

  const canNext = () => {
    if (currentKey === 'calendar') return !!checkIn && !!checkOut && checkOut > checkIn && roomIds.length > 0 && !hasConflict;
    if (currentKey === 'client')   return !!clientId;
    return true;
  };

  const goNext = () => {
    if (currentKey === 'calendar' && !checkIn)         return toast.error('Sélectionnez les dates');
    if (currentKey === 'calendar' && roomIds.length === 0) return toast.error(t('res.noRoomSelected'));
    setStep(s => Math.min(steps.length - 1, s + 1));
  };
  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleCreate = async () => {
    if (!clientId || roomIds.length === 0 || !checkIn || !checkOut) return;

    const resRooms = roomIds.map(id => {
      const room = data.rooms.find(r => r.id === id)!;
      return { roomId: id, pricePerNight: room.pricePerNight };
    });
    const resServices: ReservationService[] = Object.entries(services)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const s = data.services.find(s => s.id === id)!;
        return { serviceId: id, quantity: qty, unitPrice: s.price };
      });

    const today = todayISO();
    // Every new reservation starts as 'pending' (en attente). The user
    // activates it explicitly: the "Activer" button / alert unlocks as soon
    // as the check-in day arrives (same-day reservations can be activated
    // immediately). 'paid' / 'debt' are only set at closure (Terminer).
    const status: ReservationStatus = 'pending';

    if (editing) {
      const patch: Partial<Reservation> = {
        clientId, rooms: resRooms, services: resServices, checkIn, checkOut,
        checkInTime, checkOutTime, nights, total: finalTotal,
        notes: notes.trim() || undefined,
      };
      // Only touch the payment set when the amount paid actually changed. A
      // positive delta records an extra payment, a negative one records a
      // correction — both persist, so the card, the dashboard income and the
      // debts total all stay in sync.
      const diff = paidNum - alreadyPaid;
      if (diff !== 0) {
        patch.payments = [
          ...editing.payments,
          { id: `pay-${Date.now()}`, amount: diff, date: today, note: diff > 0 ? 'Ajustement' : 'Correction' },
        ];
      }
      await updateReservation(editing.id, patch);
      toast.success(t('toast.updated'));
    } else {
      await addReservation({
        clientId, rooms: resRooms, services: resServices, checkIn, checkOut,
        checkInTime, checkOutTime, nights, total: finalTotal,
        payments: paidNum > 0 ? [{ id: `pay-${Date.now()}`, amount: paidNum, date: today, note: 'Paiement initial' }] : [],
        status,
        notes: notes.trim() || undefined,
      });
      toast.success(t('res.createdOk'));
    }
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="wiz"
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: '#f8fafc' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        >
          {/* ── Top header bar ── */}
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-slate-200 bg-white shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary text-white shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-primary leading-tight">
                  {editing ? `Modifier · ${editing.code}` : t('res.new')}
                </p>
                <p className="text-[11px] text-ink-muted leading-tight">{steps[step]?.label}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 text-ink-secondary transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Main body ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Left sidebar (desktop only) ── */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
              {/* Steps list */}
              <div className="p-5 space-y-1 flex-1">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">Étapes</p>
                {steps.map((s, i) => {
                  const done    = i < step;
                  const active  = i === step;
                  const pending = i > step;
                  return (
                    <div key={s.key} className="relative">
                      {/* connector line */}
                      {i < steps.length - 1 && (
                        <div className={cn('absolute left-4 top-10 w-0.5 h-6 rounded-full', done ? 'bg-emerald-400' : 'bg-slate-200')} />
                      )}
                      <div className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                        active  && 'bg-brand-50 border border-brand-200/60',
                        done    && 'opacity-70',
                        pending && 'opacity-40',
                      )}>
                        <div className={cn(
                          'grid h-8 w-8 place-items-center rounded-lg text-sm font-bold shrink-0 transition-all',
                          done   && 'bg-emerald-500 text-white',
                          active && 'bg-brand-600 text-white shadow-glow',
                          pending && 'bg-slate-200 text-ink-muted',
                        )}>
                          {done ? <Check size={14} strokeWidth={3} /> : STEP_ICONS[s.key] ?? i + 1}
                        </div>
                        <span className={cn('text-sm font-semibold', active ? 'text-brand-700' : 'text-ink-secondary')}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar summary */}
              {(checkIn || clientId) && (
                <div className="p-5 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Résumé</p>
                  {roomIds.length > 0 && (
                    <div className="text-xs text-ink-secondary space-y-0.5">
                      <p className="font-semibold text-ink-primary flex items-center gap-1">
                        <Building2 size={11} className="text-brand-400" />
                        {roomIds.map(id => data.rooms.find(r => r.id === id)?.name).filter(Boolean).join(', ')}
                      </p>
                      {checkIn && checkOut && (
                        <p className="text-ink-muted">{checkIn} → {checkOut} · <span className="font-medium text-brand-600">{nights}n</span></p>
                      )}
                    </div>
                  )}
                  {client && (
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-grad-teal text-white text-[10px] font-bold shrink-0">
                        {initials(`${client.firstName} ${client.lastName}`)}
                      </span>
                      <span className="text-xs font-semibold text-ink-primary truncate">{client.firstName} {client.lastName}</span>
                    </div>
                  )}
                  {computedTotal > 0 && (
                    <p className="text-sm font-extrabold text-brand-700">{formatDA(finalTotal)}</p>
                  )}
                </div>
              )}
            </aside>

            {/* ── Content area ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Mobile stepper (top bar) */}
              <div className="lg:hidden shrink-0 px-4 py-3 bg-white border-b border-slate-200">
                <div className="flex items-center gap-1.5 justify-center">
                  {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1">
                      <div className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all',
                        i < step  && 'bg-emerald-100 text-emerald-600',
                        i === step && 'bg-brand-600 text-white',
                        i > step  && 'bg-slate-100 text-ink-muted',
                      )}>
                        {i < step ? <Check size={10} strokeWidth={3} /> : i + 1}
                        <span className={i === step ? 'inline' : 'hidden sm:inline'}>{s.label}</span>
                      </div>
                      {i < steps.length - 1 && <div className={cn('w-4 h-0.5 rounded-full', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step content — mode="wait" prevents layout shift during transition */}
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

                    {/* ── STEP: Calendar ── */}
                    {currentKey === 'calendar' && (
                      <div className="space-y-5">
                        {/* Apartment selector */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
                              <Building2 size={12} /> Appartement(s)
                            </p>
                            <button
                              type="button"
                              onClick={() => setHideBusy(v => !v)}
                              title={t('apt.hideBusyHint')}
                              className={cn(
                                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all',
                                hideBusy ? 'bg-brand-600 text-white shadow-glow' : 'bg-slate-100 text-ink-secondary hover:bg-slate-200',
                              )}
                            >
                              <span className={cn('h-3.5 w-3.5 rounded border flex items-center justify-center', hideBusy ? 'bg-white/20 border-white/40' : 'border-slate-300')}>
                                {hideBusy && <Check size={9} className="text-white" strokeWidth={3} />}
                              </span>
                              {t('apt.hideBusy')}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {visibleRooms.map(r => {
                              const isMaint = r.status === 'maintenance';
                              return (
                                <button
                                  key={r.id}
                                  disabled={isMaint}
                                  onClick={() => { setCalendarRoomId(r.id); if (!roomIds.includes(r.id)) setRoomIds([r.id]); }}
                                  className={cn(
                                    'px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all',
                                    calendarRoomId === r.id
                                      ? 'border-brand-500 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2] text-white shadow-glow'
                                      : isMaint
                                      ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                      : 'border-slate-200 text-ink-secondary hover:border-brand-300 hover:bg-brand-50',
                                  )}
                                >
                                  {r.name} {isMaint && '(Maint.)'}
                                </button>
                              );
                            })}
                          </div>
                          {visibleRooms.length > 1 && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                              <p className="w-full text-[10px] text-ink-muted mb-1">Sélection multiple :</p>
                              {visibleRooms.map(r => {
                                const sel = roomIds.includes(r.id);
                                const isMaint = r.status === 'maintenance';
                                return (
                                  <button key={r.id}
                                    disabled={isMaint}
                                    onClick={() => setRoomIds(prev => sel ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                                    className={cn(
                                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all',
                                      sel ? 'border-sky-300 bg-sky-50 text-sky-700 font-semibold' : isMaint ? 'border-slate-100 bg-slate-50 text-slate-350 cursor-not-allowed' : 'border-slate-200 text-ink-muted hover:bg-slate-50',
                                    )}
                                  >
                                    <div className={cn('h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0', sel ? 'bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2] border-blue-600' : 'border-slate-300')}>
                                      {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                                    </div>
                                    {r.name} {isMaint && '(Maint.)'}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Calendar */}
                        {calendarRoomId && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                            <ApartmentCalendar
                              checkIn={checkIn} checkOut={checkOut}
                              onSelect={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
                              roomId={calendarRoomId}
                              existingReservations={data.reservations}
                              editingId={editing?.id}
                            />
                            {hasConflict && (
                              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-rose-700 text-xs font-semibold">
                                <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                                Une ou plusieurs chambres sélectionnées sont occupées ou en maintenance pendant cette période.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Time fields */}
                        {checkIn && checkOut && checkOut > checkIn && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-brand-200 bg-brand-50 p-4 grid grid-cols-2 gap-4">
                            <TextField label={t('res.checkInTime')} type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} />
                            <TextField label={t('res.checkOutTime')} type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} />
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* ── STEP: Client ── */}
                    {currentKey === 'client' && (
                      <div className="space-y-4">
                        {creatingClient ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <ClientForm
                              submitLabel={t('common.create')}
                              onCancel={() => setCreatingClient(false)}
                              onSave={async form => {
                                const c = await addClient(form);
                                setClientId(c.id);
                                setCreatingClient(false);
                                toast.success(t('toast.created'));
                              }}
                            />
                          </div>
                        ) : client ? (
                          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                            className="rounded-2xl border-2 border-emerald-400/50 bg-emerald-50 p-5 flex items-center gap-4 shadow-sm">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-grad-success text-white text-xl font-bold shrink-0 shadow-md">
                              {initials(`${client.firstName} ${client.lastName}`)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-ink-primary text-base flex items-center gap-2">
                                <UserCheck size={18} className="text-emerald-600" />
                                {client.firstName} {client.lastName}
                              </p>
                              <p className="text-sm text-ink-secondary mt-0.5">{client.phone}</p>
                              {client.documentNumber && <p className="text-xs text-ink-muted">{client.documentNumber}</p>}
                            </div>
                            <button
                              onClick={() => setClientId(null)}
                              className="text-xs font-semibold text-ink-secondary hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg px-3 py-1.5 transition-all bg-white"
                            >
                              {t('common.change')}
                            </button>
                          </motion.div>
                        ) : (
                          <>
                            {/* Search + new client */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-1">
                                <Search size={16} className="absolute inset-y-0 start-3.5 my-auto text-ink-muted pointer-events-none" />
                                <input
                                  autoFocus
                                  value={clientSearch}
                                  onChange={e => setClientSearch(e.target.value)}
                                  placeholder={t('res.searchPlaceholder')}
                                  className="w-full h-11 rounded-xl bg-white border-2 border-slate-200 ps-11 pe-4 text-sm text-ink-primary outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                                />
                              </div>
                              <GradientButton icon={<UserPlus size={16} />} onClick={() => setCreatingClient(true)}>
                                {t('res.newClient')}
                              </GradientButton>
                            </div>

                            {/* Client grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                              {filteredClients.map((c, i) => (
                                <motion.button
                                  key={c.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  onClick={() => setClientId(c.id)}
                                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-start hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm transition-all"
                                >
                                  <span className={cn(
                                    'grid h-10 w-10 place-items-center rounded-xl text-white text-xs font-bold shrink-0',
                                    ['bg-grad-rose','bg-grad-teal','bg-grad-purple','bg-grad-gold'][i % 4],
                                  )}>
                                    {initials(`${c.firstName} ${c.lastName}`)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-ink-primary truncate">{c.firstName} {c.lastName}</span>
                                    <span className="block text-xs text-ink-muted">{c.phone}</span>
                                  </span>
                                  <ArrowRight size={14} className="ml-auto text-slate-300 shrink-0" />
                                </motion.button>
                              ))}
                              {filteredClients.length === 0 && (
                                <p className="col-span-full text-center text-sm text-ink-muted py-10">{t('common.noResults')}</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── STEP: Services ── */}
                    {currentKey === 'services' && (
                      <div className="space-y-3">
                        {data.services.length === 0 ? (
                          <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-ink-muted">
                              <Sparkles size={24} />
                            </div>
                            <p className="text-ink-secondary text-sm">Aucun service disponible</p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {data.services.map(svc => {
                                const qty = services[svc.id] ?? 0;
                                const active = qty > 0;
                                return (
                                  <motion.div key={svc.id}
                                    animate={{ scale: active ? 1.01 : 1 }}
                                    className={cn(
                                      'rounded-2xl border-2 p-4 transition-all',
                                      active ? 'border-brand-400/60 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white',
                                    )}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-grad-gold text-white shrink-0 shadow-sm">
                                          <Sparkles size={17} />
                                        </span>
                                        <div>
                                          <p className="text-sm font-bold text-ink-primary">{svc.name}</p>
                                          <p className="text-xs text-ink-muted">{formatDA(svc.price)} / unité</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setServices(p => ({ ...p, [svc.id]: active ? 0 : 1 }))}
                                        className={cn('grid h-6 w-6 place-items-center rounded-md border-2 shrink-0 transition-all', active ? 'bg-brand-600 border-brand-600' : 'border-slate-300 hover:border-brand-400')}
                                      >
                                        {active && <Check size={12} className="text-white" strokeWidth={3} />}
                                      </button>
                                    </div>
                                    {active && (
                                      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-brand-200/60">
                                        <button onClick={() => setServices(p => ({ ...p, [svc.id]: Math.max(1, qty - 1) }))}
                                          className="grid h-8 w-8 place-items-center rounded-lg bg-white border-2 border-slate-200 font-bold text-ink-secondary hover:border-brand-400 hover:text-brand-600 transition-all text-lg leading-none">−</button>
                                        <motion.span key={qty} animate={{ scale: [1.2, 1] }} className="w-8 text-center text-sm font-extrabold text-brand-700">{qty}</motion.span>
                                        <button onClick={() => setServices(p => ({ ...p, [svc.id]: qty + 1 }))}
                                          className="grid h-8 w-8 place-items-center rounded-lg bg-white border-2 border-slate-200 font-bold text-ink-secondary hover:border-brand-400 hover:text-brand-600 transition-all text-lg leading-none">+</button>
                                        <span className="ms-auto text-sm font-extrabold text-brand-700">{formatDA(svc.price * qty)}</span>
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                            {servicesTotal > 0 && (
                              <div className="flex items-center justify-between rounded-xl bg-slate-800 px-5 py-3">
                                <span className="text-sm text-white/70 font-medium">Total services</span>
                                <span className="text-lg font-extrabold text-white">{formatDA(servicesTotal)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* ── STEP: Recap ── */}
                    {currentKey === 'recap' && (
                      <div className="space-y-4">
                        {/* Apartment row */}
                        <SummaryCard icon={<Building2 size={16} />} title="Appartement(s)" color="sky">
                          {roomIds.map(id => {
                            const room  = data.rooms.find(r => r.id === id);
                            const cat   = data.categories.find(c => c.id === room?.categoryId);
                            const floor = data.floors.find(f => f.id === room?.floorId);
                            if (!room) return null;
                            return (
                              <div key={id} className="flex justify-between text-sm">
                                <div>
                                  <span className="font-semibold">{room.name}</span>
                                  {cat && <span className="text-ink-muted text-xs"> · {cat.name}</span>}
                                  {floor && <span className="text-ink-muted text-xs"> · {floor.name}</span>}
                                </div>
                                <span className="font-medium text-ink-secondary">{formatDA(room.pricePerNight)}/nuit</span>
                              </div>
                            );
                          })}
                        </SummaryCard>

                        {/* Dates */}
                        <SummaryCard icon={<CalendarDays size={16} />} title="Dates" color="emerald">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-ink-secondary">{checkIn} → {checkOut}</span>
                            <span className="font-bold text-emerald-700">{nights} nuit{nights > 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">Arrivée {checkInTime} · Départ {checkOutTime}</p>
                        </SummaryCard>

                        {/* Client */}
                        {client && (
                          <SummaryCard icon={<UserCheck size={16} />} title="Client" color="teal">
                            <p className="text-sm font-bold">{client.firstName} {client.lastName}</p>
                            <p className="text-xs text-ink-muted">{client.phone}{client.email ? ` · ${client.email}` : ''}</p>
                          </SummaryCard>
                        )}

                        {/* Services */}
                        {servicesTotal > 0 && (
                          <SummaryCard icon={<Sparkles size={16} />} title={t('res.step4')} color="gold">
                            {Object.entries(services).filter(([, q]) => q > 0).map(([id, qty]) => {
                              const svc = data.services.find(s => s.id === id);
                              if (!svc) return null;
                              return (
                                <div key={id} className="flex justify-between text-sm">
                                  <span className="text-ink-secondary">{svc.name} × {qty}</span>
                                  <span className="font-medium">{formatDA(svc.price * qty)}</span>
                                </div>
                              );
                            })}
                          </SummaryCard>
                        )}

                        {/* Payment total box */}
                        <div className="rounded-2xl border-2 border-brand-200 bg-white overflow-hidden shadow-sm">
                          <div className="bg-grad-primary px-5 py-3">
                            <p className="text-white/80 text-xs font-medium">Détail du montant</p>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="flex justify-between text-sm text-ink-secondary">
                              <span>{nights} nuit{nights > 1 ? 's' : ''}</span>
                              <span>{formatDA(roomsTotal)}</span>
                            </div>
                            {servicesTotal > 0 && (
                              <div className="flex justify-between text-sm text-ink-secondary">
                                <span>Services</span><span>{formatDA(servicesTotal)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-3">
                              <span>Total calculé</span><span>{formatDA(computedTotal)}</span>
                            </div>

                            {/* Editable total */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => { setEditTotal(!editTotal); setEditedTotal(editTotal ? '' : String(computedTotal)); }}
                                className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0', editTotal ? 'bg-brand-600' : 'bg-slate-300')}
                              >
                                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', editTotal ? 'translate-x-4' : 'translate-x-0.5')} />
                              </button>
                              <span className="text-xs text-ink-muted">Modifier le total</span>
                              {editTotal && (
                                <input type="number" value={editedTotal} onChange={e => setEditedTotal(e.target.value)}
                                  className="ml-auto w-32 rounded-lg border-2 border-brand-300 bg-white px-3 py-1 text-sm font-bold text-right outline-none focus:border-brand-500" />
                              )}
                            </div>

                            <div className="flex justify-between font-extrabold text-brand-700 border-t border-brand-100 pt-3">
                              <span className="text-sm">Total final</span>
                              <span className="text-xl">{formatDA(finalTotal)}</span>
                            </div>

                            {/* Amount paid */}
                            <div>
                              <label className="text-xs font-bold text-ink-muted block mb-1.5">{t('res.amountPaid')} (DA)</label>
                              <input
                                type="number"
                                value={amountPaid === '' ? String(editing ? alreadyPaid : finalTotal) : amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                className="w-full h-11 rounded-xl border-2 border-slate-200 px-4 text-sm font-bold text-ink-primary outline-none focus:border-brand-400 transition-all"
                              />
                            </div>

                            {/* Remaining */}
                            <div className={cn(
                              'flex items-center justify-between rounded-xl px-4 py-3',
                              remaining > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200',
                            )}>
                              <span className="text-sm font-semibold text-ink-secondary">Reste à payer</span>
                              <span className={cn('text-2xl font-extrabold', remaining > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                                {formatDA(remaining)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Notes / remarque */}
                        <SummaryCard icon={<FileText size={16} />} title={t('res.notes')} color="teal">
                          <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder={t('res.notesPlaceholder')}
                            rows={3}
                            className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm text-ink-primary outline-none focus:border-brand-400 transition-all resize-y"
                          />
                        </SummaryCard>
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Footer nav ── */}
              <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
                  {/* Back button — always a real visible button, hidden at step 0 */}
                  <BackButton onClick={goBack} disabled={step === 0} />
                  {step === 0 && <div />}

                  {/* Center total */}
                  <div className="text-sm text-ink-secondary hidden sm:block">
                    {finalTotal > 0 && (
                      <span className="font-bold text-brand-700">{formatDA(finalTotal)}</span>
                    )}
                  </div>

                  {/* Next / Confirm */}
                  {currentKey === 'recap' ? (
                    <GradientButton icon={<Check size={18} />} onClick={handleCreate} glow>
                      {editing ? t('common.save') : t('res.createReservation')}
                    </GradientButton>
                  ) : (
                    <GradientButton
                      iconRight={<ArrowRight size={16} />}
                      onClick={goNext}
                      disabled={!canNext()}
                    >
                      {t('common.next')}
                    </GradientButton>
                  )}
                </div>
              </div>

            </div>{/* end content col */}
          </div>{/* end body */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Summary card helper ───────────────────────────────────────────────────────

function SummaryCard({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: 'sky' | 'emerald' | 'teal' | 'gold';
  children: React.ReactNode;
}) {
  const colors = {
    sky:     'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    teal:    'border-teal-200 bg-teal-50 text-teal-700',
    gold:    'border-amber-200 bg-amber-50 text-amber-700',
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
