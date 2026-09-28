import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Building2, X, Phone, User, CalendarDays, Calendar,
  TrendingUp, BedDouble, CalendarClock, ArrowRight,
} from 'lucide-react';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { cn, todayISO, formatDA, formatDate } from '@/lib/utils';
import { categoryName, clientName, clientById, activeRooms } from '@/lib/lookups';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import { reservationRemaining, reservationEnd } from '@/store/selectors';
import type { Reservation, ReservationStatus } from '@/types';

const CELL = 40;

// Semantic colour system — every reservation block is coloured by its status so
// the timeline reads at a glance and matches the legend exactly.
const STATUS_STYLES: Record<ReservationStatus, { bar: string; dot: string; ring: string }> = {
  pending:   { bar: 'from-violet-500 to-purple-500',  dot: 'from-violet-500 to-purple-500',  ring: 'shadow-violet-500/30' },
  active:    { bar: 'from-sky-500 to-blue-500',        dot: 'from-sky-500 to-blue-500',        ring: 'shadow-sky-500/30' },
  paid:      { bar: 'from-emerald-500 to-teal-500',    dot: 'from-emerald-500 to-teal-500',    ring: 'shadow-emerald-500/30' },
  debt:      { bar: 'from-amber-500 to-orange-500',    dot: 'from-amber-500 to-orange-500',    ring: 'shadow-amber-500/30' },
  cancelled: { bar: 'from-slate-400 to-slate-500',     dot: 'from-slate-400 to-slate-500',     ring: 'shadow-slate-500/20' },
  terminated: { bar: 'from-rose-500 to-red-600',       dot: 'from-rose-500 to-red-600',       ring: 'shadow-rose-500/30' },
};

const FILTER_CHIP: Record<'all' | ReservationStatus, string> = {
  all:       'from-blue-600 to-cyan-500',
  pending:   'from-violet-500 to-purple-500',
  active:    'from-sky-500 to-blue-500',
  paid:      'from-emerald-500 to-teal-500',
  debt:      'from-amber-500 to-orange-500',
  cancelled: 'from-slate-400 to-slate-500',
  terminated: 'from-rose-500 to-red-600',
};

