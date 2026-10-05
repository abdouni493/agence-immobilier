import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Plus, CalendarRange, Eye, Pencil, Printer, CreditCard, User, Phone,
  Building2, CalendarDays, Wallet, Trash2, CheckCircle2, PlayCircle,
  Mail, MapPin, Clock, ShieldCheck, DollarSign, FileText, Hourglass,
  FileSignature, Receipt, ChevronRight, Briefcase, HardHat, FileX, Ban,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, SearchInput, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { TextField, TextArea, SegmentedControl, FieldWrap } from '@/components/ui/Field';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';
import { CalendarTimeline } from '@/components/reservations/CalendarTimeline';
import {
  AlertFilterBar, ReservationAlertBanner, buildAlertIndex, type AlertFilterValue,
} from '@/components/reservations/reservationAlerts';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PrintPrompt } from '@/components/ui/PrintPrompt';
import { reservationPaid, reservationRemaining } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, formatDateLong, rangesOverlap, todayISO, addDaysISO, monthKey, nightsBetween } from '@/lib/utils';
import { reservationPeriod, rentalPeriodOf } from '@/lib/lookups';
import { useToday } from '@/lib/useToday';
import { clientName, reservationRoomLabels, clientById } from '@/lib/lookups';
import { buildReservationPaymentReceiptHTML, buildRentalContractHTML, buildVersementHTML, buildTerminationHTML, printDoc, printHTML, type TerminationLang } from '@/lib/print';
import type { Reservation, Payment, TerminationParty } from '@/types';

type PrintKind = 'contract' | 'versement' | 'termination';

/** Name of the employee holding the agency-fee commission of a location. */
function workerName(data: ReturnType<typeof useAppData>, id?: string): string {
  if (!id) return '—';
  return data.workers.find((w) => w.id === id)?.name ?? '—';
}

type Period = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'pending' | 'active' | 'paid' | 'debt' | 'cancelled' | 'terminated';

const statusBg: Record<string, string> = {
  pending: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200',
  active: 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200',
  paid: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200',
  debt: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200',
  cancelled: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200',
  terminated: 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200',
};