export function CalendarTimeline({
  open, onClose, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (r: Reservation) => void;
}) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const today = todayISO();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Navigation and filter states
  const [monthOffset, setMonthOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | 'all'>('all');
  const [popover, setPopover] = useState<{ res: Reservation; x: number; y: number } | null>(null);

  const { year, month, daysInMonth, monthLabel, days } = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'long', year: 'numeric' });
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        num: i + 1,
        iso: date.toISOString().slice(0, 10),
        weekday: date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { weekday: 'narrow' }),
        isToday: date.toISOString().slice(0, 10) === today,
        isWeekend: date.getDay() === 5 || date.getDay() === 6,
      };
    });
    return { year, month, daysInMonth, monthLabel, days };
  }, [monthOffset, lang, today]);

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const dayIndexOf = (iso: string): number => {
    const d = new Date(iso);
    return d.getDate() - 1;
  };

  const handleBarClick = (e: React.MouseEvent, r: Reservation) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ res: r, x: rect.left, y: rect.bottom + 6 });
  };

  // Soft-deleted apartments never show on the timeline.
  const liveRooms = useMemo(() => activeRooms(data.rooms), [data.rooms]);

  const filteredRooms = useMemo(() => {
    if (selectedRoomId === 'all') return liveRooms;
    return liveRooms.filter((room) => room.id === selectedRoomId);
  }, [liveRooms, selectedRoomId]);

  // Professional summary metrics for the visible month.
  const stats = useMemo(() => {
    const activeRes = data.reservations.filter(
      (r) => r.status !== 'cancelled' && (statusFilter === 'all' || r.status === statusFilter),
    );
    const monthRes = activeRes.filter((r) => r.checkIn <= monthEnd && reservationEnd(r) > monthStart);

    // Occupancy = reserved room-day cells / total room-days in month.
    let occupied = 0;
    for (const room of liveRooms) {
      for (const d of days) {
        if (monthRes.some((r) => r.rooms.some((rr) => rr.roomId === room.id) && r.checkIn <= d.iso && reservationEnd(r) > d.iso)) {
          occupied++;
        }
      }
    }
    const totalCells = liveRooms.length * daysInMonth;
    const occupancy = totalCells > 0 ? Math.round((occupied / totalCells) * 100) : 0;

    // Rooms free right now (today).
    const busyToday = new Set<string>();
    for (const r of data.reservations) {
      if (r.status !== 'cancelled' && r.checkIn <= today && reservationEnd(r) > today) {
        r.rooms.forEach((rr) => busyToday.add(rr.roomId));
      }
    }
    const freeToday = Math.max(0, liveRooms.length - busyToday.size);

    return { count: monthRes.length, occupancy, freeToday, totalRooms: liveRooms.length };
  }, [data.reservations, liveRooms, statusFilter, monthStart, monthEnd, daysInMonth, days, today]);

  // Calendar Month Grid for Selected Single Room Focus View
  const gridCells = useMemo(() => {
    if (selectedRoomId === 'all') return [];

    const tempDate = new Date(year, month, 1);
    const startDayOfWeek = tempDate.getDay();
    const mondayStartOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const cells: ({ dayNum: number | null; iso: string | null }[]) = [];

    for (let i = 0; i < mondayStartOffset; i++) {
      cells.push({ dayNum: null, iso: null });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dayNum: i, iso });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dayNum: null, iso: null });
    }
    return cells;
  }, [selectedRoomId, year, month, daysInMonth]);

  const weekDays = lang === 'ar'
    ? ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex flex-col text-ink-primary select-none overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 12% 12%, rgba(99,102,241,0.10), transparent 42%),' +
            'radial-gradient(circle at 88% 8%, rgba(14,165,233,0.10), transparent 40%),' +
            'radial-gradient(circle at 78% 88%, rgba(16,185,129,0.08), transparent 44%),' +
            'linear-gradient(135deg, #16191e 0%, #1b2029 55%, #1a2430 100%)',
        }}
      >
        {/* Title Bar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 bg-white/5 backdrop-blur-xl shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-ink-primary">{t('res.timelineTitle')}</h1>
              <p className="text-xs text-ink-muted font-semibold capitalize">{monthLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Apartment Selector Dropdown */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:border-blue-300 transition-colors">
              <Building2 size={15} className="text-blue-500" />
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="bg-transparent border-0 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-0 cursor-pointer pr-4"
              >
                <option value="all">{t('common.all')} ({t('nav.chambres')})</option>
                {liveRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {categoryName(data, r.categoryId)}
                  </option>
                ))}
              </select>
            </div>

            {/* Close Button */}
            <button
              onClick={() => { setPopover(null); onClose(); }}
              className="h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </motion.header>

        {/* Stats + Filters + Navigation */}
        <section className="px-6 py-4 bg-white/5 backdrop-blur-md border-b border-slate-200/70 space-y-4">
          {/* Professional summary stats */}
          <motion.div
            variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <StatCard variant="blue" icon={<CalendarClock size={18} />} label={t('res.reservationsCount')} value={String(stats.count)} />
            <StatCard variant="emerald" icon={<TrendingUp size={18} />} label={t('res.occupancy')} value={`${stats.occupancy}%`} progress={stats.occupancy} />
            <StatCard variant="violet" icon={<BedDouble size={18} />} label={t('res.freeRooms')} value={`${stats.freeToday}/${stats.totalRooms}`} />
            <StatCard variant="amber" icon={<Building2 size={18} />} label={t('nav.chambres')} value={String(stats.totalRooms)} />
          </motion.div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status Filters */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'pending', 'active', 'paid', 'debt', 'terminated'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95',
                    statusFilter === s
                      ? `bg-gradient-to-r ${FILTER_CHIP[s]} text-white shadow-md border-transparent`
                      : 'border-slate-200 bg-white text-ink-secondary hover:border-slate-300 hover:text-ink-primary shadow-sm',
                  )}
                >
                  {s === 'all' ? t('common.all') : t(`res.status${s.charAt(0).toUpperCase() + s.slice(1)}` as `res.status${string}`)}
                </button>
              ))}
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setMonthOffset((o) => o - 1)}
                className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink-primary flex items-center justify-center transition-all active:scale-90"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-ink-primary min-w-[130px] text-center capitalize">{monthLabel}</span>
              <button
                onClick={() => setMonthOffset(0)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-bold transition-all active:scale-95',
                  monthOffset === 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-ink-primary',
                )}
              >
                {t('common.today')}
              </button>
              <button
                onClick={() => setMonthOffset((o) => o + 1)}
                className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink-primary flex items-center justify-center transition-all active:scale-90"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6" onClick={() => setPopover(null)}>

          {/* Timeline Grid Container */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden"
          >
            <div ref={scrollRef} className="overflow-x-auto">
              <div style={{ minWidth: 200 + daysInMonth * CELL }}>
                {/* Day Header Row */}
                <div className="flex bg-slate-50/90 border-b border-slate-200 py-2 sticky top-0 z-10 backdrop-blur">
                  <div className="w-[200px] shrink-0 px-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-e border-slate-200">
                    <Building2 size={14} className="text-blue-500" />
                    {t('nav.chambres')}
                  </div>
                  {days.map((d) => (
                    <div
                      key={d.iso}
                      style={{ width: CELL }}
                      className={cn('shrink-0 text-center flex flex-col items-center justify-center', d.isWeekend && 'bg-slate-50')}
                    >
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider', d.isToday ? 'text-blue-600' : 'text-slate-400')}>
                        {d.weekday}
                      </p>
                      <div className={cn(
                        'mt-1 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                        d.isToday
                          ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-blue-500/40'
                          : d.isWeekend ? 'text-slate-400' : 'text-ink-secondary',
                      )}>
                        {d.num}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rooms Rows */}
                <motion.div
                  variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
                  initial="initial"
                  animate="animate"
                  className="divide-y divide-slate-100"
                >
                  {filteredRooms.map((room) => {
                    const roomRes = data.reservations.filter((r) => {
                      if (r.status === 'cancelled') return false;
                      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
                      if (!r.rooms.some((rr) => rr.roomId === room.id)) return false;
                      return r.checkIn <= monthEnd && reservationEnd(r) > monthStart;
                    });

                    return (
                      <motion.div
                        key={room.id}
                        variants={{ initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } }}
                        className="flex items-center hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* Room label side cell */}
                        <div className="w-[200px] shrink-0 px-4 py-3 border-e border-slate-200 bg-white group-hover:bg-blue-50/40 transition-colors">
                          <p className="text-xs font-bold text-ink-primary flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-sm shadow-blue-400/50" />
                            {room.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate font-semibold mt-0.5 ml-3.5">
                            {categoryName(data, room.categoryId)}
                          </p>
                        </div>

                        {/* Room Track area */}
                        <div
                          className="relative flex-1 h-14"
                          style={{ width: daysInMonth * CELL }}
                        >
                          {/* Daily grid cells */}
                          {days.map((d, i) => (
                            <div
                              key={d.iso}
                              className={cn(
                                'absolute top-0 bottom-0 border-e border-slate-100 transition-all',
                                d.isWeekend && 'bg-slate-50/70',
                                d.isToday && 'bg-blue-50',
                              )}
                              style={{ left: i * CELL, width: CELL }}
                            >
                              {d.isToday && <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-blue-400/50" />}
                            </div>
                          ))}

                          {/* Maintenance Overlay */}
                          {room.status === 'maintenance' && (
                            <div
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 5px, transparent 5px, transparent 10px)' }}
                            />
                          )}

                          {/* Reservation blocks */}
                          <AnimatePresence>
                            {roomRes.map((r) => {
                              const startDay = Math.max(0, dayIndexOf(r.checkIn));
                              const endDay = Math.min(daysInMonth, dayIndexOf(reservationEnd(r)));
                              const width = Math.max(1, endDay - startDay) * CELL - 4;
                              const style = STATUS_STYLES[r.status];

                              return (
                                <motion.button
                                  key={r.id}
                                  initial={{ scaleX: 0, opacity: 0, originX: 0 }}
                                  animate={{ scaleX: 1, opacity: 1 }}
                                  exit={{ scaleX: 0, opacity: 0 }}
                                  whileHover={{ y: -2, scale: 1.015 }}
                                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                                  className={cn(
                                    'absolute top-2 bottom-2 rounded-lg px-2.5 text-[10px] font-bold truncate text-white shadow-lg hover:brightness-105 active:scale-95 cursor-pointer flex items-center gap-1.5 bg-gradient-to-r ring-1 ring-white/25',
                                    style.bar, style.ring,
                                  )}
                                  style={{ left: startDay * CELL + 2, width }}
                                  onClick={(e) => handleBarClick(e, r)}
                                  title={`${r.code} · ${clientName(data, r.clientId)}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-white/80 shrink-0 shadow" />
                                  <span className="truncate">{r.code} · {clientName(data, r.clientId)}</span>
                                </motion.button>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Month Grid Calendar Focus View for Single Apartment Mode */}
          {selectedRoomId !== 'all' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">
                  {t('res.monthlyCalendar')}
                </h3>
              </div>

              {/* Day names header */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                {weekDays.map((wd) => (
                  <div key={wd} className="py-2 bg-slate-50 border border-slate-100 rounded-xl">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Date grid cells */}
              <div className="grid grid-cols-7 gap-2">
                {gridCells.map((cell, idx) => {
                  if (cell.dayNum === null || !cell.iso) {
                    return <div key={`empty-${idx}`} className="aspect-video bg-slate-50/60 border border-slate-100 rounded-xl" />;
                  }

                  const roomRes = data.reservations.filter((r) => {
                    if (r.status === 'cancelled') return false;
                    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
                    return r.rooms.some((rr) => rr.roomId === selectedRoomId);
                  });

                  const activeRes = roomRes.find((r) => cell.iso && r.checkIn <= cell.iso && reservationEnd(r) > cell.iso);
                  const isToday = cell.iso === today;

                  return (
                    <motion.div
                      key={cell.iso}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: idx * 0.004 }}
                      className={cn(
                        'relative aspect-video rounded-xl p-2 flex flex-col justify-between border transition-all',
                        isToday ? 'border-blue-300 bg-blue-50/70 ring-1 ring-blue-200' : 'border-slate-100 bg-slate-50/60 hover:border-slate-200',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center',
                          isToday ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-black shadow' : 'text-ink-secondary',
                        )}>
                          {cell.dayNum}
                        </span>
                        {activeRes && (
                          <ResStatusBadge status={activeRes.status} />
                        )}
                      </div>

                      {activeRes ? (
                        <button
                          onClick={(e) => handleBarClick(e, activeRes)}
                          className={cn(
                            'w-full text-start text-[10px] font-bold p-1.5 rounded-lg text-white bg-gradient-to-r hover:brightness-105 active:scale-95 transition-all shadow-md',
                            STATUS_STYLES[activeRes.status].bar,
                          )}
                        >
                          <span className="block truncate font-extrabold">{activeRes.code}</span>
                          <span className="block truncate opacity-90 font-medium">{clientName(data, activeRes.clientId)}</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-semibold italic text-center py-2">{t('res.available')}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Legend */}
          <div className="rounded-2xl border border-slate-200 bg-white/5 backdrop-blur-md px-5 py-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">{t('res.legend')}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Legend colorClass="bg-gradient-to-r from-violet-500 to-purple-500" label={t('res.statusPending')} />
              <Legend colorClass="bg-gradient-to-r from-sky-500 to-blue-500" label={t('res.statusActive')} />
              <Legend colorClass="bg-gradient-to-r from-emerald-500 to-teal-500" label={t('res.statusPaid')} />
              <Legend colorClass="bg-gradient-to-r from-amber-500 to-orange-500" label={t('res.statusDebt')} />
              <Legend colorClass="bg-gradient-to-r from-slate-400 to-slate-500" label={t('res.statusCancelled')} />
              <Legend colorClass="bg-gradient-to-r from-rose-500 to-red-600" label={t('res.statusTerminated')} />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
                <span className="h-3.5 w-6 rounded border border-slate-200" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 4px, transparent 4px, transparent 8px)', opacity: 0.55 }} />
                {t('rooms.maintenance')}
              </span>
            </div>
          </div>
        </main>

        {/* Popover detailed info card */}
        <AnimatePresence>
          {popover && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="fixed z-50 w-72 rounded-2xl bg-white border border-slate-200 p-4 shadow-2xl shadow-slate-400/30 text-ink-primary"
              style={{
                top: Math.min(popover.y, window.innerHeight - 300),
                left: Math.min(popover.x, window.innerWidth - 300),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-ink-primary text-sm">{popover.res.code}</span>
                  <ResStatusBadge status={popover.res.status} />
                </div>
                <button onClick={() => setPopover(null)} className="text-slate-400 hover:text-ink-primary transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-ink-secondary">
                  <User size={13} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-ink-primary truncate">{clientName(data, popover.res.clientId)}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-secondary">
                  <Phone size={13} className="text-blue-500 shrink-0" />
                  <span className="truncate">{clientById(data, popover.res.clientId)?.phone ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-secondary">
                  <CalendarDays size={13} className="text-blue-500 shrink-0" />
                  <span className="truncate flex items-center gap-1">
                    {formatDate(popover.res.checkIn, lang)} <ArrowRight size={11} className="text-ink-muted" /> {formatDate(popover.res.checkOut, lang)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-ink-muted text-xs">{t('common.total')}</span>
                  <span className="font-extrabold text-ink-primary">{formatDA(popover.res.total)}</span>
                </div>
                {reservationRemaining(popover.res) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted text-xs">{t('common.remaining')}</span>
                    <span className="font-extrabold text-amber-600">{formatDA(reservationRemaining(popover.res))}</span>
                  </div>
                )}
              </div>
              <GradientButton
                size="sm"
                fullWidth
                className="mt-4"
                onClick={() => { setPopover(null); onSelect(popover.res); }}
              >
                {t('common.details')}
              </GradientButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

const STAT_VARIANTS: Record<string, { icon: string; bar: string }> = {
  blue:    { icon: 'bg-blue-50 text-blue-600',       bar: 'from-blue-500 to-cyan-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', bar: 'from-emerald-500 to-teal-500' },
  violet:  { icon: 'bg-violet-50 text-violet-600',   bar: 'from-violet-500 to-purple-500' },
  amber:   { icon: 'bg-amber-50 text-amber-600',     bar: 'from-amber-500 to-orange-500' },
};

function StatCard({
  icon, label, value, variant, progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant: keyof typeof STAT_VARIANTS;
  progress?: number;
}) {
  const v = STAT_VARIANTS[variant];
  return (
    <motion.div
      variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }}
      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex items-center gap-3"
    >
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', v.icon)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-extrabold text-ink-primary leading-tight">{value}</p>
        {typeof progress === 'number' && (
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={cn('h-full rounded-full bg-gradient-to-r', v.bar)}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
      <span className={cn('h-3.5 w-6 rounded shadow-sm', colorClass)} />
      {label}
    </span>
  );
}