export default function Reservations() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();
  const deleteReservation = useApp((s) => s.deleteReservation);
  const updateReservation = useApp((s) => s.updateReservation);

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [alertFilter, setAlertFilter] = useState<AlertFilterValue | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [payFor, setPayFor] = useState<Reservation | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deleteOne, setDeleteOne] = useState<Reservation | null>(null);
  const [clotureFor, setClotureFor] = useState<Reservation | null>(null);
  const [activateFor, setActivateFor] = useState<Reservation | null>(null);
  const [printChoice, setPrintChoice] = useState<Reservation | null>(null);
  const [terminateFor, setTerminateFor] = useState<Reservation | null>(null);
  const [printTermination, setPrintTermination] = useState<Reservation | null>(null);
  // Termination letter: the user first picks French or Arabic.
  const [termLangFor, setTermLangFor] = useState<Reservation | null>(null);

  // Live local date — auto-updates at midnight / on window focus so the
  // activation & closure buttons unlock without reloading the page.
  const today = useToday();

  const periodRange = useMemo((): [string, string] | null => {
    if (period === 'today') return [today, addDaysISO(today, 1)];
    if (period === 'week') {
      const d = new Date(today);
      const day = (d.getDay() + 6) % 7;
      const start = addDaysISO(today, -day);
      return [start, addDaysISO(start, 7)];
    }
    if (period === 'month') {
      const mk = monthKey(today);
      return [`${mk}-01`, `${mk}-31`];
    }
    return null;
  }, [period, today]);

  // Reservation alerts (soon / today / overdue for activation & checkout)
  const alertIndex = useMemo(() => buildAlertIndex(data.reservations, today), [data.reservations, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Numeric part of the code (RES-056 → 56) breaks ties when two
    // reservations were created the same day (createdAt is date-only).
    const codeNum = (code: string) => Number(/(\d+)$/.exec(code ?? '')?.[1] ?? 0);
    return data.reservations
      .filter((r) => {
        if (alertFilter) {
          const a = alertIndex.map.get(r.id);
          if (!a) return false;
          if (alertFilter !== 'all' && a.type !== alertFilter) return false;
        }
        if (status !== 'all' && r.status !== status) return false;
        if (periodRange && !rangesOverlap(r.checkIn, r.checkOut, periodRange[0], periodRange[1])) return false;
        if (q) {
          const c = clientById(data, r.clientId);
          const hay = `${c?.firstName ?? ''} ${c?.lastName ?? ''} ${c?.phone ?? ''} ${r.code}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      // Latest created first, oldest last.
      .sort((a, b) => {
        const byCreated = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        if (byCreated !== 0) return byCreated;
        return codeNum(b.code) - codeNum(a.code);
      });
  }, [data, search, status, periodRange, alertFilter, alertIndex]);

  // Selecting an alert pill clears the status/period filters so every matching
  // reservation is shown across all cases.
  const handleAlertFilter = (v: AlertFilterValue | null) => {
    setAlertFilter(v);
    if (v) { setStatus('all'); setPeriod('all'); }
  };

  const canDelete = can(perms, 'reservations', 'delete');

  const handleDeleteOne = async () => {
    if (!deleteOne) return;
    await deleteReservation(deleteOne.id);
    toast.success(t('toast.deleted'));
  };

  const openCreate = () => { setEditing(null); setWizardOpen(true); };
  const openEdit = (r: Reservation) => { setEditing(r); setWizardOpen(true); };
  // Printing a rental first asks the user which document to produce.
  const askPrint = (r: Reservation) => setPrintChoice(r);
  const doPrint = (r: Reservation, kind: PrintKind) => {
    if (kind === 'contract') printDoc(`${r.code}-contrat`, () => buildRentalContractHTML(data, r, storeInfo));
    else if (kind === 'termination') { setPrintChoice(null); setTermLangFor(r); return; }
    else printDoc(`${r.code}-versement`, () => buildVersementHTML(data, r, storeInfo));
    setPrintChoice(null);
  };

  const printTerminationIn = (r: Reservation, l: TerminationLang) => {
    printHTML(`${r.code}-resiliation-${l}`, buildTerminationHTML(data, r, storeInfo, l), l);
    setTermLangFor(null);
  };

  const handleActivate = async () => {
    if (!activateFor) return;
    // Guard: cannot activate before the check-in date.
    // Re-read the system clock at click time so a card rendered before
    // midnight can still be activated once the check-in day has arrived.
    if (todayISO() < activateFor.checkIn) {
      toast.error(t('res.activateBlocked', { date: formatDate(activateFor.checkIn, lang) }));
      setActivateFor(null);
      return;
    }
    await updateReservation(activateFor.id, { status: 'active' });
    toast.success(t('toast.updated'));
    setActivateFor(null);
  };

  return (
    <div>
      <PageHeader
        icon={<CalendarCheck size={24} />}
        title={t('res.title')}
        subtitle={t('res.subtitle')}
        actions={
          <>
            <GradientButton variant="glass" icon={<CalendarRange size={18} />} onClick={() => setCalendarOpen(true)}>
              {t('res.calendar')}
            </GradientButton>
            {can(perms, 'reservations', 'create') && (
              <GradientButton icon={<Plus size={18} />} onClick={openCreate}>
                {t('res.new')}
              </GradientButton>
            )}
          </>
        }
      />

      {/* Current system date — reference day for all activation/closure rules */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-blue-50 px-4 py-3 shadow-sm">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
          <CalendarDays size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-500">{t('common.today')}</p>
          <p className="text-sm sm:text-base font-extrabold text-sky-800 capitalize truncate">
            {formatDateLong(today, lang)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder={t('res.searchPlaceholder')} className="flex-1" />
        <SegmentedControl<Period>
          value={period}
          onChange={(v) => { setPeriod(v); setAlertFilter(null); }}
          size="sm"
          options={[
            { value: 'today', label: t('common.today') },
            { value: 'week', label: t('common.week') },
            { value: 'month', label: t('common.month') },
            { value: 'all', label: t('common.all') },
          ]}
        />
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={(v) => { setStatus(v); setAlertFilter(null); }}
          size="sm"
          options={[
            { value: 'all', label: t('res.filterAll') },
            { value: 'pending', label: t('res.filterPending') },
            { value: 'active', label: t('res.filterActive') },
            { value: 'paid', label: t('res.filterPaid') },
            { value: 'debt', label: t('res.filterDebt') },
            { value: 'cancelled', label: t('res.filterCancelled') },
            { value: 'terminated', label: t('res.filterTerminated') },
          ]}
        />
      </div>

      {/* Alert filter bar — pulses when there are reservations needing action */}
      <AlertFilterBar
        counts={alertIndex.counts}
        total={alertIndex.total}
        value={alertFilter}
        onChange={handleAlertFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={36} />}
          title={t('common.noResults')}
          hint={t('common.emptyHint')}
          action={can(perms, 'reservations', 'create') && <GradientButton icon={<Plus size={18} />} onClick={openCreate}>{t('res.new')}</GradientButton>}
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((r) => {
              const remaining = reservationRemaining(r);
              const alert = alertIndex.map.get(r.id);
              const canEdit = can(perms, 'reservations', 'edit');
              // Date guards: can't activate before check-in, can't close before check-out.
              const canActivateNow = r.status === 'pending' && today >= r.checkIn;
              const canTerminerNow = r.status === 'active' && today >= r.checkOut;
              return (
                <motion.div key={r.id} variants={listItem} layout exit={{ opacity: 0, scale: 0.95 }}>
                  <GradientCard
                    className="p-5 h-full flex flex-col border border-white/10 shadow-xl"
                    style={{ background: 'linear-gradient(145deg, #1b1f25 0%, #22272f 55%, #2a3039 100%)' }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-sky-200 truncate">{r.code}</span>
                      <ResStatusBadge status={r.status} dark />
                    </div>

                    {/* Alert banner — clear, animated, tells the user what to do.
                        The action button only appears once the date allows it
                        (today/overdue alerts), enforcing the activation/closure guards. */}
                    {alert && (
                      <div className="mt-3">
                        <ReservationAlertBanner
                          alert={alert}
                          canAct={canEdit && alert.urgent}
                          onAction={
                            alert.action === 'activate'
                              ? () => setActivateFor(r)
                              : () => setClotureFor(r)
                          }
                        />
                      </div>
                    )}

                    {/* Pending reservation further out than the alert window:
                        show a countdown so the user always knows how many days
                        remain before activation unlocks. */}
                    {!alert && r.status === 'pending' && r.checkIn > today && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-sm">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-500 text-white mt-0.5">
                          <Hourglass size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-tight text-sky-200">
                            {t('res.pendingCountdown', { days: nightsBetween(today, r.checkIn) })}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">
                            {t('res.pendingCountdownDesc', { date: formatDate(r.checkIn, lang) })}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Terminated (fsakh) contract: when & by whom */}
                    {r.status === 'terminated' && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/15 p-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-500 text-white mt-0.5">
                          <Ban size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-tight text-rose-200">
                            {t('res.terminatedOn', { date: formatDate(r.terminationDate ?? r.checkOut, lang) })}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">
                            {t('res.terminateBy')} : {r.terminatedBy === 'owner' ? t('res.terminateByOwner') : t('res.terminateByTenant')}
                            {r.terminationReason ? ` · ${r.terminationReason}` : ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="mt-3 space-y-1.5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <User size={15} className="text-sky-300" /> {clientName(data, r.clientId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink-secondary">
                        <Phone size={13} className="text-sky-300" /> {clientById(data, r.clientId)?.phone}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink-secondary">
                        <Building2 size={13} className="text-sky-300" /> {reservationRoomLabels(data, r)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink-secondary">
                        <CalendarDays size={13} className="text-sky-300" /> {formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)} · {r.nights} {reservationPeriod(data, r) === 'month' ? t('common.months') : t('common.nights')}
                      </p>
                    </div>

                    {(r.agencyFee ?? 0) > 0 && (
                      <p className="mt-1.5 flex items-center gap-2 text-xs text-amber-200">
                        <Briefcase size={13} className="text-amber-300" />
                        {t('fee.title')} : {formatDA(r.agencyFee ?? 0)}
                        {(r.agencyFeeCommission ?? 0) > 0 && (
                          <span className="text-[11px] text-amber-300/80">
                            · {workerName(data, r.agencyFeeWorkerId)} {r.agencyFeePercent ?? 0}%
                          </span>
                        )}
                      </p>
                    )}

                    {/* Totals */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-md p-2.5">
                      <div>
                        <p className="text-[10px] text-ink-secondary">{t('common.total')}</p>
                        <p className="text-xs font-bold text-white">{formatDA(r.total)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-secondary">{t('common.paid')}</p>
                        <p className="text-xs font-bold text-emerald-350 text-emerald-300">{formatDA(reservationPaid(r))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-secondary">{t('common.remaining')}</p>
                        <p className={`text-xs font-bold ${remaining > 0 ? 'text-amber-300' : 'text-ink-secondary'}`}>{formatDA(remaining)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 flex-wrap">
                      <button
                        onClick={() => setDetail(r)}
                        className="btn-card-action btn-action-view flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold"
                        title={t('common.view')}
                      >
                        <Eye size={15} /> {t('common.view')}
                      </button>
                      {can(perms, 'reservations', 'edit') && (
                        <button
                          onClick={() => openEdit(r)}
                          className="btn-card-action btn-action-edit"
                          title={t('common.edit')}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {can(perms, 'reservations', 'print') && (
                        <button
                          onClick={() => askPrint(r)}
                          className="btn-card-action btn-action-print"
                          title={t('common.print')}
                        >
                          <Printer size={15} />
                        </button>
                      )}
                      {can(perms, 'reservations', 'pay') && remaining > 0 && (
                        <button
                          onClick={() => setPayFor(r)}
                          className="btn-card-action btn-action-pay"
                          title={t('common.pay')}
                        >
                          <CreditCard size={15} />
                        </button>
                      )}
                      {/* "Terminer" for active reservations — locked until check-out date */}
                      {r.status === 'active' && can(perms, 'reservations', 'edit') && (
                        <button
                          onClick={() => setClotureFor(r)}
                          disabled={!canTerminerNow}
                          className="btn-card-action btn-action-pay disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
                          title={canTerminerNow ? t('res.cloture') : t('res.terminateBlocked', { date: formatDate(r.checkOut, lang) })}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {/* "Résilier" (fsakh) — ends an active contract early and frees the apartment */}
                      {r.status === 'active' && can(perms, 'reservations', 'edit') && (
                        <button
                          onClick={() => setTerminateFor(r)}
                          className="btn-card-action btn-action-delete"
                          title={t('res.terminate')}
                        >
                          <FileX size={15} />
                        </button>
                      )}
                      {/* "Activer" for pending reservations — locked until check-in date */}
                      {r.status === 'pending' && can(perms, 'reservations', 'edit') && (
                        <button
                          onClick={() => setActivateFor(r)}
                          disabled={!canActivateNow}
                          className="btn-card-action btn-action-edit disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
                          title={canActivateNow ? t('res.activate') : t('res.activateBlocked', { date: formatDate(r.checkIn, lang) })}
                        >
                          <PlayCircle size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteOne(r)}
                          className="btn-card-action btn-action-delete"
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </GradientCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {wizardOpen && <ReservationWizard open={wizardOpen} editing={editing} onClose={() => { setWizardOpen(false); setEditing(null); }} />}
      <CalendarTimeline open={calendarOpen} onClose={() => setCalendarOpen(false)} onSelect={(r) => { setCalendarOpen(false); setDetail(r); }} />
      <DetailModal reservation={detail} onClose={() => setDetail(null)} onPrint={askPrint} onPay={(r) => { setDetail(null); setPayFor(r); }} data={data} lang={lang} />
      <PaymentModal reservation={payFor} onClose={() => setPayFor(null)} />
      <ClotureModal reservation={clotureFor} onClose={() => setClotureFor(null)} />
      <TerminateModal
        reservation={terminateFor}
        onClose={() => setTerminateFor(null)}
        onDone={(r) => { setTerminateFor(null); setPrintTermination(r); }}
      />
      <PrintPrompt
        open={!!printTermination}
        onClose={() => setPrintTermination(null)}
        onConfirm={() => { if (printTermination) setTermLangFor(printTermination); }}
        title={t('res.printTermination')}
        message={t('res.askPrintTermination')}
      />
      <TerminationLangModal
        reservation={termLangFor}
        onClose={() => setTermLangFor(null)}
        onPick={(l) => { if (termLangFor) printTerminationIn(termLangFor, l); }}
      />
      <PrintChoiceModal
        reservation={printChoice}
        onClose={() => setPrintChoice(null)}
        onPick={(kind) => { if (printChoice) doPrint(printChoice, kind); }}
      />

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!deleteOne}
        onClose={() => setDeleteOne(null)}
        onConfirm={handleDeleteOne}
        title="Supprimer la location"
        message={`Supprimer ${deleteOne?.code} ? Cette action est irréversible.`}
      />

      {/* Activate confirm */}
      <ConfirmDialog
        open={!!activateFor}
        onClose={() => setActivateFor(null)}
        onConfirm={handleActivate}
        title={t('res.activate')}
        message={`Activer la location ${activateFor?.code} et passer son statut à "En cours" ?`}
      />
    </div>
  );
}

function ClotureModal({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addPayment = useApp((s) => s.addPayment);
  const updateReservation = useApp((s) => s.updateReservation);
  const [finalPayment, setFinalPayment] = useState('');
  const [lateCharge, setLateCharge] = useState('');

  const r = reservation;
  const today = todayISO();
  const remaining = r ? reservationRemaining(r) : 0;
  const paid = r ? reservationPaid(r) : 0;

  // Late checkout calculation
  const lateNights = r ? nightsBetween(r.checkOut, today) : 0;
  const pricePerNightAll = r
    ? r.rooms.reduce((sum, rr) => {
        const room = data.rooms.find((x) => x.id === rr.roomId);
        return sum + (room?.pricePerNight ?? rr.pricePerNight);
      }, 0)
    : 0;
  const defaultLateCharge = lateNights * pricePerNightAll;

  useEffect(() => {
    if (reservation) {
      setFinalPayment('');
      setLateCharge(defaultLateCharge > 0 ? String(defaultLateCharge) : '');
    }
  }, [reservation?.id]);

  const payNum = finalPayment === '' ? 0 : Number(finalPayment);
  const lateNum = lateCharge === '' ? 0 : Number(lateCharge);
  const newTotal = (r?.total ?? 0) + lateNum;
  const totalDue = Math.max(0, newTotal - paid);

  const handleConfirm = async () => {
    if (!r) return;
    // Guard: cannot close a reservation before its check-out date.
    if (today < r.checkOut) {
      toast.error(t('res.terminateBlocked', { date: formatDate(r.checkOut, lang) }));
      return;
    }
    const updatedTotal = r.total + lateNum;
    if (payNum > 0) {
      const note = lateNights > 0
        ? `Clôture · ${lateNights} nuit${lateNights > 1 ? 's' : ''} retard`
        : 'Paiement clôture';
      await addPayment(r.id, payNum, note);
    }
    const totalPaid = paid + payNum;
    const newStatus = totalPaid >= updatedTotal ? 'paid' : 'debt';
    await updateReservation(r.id, { status: newStatus, total: updatedTotal });
    toast.success(t('toast.updated'));
    setFinalPayment('');
    setLateCharge('');
    onClose();
  };

  const close = () => { setFinalPayment(''); setLateCharge(''); onClose(); };

  return (
    <Modal
      open={!!reservation}
      onClose={close}
      title={t('res.clotureTitle')}
      subtitle={r?.code}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={close}>{t('common.cancel')}</GradientButton>
          <GradientButton variant="success" icon={<CheckCircle2 size={16} />} onClick={handleConfirm}>
            {t('res.confirmCloture')}
          </GradientButton>
        </div>
      }
    >
      {r && (
        <div className="space-y-4">
          {/* Reservation summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase mb-2">Résumé de la location</p>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Client</span>
              <span className="font-semibold">{clientName(data, r.clientId)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Appartement(s)</span>
              <span className="font-semibold">{reservationRoomLabels(data, r)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Dates</span>
              <span className="font-semibold">{formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Arrivée / Départ</span>
              <span className="font-semibold">{r.checkInTime} → {r.checkOutTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">{reservationPeriod(data, r) === 'month' ? t('res.monthsBooked') : t('res.nightsBooked')}</span>
              <span className="font-semibold">{r.nights}</span>
            </div>
          </div>

          {/* Late checkout alert */}
          {lateNights > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-rose-500 shrink-0" />
                <p className="text-sm font-bold text-rose-700">
                  Retard de {lateNights} nuit{lateNights > 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-xs text-rose-600">
                Départ prévu : {formatDate(r.checkOut, lang)} — Aujourd'hui : {formatDate(today, lang)}
              </p>
              <div className="flex items-center gap-3 pt-1 border-t border-rose-200">
                <span className="text-xs text-rose-600 flex-1">
                  Supplément retard ({lateNights}n × {formatDA(pricePerNightAll)}/n)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={lateCharge}
                    onChange={(e) => setLateCharge(e.target.value)}
                    className="w-28 rounded-lg border-2 border-rose-300 bg-white px-3 py-1.5 text-sm font-bold text-right outline-none focus:border-rose-500"
                    placeholder="0"
                  />
                  <span className="text-xs text-rose-500 font-semibold">DA</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('res.paymentHistory')}</p>
            {r.payments.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucun paiement enregistré</p>
            ) : (
              <>
                {r.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-ink-secondary">{formatDate(p.date, lang)}{p.note && ` · ${p.note}`}</span>
                    <span className="text-emerald-600 font-medium">{formatDA(p.amount)}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Financial summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase mb-2">Détail financier</p>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Total location</span>
              <span className="font-semibold">{formatDA(r.total)}</span>
            </div>
            {lateNum > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-rose-600">Supplément retard</span>
                <span className="font-semibold text-rose-600">+ {formatDA(lateNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
              <span>Total dû</span>
              <span>{formatDA(newTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Déjà payé</span>
              <span className="text-emerald-600 font-semibold">{formatDA(paid)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold ${totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              <span>Reste à payer</span>
              <span>{formatDA(totalDue)}</span>
            </div>
          </div>

          {/* Final payment */}
          {totalDue > 0 && (
            <TextField
              label={`Paiement final (reste : ${formatDA(totalDue)})`}
              type="number"
              value={finalPayment}
              onChange={(e) => setFinalPayment(e.target.value)}
              placeholder={String(totalDue)}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

function TerminateModal({
  reservation, onClose, onDone,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onDone: (r: Reservation) => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const terminateReservation = useApp((s) => s.terminateReservation);
  const [by, setBy] = useState<TerminationParty>('tenant');
  const [date, setDate] = useState(todayISO());
  const [place, setPlace] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const r = reservation;

  useEffect(() => {
    if (reservation) {
      setBy('tenant');
      setDate(todayISO());
      // "Fait à" defaults to the agency's town (last part of its address).
      setPlace((storeInfo.address ?? '').split(',').pop()?.trim() ?? '');
      setReason('');
    }
  }, [reservation?.id]);

  const handleConfirm = async () => {
    if (!r || !date) return;
    setSaving(true);
    const ok = await terminateReservation(r.id, { date, reason: reason.trim(), by, place: place.trim() });
    setSaving(false);
    if (!ok) {
      toast.error(t('res.terminateFailed'));
      return;
    }
    toast.success(t('res.terminateDone'));
    onDone(useApp.getState().reservations.find((x) => x.id === r.id) ?? r);
  };

  return (
    <Modal
      open={!!reservation}
      onClose={onClose}
      title={t('res.terminateTitle')}
      subtitle={r?.code}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton variant="danger" icon={<FileX size={16} />} onClick={handleConfirm} disabled={saving || !date}>
            {t('res.terminateConfirm')}
          </GradientButton>
        </div>
      }
    >
      {r && (
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {t('res.terminateDesc')}
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Client</span>
              <span className="font-semibold">{clientName(data, r.clientId)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Appartement(s)</span>
              <span className="font-semibold">{reservationRoomLabels(data, r)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Dates</span>
              <span className="font-semibold">{formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}</span>
            </div>
          </div>
          <FieldWrap label={t('res.terminateBy')}>
            <SegmentedControl<TerminationParty>
              value={by}
              onChange={setBy}
              size="sm"
              options={[
                { value: 'tenant', label: t('res.terminateByTenant') },
                { value: 'owner', label: t('res.terminateByOwner') },
              ]}
            />
          </FieldWrap>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label={t('res.terminateDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <TextField label={t('res.terminatePlace')} value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <TextArea label={t('res.terminateReason')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

function DetailModal({
  reservation, onClose, onPrint, onPay, data, lang,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onPrint: (r: Reservation) => void;
  onPay: (r: Reservation) => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const r = reservation;
  if (!r) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const client = clientById(data, r.clientId);
  const remaining = reservationRemaining(r);
  const paid = reservationPaid(r);
  const total = r.total;
  const pctPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  // Initials for avatar
  const clientInitials = client
    ? `${client.firstName.slice(0, 1)}${client.lastName.slice(0, 1)}`.toUpperCase()
    : 'U';

  return (
    <Modal
      open={!!reservation}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end bg-clip-text text-transparent">{r.code}</span>
          <ResStatusBadge status={r.status} />
        </div>
      }
      subtitle={client ? `${client.firstName} ${client.lastName}` : ''}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end items-center">
          <button
            onClick={() => onPrint(r)}
            className="flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 bg-white text-ink-secondary text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={16} /> {t('common.print')}
          </button>
          {remaining > 0 && (
            <button
              onClick={() => onPay(r)}
              className="btn-saas-primary h-11 px-6 text-sm active:scale-95 flex items-center gap-2"
            >
              <CreditCard size={16} /> {t('common.pay')}
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-800">
        {/* Left Column: Client & Stay Details */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Client Card */}
          {client ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-saas-primary-start to-saas-primary-via text-white font-bold text-lg shadow-sm">
                  {clientInitials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-primary">{client.firstName} {client.lastName}</h3>
                  <p className="text-xs text-ink-muted">{client.profession || 'Client Résident'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <Phone size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{t('common.phone')}</p>
                    <p className="text-ink-primary font-semibold mt-0.5">{client.phone}</p>
                    {client.phone2 && <p className="text-ink-secondary text-xs mt-0.5">{client.phone2}</p>}
                  </div>
                </div>

                {client.email && (
                  <div className="flex items-start gap-2.5">
                    <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{t('common.email')}</p>
                      <p className="text-ink-primary font-semibold mt-0.5 truncate max-w-[200px]">{client.email}</p>
                    </div>
                  </div>
                )}

                {(client.address || client.city) && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{t('common.address')}</p>
                      <p className="text-ink-primary font-semibold mt-0.5">
                        {[client.address, client.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {client.documentNumber && (
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{client.documentType || t('clients.idDocument')}</p>
                      <p className="text-ink-primary font-semibold mt-0.5">{client.documentNumber}</p>
                      {client.documentExpiryDate && (
                        <p className="text-rose-500 text-xs mt-0.5 font-medium">
                          Exp: {formatDate(client.documentExpiryDate, lang)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-center py-8">
              <User size={32} className="text-slate-350 mx-auto mb-2" />
              <p className="text-ink-secondary text-sm font-semibold">{t('common.noData')}</p>
            </div>
          )}

          {/* Card 2: Stay & Rooms details */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <CalendarDays size={14} className="text-saas-primary-via" /> Détails du séjour
            </h4>

            {/* Check-In / Check-Out timeline */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <div className="border-e border-slate-200/80">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{t('res.checkIn')}</p>
                <p className="text-base font-bold text-ink-primary mt-1">{formatDate(r.checkIn, lang)}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-ink-secondary mt-1">
                  <Clock size={12} className="text-slate-400" /> {r.checkInTime || '14:00'}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{t('res.checkOut')}</p>
                <p className="text-base font-bold text-ink-primary mt-1">{formatDate(r.checkOut, lang)}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-ink-secondary mt-1">
                  <Clock size={12} className="text-slate-400" /> {r.checkOutTime || '11:00'}
                </div>
              </div>
            </div>

            {/* Rooms List */}
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">{t('res.step3')}</p>
              {r.rooms.map((rr) => {
                const room = data.rooms.find((x) => x.id === rr.roomId);
                const category = room ? data.categories.find((c) => c.id === room.categoryId) : null;
                const floor = room ? data.floors.find((f) => f.id === room.floorId) : null;
                return (
                  <div key={rr.roomId} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink-primary">{room?.name || 'Appartement'}</p>
                        <p className="text-xs text-ink-muted">
                          {category?.name || 'Appartement'} · {floor?.name || 'Étage'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-primary">{formatDA(rr.pricePerNight)} <span className="text-[10px] font-normal text-ink-muted">/ {rentalPeriodOf(data.rooms.find((x) => x.id === rr.roomId)) === 'month' ? t('common.monthUnit') : t('common.night')}</span></p>
                      <p className="text-xs text-ink-muted">{r.nights} {reservationPeriod(data, r) === 'month' ? t('common.months') : (r.nights > 1 ? t('common.nights') : t('common.night'))}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Services List */}
            {r.services.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">{t('res.step4')}</p>
                {r.services.map((sv) => {
                  const service = data.services.find((x) => x.id === sv.serviceId);
                  return (
                    <div key={sv.serviceId} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Wallet size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink-primary">{service?.name || 'Service'}</p>
                          <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5">
                            <span>{formatDA(sv.unitPrice)}</span>
                            <span className="text-slate-400">×</span>
                            <span>{sv.quantity}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink-primary">{formatDA(sv.unitPrice * sv.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card: agency fee + employee commission */}
          {(r.agencyFee ?? 0) > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-200 pb-3">
                <Briefcase size={14} /> {t('fee.title')}
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">{t('fee.amount')}</span>
                <span className="text-lg font-extrabold text-amber-700">{formatDA(r.agencyFee ?? 0)}</span>
              </div>
              {(r.agencyFeeCommission ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-ink-primary flex items-center gap-1.5 min-w-0">
                      <HardHat size={13} className="text-amber-500 shrink-0" />
                      <span className="truncate">{workerName(data, r.agencyFeeWorkerId)}</span>
                    </span>
                    <span className="text-sm font-extrabold text-amber-700 shrink-0">{formatDA(r.agencyFeeCommission ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-ink-muted">
                      {r.agencyFeePercent ?? 0}% {t('fee.of')} {formatDA(r.agencyFee ?? 0)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${r.agencyFeeCommissionSettled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.agencyFeeCommissionSettled ? t('fee.settled') : t('fee.pending')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Termination (fsakh) details */}
          {r.status === 'terminated' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-200 pb-3">
                <FileX size={14} /> {t('res.terminateTitle')}
              </h4>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">{t('res.terminateDate')}</span>
                <span className="font-semibold">{formatDate(r.terminationDate ?? r.checkOut, lang)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">{t('res.terminateBy')}</span>
                <span className="font-semibold">{r.terminatedBy === 'owner' ? t('res.terminateByOwner') : t('res.terminateByTenant')}</span>
              </div>
              {r.terminationPlace && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-secondary">{t('res.terminatePlace')}</span>
                  <span className="font-semibold">{r.terminationPlace}</span>
                </div>
              )}
              {r.terminationReason && (
                <p className="text-sm text-ink-primary whitespace-pre-wrap pt-1">{r.terminationReason}</p>
              )}
            </div>
          )}

          {/* Notes / remarque */}
          {r.notes && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FileText size={14} className="text-saas-primary-via" /> {t('res.notes')}
              </h4>
              <p className="text-sm text-ink-primary whitespace-pre-wrap">{r.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column: Financial Card & Payments */}
        <div className="lg:col-span-4 space-y-6">

          {/* Card 3: Financial Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-920 to-slate-950 p-5 shadow-lg text-white space-y-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <DollarSign size={14} className="text-brand-400" /> Informations Financières
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{t('common.total')}</span>
                <span className="text-lg font-black text-white">{formatDA(total)}</span>
              </div>

              {(r.agencyFee ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Briefcase size={11} className="text-amber-400" /> {t('fee.title')}
                  </span>
                  <span className="text-sm font-bold text-amber-300">{formatDA(r.agencyFee ?? 0)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{t('common.paid')}</span>
                <span className="text-base font-bold text-emerald-450">{formatDA(paid)}</span>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">{t('common.remaining')}</span>
                <span className={`text-base font-extrabold ${remaining > 0 ? 'text-rose-450' : 'text-emerald-450'}`}>
                  {formatDA(remaining)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Paiement</span>
                <span>{pctPaid}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${pctPaid}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Payment History Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Wallet size={14} className="text-saas-primary-via" /> {t('res.paymentHistory')}
            </h4>

            {r.payments.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-4">Aucun paiement enregistré</p>
            ) : (
              <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 py-1">
                {r.payments.map((p) => (
                  <div key={p.id} className="relative space-y-0.5">
                    {/* Circle dot marker */}
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

function PaymentModal({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const addPayment = useApp((s) => s.addPayment);
  const [amount, setAmount] = useState('');
  const [printAsk, setPrintAsk] = useState<{ reservation: Reservation; payment: Payment } | null>(null);

  const r = reservation;
  const remaining = r ? reservationRemaining(r) : 0;
  const payNum = amount === '' ? 0 : Number(amount);
  const after = Math.max(0, remaining - payNum);

  const save = async () => {
    if (!r || payNum <= 0) return toast.error(t('login.required'));
    const amt = Math.min(payNum, remaining);
    await addPayment(r.id, amt, 'Paiement dette');
    toast.success(t('toast.paid'));
    setAmount('');
    onClose();
    // Build a receipt from the freshly-updated reservation so its totals match.
    const fresh = useApp.getState().reservations.find((x) => x.id === r.id) ?? r;
    const payment = fresh.payments[fresh.payments.length - 1]
      ?? { id: `pay-${Date.now()}`, amount: amt, date: todayISO(), note: 'Paiement dette' };
    setPrintAsk({ reservation: fresh, payment });
  };

  return (
    <>
      <Modal
        open={!!reservation}
        onClose={onClose}
        title={t('res.payDebt')}
        subtitle={r?.code}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
            <GradientButton variant="success" icon={<Wallet size={16} />} onClick={save}>{t('res.savePayment')}</GradientButton>
          </div>
        }
      >
        {r && (
          <div className="space-y-4">
            <div className="rounded-xl bg-grad-warning/10 border border-amber-400/30 p-4 text-center">
              <p className="text-xs text-ink-secondary">{t('common.remaining')}</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{formatDA(remaining)}</p>
            </div>

            {r.payments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('res.paymentHistory')}</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {r.payments.map((p) => (
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
        onConfirm={() => { if (printAsk) printDoc(`${printAsk.reservation.code}-recu`, () => buildReservationPaymentReceiptHTML(data, printAsk.reservation, printAsk.payment, storeInfo)); }}
        title={t('sales.receiptTitle')}
        message={t('sales.askPrintPayment')}
      />
    </>
  );
}

function TerminationLangModal({
  reservation, onClose, onPick,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onPick: (lang: TerminationLang) => void;
}) {
  const { t } = useI18n();
  const options: { lang: TerminationLang; flag: string; title: string; desc: string }[] = [
    { lang: 'fr', flag: 'FR', title: 'Français', desc: 'Résiliation de Contrat de Location' },
    { lang: 'ar', flag: 'ع', title: 'العربية', desc: 'فسخ عقد إيجار' },
  ];
  return (
    <Modal open={!!reservation} onClose={onClose} title={t('res.chooseLang')} subtitle={reservation?.code} size="sm">
      <div className="space-y-3">
        {options.map((o) => (
          <button
            key={o.lang}
            onClick={() => onPick(o.lang)}
            className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-start transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-600 to-yellow-700 text-lg font-extrabold text-white shadow-md">
              {o.flag}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-primary">{o.title}</span>
              <span className="block text-xs text-ink-muted mt-0.5" dir={o.lang === 'ar' ? 'rtl' : 'ltr'}>{o.desc}</span>
            </span>
            <Printer size={18} className="shrink-0 text-ink-muted" />
          </button>
        ))}
      </div>
    </Modal>
  );
}

function PrintChoiceModal({
  reservation, onClose, onPick,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onPick: (kind: PrintKind) => void;
}) {
  const { t } = useI18n();
  const options: { kind: PrintKind; icon: React.ReactNode; title: string; desc: string; tone: string }[] = [
    { kind: 'contract', icon: <FileSignature size={22} />, title: t('res.printContract'), desc: t('res.printContractDesc'), tone: 'from-sky-500 to-blue-600' },
    { kind: 'versement', icon: <Receipt size={22} />, title: t('res.printVersement'), desc: t('res.printVersementDesc'), tone: 'from-emerald-500 to-teal-600' },
  ];
  if (reservation?.status === 'terminated') {
    options.push({ kind: 'termination', icon: <FileX size={22} />, title: t('res.printTermination'), desc: t('res.printTerminationDesc'), tone: 'from-amber-600 to-yellow-700' });
  }
  return (
    <Modal open={!!reservation} onClose={onClose} title={t('res.printChoiceTitle')} subtitle={reservation?.code} size="sm">
      <div className="space-y-3">
        {options.map((o) => (
          <button
            key={o.kind}
            onClick={() => { onPick(o.kind); onClose(); }}
            className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-start transition-all hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm active:scale-[0.99]"
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${o.tone} text-white shadow-md`}>
              {o.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-primary">{o.title}</span>
              <span className="block text-xs text-ink-muted mt-0.5">{o.desc}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
