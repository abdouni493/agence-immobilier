import type { Reservation, Room, Worker, Sale, Purchase, Mediator } from '@/types';
import type { AppData } from '@/data/seed';
import { nightsBetween, rangesOverlap, monthKey } from '@/lib/utils';

export interface WorkerPayCalc {
  gross: number;
  absencesDeduction: number;
  advancesDeduction: number;
  net: number;
  totalPaid: number;
}

const DAYS_PER_MONTH = 26;

export function workerPayCalc(w: Worker): WorkerPayCalc {
  const gross = w.hasSalary
    ? w.salaryType === 'monthly'
      ? w.salaryAmount ?? 0
      : (w.salaryAmount ?? 0) * DAYS_PER_MONTH
    : 0;
  const absencesDeduction = w.absences.reduce((s, a) => s + a.cost, 0);
  const advancesDeduction = w.advances.filter((a) => !a.deducted).reduce((s, a) => s + a.amount, 0);
  const net = Math.max(0, gross - absencesDeduction - advancesDeduction);
  const totalPaid = w.payments.reduce((s, p) => s + p.amount, 0);
  return { gross, absencesDeduction, advancesDeduction, net, totalPaid };
}

export function reservationPaid(r: Reservation): number {
  if (r.status === 'cancelled') return 0;
  return r.payments.reduce((s, p) => s + p.amount, 0);
}

export function reservationRemaining(r: Reservation): number {
  if (r.status === 'cancelled') return 0;
  return Math.max(0, r.total - reservationPaid(r));
}

// -------- Sales / Purchases / Mediators --------

export function salePaid(s: Sale): number {
  return s.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function saleRemaining(s: Sale): number {
  return Math.max(0, s.price - salePaid(s));
}

export function purchasePaid(p: Purchase): number {
  return p.payments.reduce((sum, x) => sum + x.amount, 0);
}

export function purchaseRemaining(p: Purchase): number {
  return Math.max(0, p.purchasePrice - purchasePaid(p));
}

/** Total commission a mediator has earned across all sales. */
export function mediatorCommissionEarned(mediatorId: string, sales: Sale[]): number {
  return sales
    .filter((s) => s.mediatorId === mediatorId)
    .reduce((sum, s) => sum + s.mediatorCommission, 0);
}

export function mediatorPaid(m: Mediator): number {
  return m.payments.reduce((sum, p) => sum + p.amount, 0);
}

/** What the agency still owes this mediator. */
export function mediatorRemaining(m: Mediator, sales: Sale[]): number {
  return Math.max(0, mediatorCommissionEarned(m.id, sales) - mediatorPaid(m));
}

export interface MediatorStats {
  salesCount: number;
  commissionEarned: number;
  paid: number;
  remaining: number;
}

export function mediatorStats(m: Mediator, sales: Sale[]): MediatorStats {
  const list = sales.filter((s) => s.mediatorId === m.id);
  const commissionEarned = list.reduce((sum, s) => sum + s.mediatorCommission, 0);
  const paid = mediatorPaid(m);
  return {
    salesCount: list.length,
    commissionEarned,
    paid,
    remaining: Math.max(0, commissionEarned - paid),
  };
}

/** Sum of sale payments whose payment date falls inside [from,to]. */
export function saleIncomeInRange(sales: Sale[], from: string, to: string): number {
  let total = 0;
  for (const s of sales) {
    for (const p of s.payments) {
      if (p.date >= from && p.date <= to) total += p.amount;
    }
  }
  return total;
}

/** Sum of purchase payments (money OUT to sellers) inside [from,to]. */
export function purchaseOutInRange(purchases: Purchase[], from: string, to: string): number {
  let total = 0;
  for (const pu of purchases) {
    for (const p of pu.payments) {
      if (p.date >= from && p.date <= to) total += p.amount;
    }
  }
  return total;
}

/** Sum of mediator commission payments (money OUT) inside [from,to]. */
export function mediatorOutInRange(mediators: Mediator[], from: string, to: string): number {
  let total = 0;
  for (const m of mediators) {
    for (const p of m.payments) {
      if (p.date >= from && p.date <= to) total += p.amount;
    }
  }
  return total;
}

/** Live room status: maintenance flag wins, else occupied if an active reservation covers `today`. */
export function effectiveRoomStatus(
  room: Room,
  reservations: Reservation[],
  today: string,
): 'available' | 'occupied' | 'maintenance' {
  if (room.status === 'maintenance') return 'maintenance';
  const occupied = reservations.some(
    (r) =>
      r.status !== 'cancelled' &&
      r.rooms.some((rr) => rr.roomId === room.id) &&
      r.checkIn <= today &&
      today < r.checkOut,
  );
  return occupied ? 'occupied' : 'available';
}

export function isRoomAvailableForRange(
  roomId: string,
  checkIn: string,
  checkOut: string,
  reservations: Reservation[],
  excludeReservationId?: string,
): boolean {
  return !reservations.some(
    (r) =>
      r.id !== excludeReservationId &&
      r.status !== 'cancelled' &&
      r.rooms.some((rr) => rr.roomId === roomId) &&
      rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut),
  );
}

export interface ClientStats {
  reservations: number;
  totalSpent: number; // total of all reservations
  totalPaid: number;
  totalDebt: number;
}

export function clientStats(clientId: string, reservations: Reservation[]): ClientStats {
  const list = reservations.filter((r) => r.clientId === clientId && r.status !== 'cancelled');
  let totalSpent = 0;
  let totalPaid = 0;
  let totalDebt = 0;
  for (const r of list) {
    totalSpent += r.total;
    totalPaid += reservationPaid(r);
    totalDebt += reservationRemaining(r);
  }
  return { reservations: list.length, totalSpent, totalPaid, totalDebt };
}

function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

/** Sum of reservation payments whose payment date falls inside [from,to]. */
export function reservationIncomeInRange(
  reservations: Reservation[],
  from: string,
  to: string,
): number {
  let total = 0;
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    for (const p of r.payments) {
      if (inRange(p.date, from, to)) total += p.amount;
    }
  }
  return total;
}

export interface CaisseRecap {
  reservationIncome: number;
  saleIncome: number;
  manualDeposits: number;
  totalIn: number;
  generalExpenses: number;
  generalByCategory: { name: string; total: number }[];
  maintenances: number;
  maintenanceByRoom: { name: string; total: number }[];
  salaries: number;
  advances: number;
  purchaseOut: number;
  purchaseByCode: { name: string; total: number }[];
  mediatorOut: number;
  mediatorByName: { name: string; total: number }[];
  manualWithdrawals: number;
  totalOut: number;
  net: number;
}

export function caisseRecap(data: AppData, from: string, to: string): CaisseRecap {
  const reservationIncome = reservationIncomeInRange(data.reservations, from, to);
  const saleIncome = saleIncomeInRange(data.sales, from, to);

  // purchases: money out to sellers, broken down per purchase code
  const purchaseMap = new Map<string, number>();
  let purchaseOut = 0;
  for (const pu of data.purchases) {
    for (const p of pu.payments) {
      if (!inRange(p.date, from, to)) continue;
      purchaseOut += p.amount;
      purchaseMap.set(pu.code, (purchaseMap.get(pu.code) ?? 0) + p.amount);
    }
  }
  const purchaseByCode = [...purchaseMap.entries()].map(([name, total]) => ({ name, total }));

  // mediators: commissions paid out, broken down per mediator
  const mediatorMap = new Map<string, number>();
  let mediatorOut = 0;
  for (const m of data.mediators) {
    for (const p of m.payments) {
      if (!inRange(p.date, from, to)) continue;
      mediatorOut += p.amount;
      const name = `${m.firstName} ${m.lastName}`;
      mediatorMap.set(name, (mediatorMap.get(name) ?? 0) + p.amount);
    }
  }
  const mediatorByName = [...mediatorMap.entries()].map(([name, total]) => ({ name, total }));

  const manualDeposits = data.cashTransactions
    .filter((t) => t.type === 'deposit' && inRange(t.date, from, to))
    .reduce((s, t) => s + t.amount, 0);
  const manualWithdrawals = data.cashTransactions
    .filter((t) => t.type === 'withdrawal' && inRange(t.date, from, to))
    .reduce((s, t) => s + t.amount, 0);

  // general expenses by category
  const catMap = new Map<string, number>();
  let generalExpenses = 0;
  for (const e of data.expenses) {
    if (!inRange(e.date, from, to)) continue;
    generalExpenses += e.amount;
    const cat = data.expenseCategories.find((c) => c.id === e.categoryId)?.name ?? 'Divers';
    catMap.set(cat, (catMap.get(cat) ?? 0) + e.amount);
  }
  const generalByCategory = [...catMap.entries()].map(([name, total]) => ({ name, total }));

  // maintenances by room
  const roomMap = new Map<string, number>();
  let maintenances = 0;
  for (const m of data.maintenances) {
    if (!inRange(m.date, from, to)) continue;
    maintenances += m.cost;
    const rname = data.rooms.find((r) => r.id === m.roomId)?.name ?? '—';
    roomMap.set(rname, (roomMap.get(rname) ?? 0) + m.cost);
  }
  const maintenanceByRoom = [...roomMap.entries()].map(([name, total]) => ({
    name: `Appartement ${name}`,
    total,
  }));

  // salaries + advances
  let salaries = 0;
  let advances = 0;
  for (const w of data.workers) {
    for (const p of w.payments) if (inRange(p.date, from, to)) salaries += p.amount;
    for (const a of w.advances) if (inRange(a.date, from, to)) advances += a.amount;
  }

  const totalIn = reservationIncome + saleIncome + manualDeposits;
  const totalOut =
    generalExpenses + maintenances + salaries + advances + purchaseOut + mediatorOut + manualWithdrawals;
  return {
    reservationIncome,
    saleIncome,
    manualDeposits,
    totalIn,
    generalExpenses,
    generalByCategory,
    maintenances,
    maintenanceByRoom,
    salaries,
    advances,
    purchaseOut,
    purchaseByCode,
    mediatorOut,
    mediatorByName,
    manualWithdrawals,
    totalOut,
    net: totalIn - totalOut,
  };
}

/** All-time caisse balance. */
export function caisseBalance(data: AppData): number {
  const farPast = '2000-01-01';
  const farFuture = '2999-12-31';
  return caisseRecap(data, farPast, farFuture).net;
}

// -------- Dashboard KPIs --------
export interface Kpis {
  monthRevenue: number;
  monthExpenses: number;
  balance: number;
  clientDebts: number;
  roomsAvailable: number;
  roomsTotal: number;
  activeToday: number;
  occupancy: number;
  roomsMaintenance: number;
  totalClients: number;
  activeWorkers: number;
  topService: string;
  monthReservations: number;
}

export function computeKpis(data: AppData, today: string): Kpis {
  const mKey = monthKey(today);
  const monthStart = `${mKey}-01`;
  const monthEnd = `${mKey}-31`;

  const monthRevenue =
    reservationIncomeInRange(data.reservations, monthStart, monthEnd) +
    saleIncomeInRange(data.sales, monthStart, monthEnd);
  const monthExpenses =
    data.expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd).reduce((s, e) => s + e.amount, 0) +
    data.maintenances.filter((m) => m.date >= monthStart && m.date <= monthEnd).reduce((s, m) => s + m.cost, 0) +
    purchaseOutInRange(data.purchases, monthStart, monthEnd) +
    mediatorOutInRange(data.mediators, monthStart, monthEnd);

  const clientDebts =
    data.reservations.reduce((s, r) => s + reservationRemaining(r), 0) +
    data.sales.reduce((s, v) => s + saleRemaining(v), 0);

  const statuses = data.rooms.map((r) => effectiveRoomStatus(r, data.reservations, today));
  const roomsTotal = data.rooms.length;
  const roomsMaintenance = statuses.filter((s) => s === 'maintenance').length;
  const occupied = statuses.filter((s) => s === 'occupied').length;
  const roomsAvailable = statuses.filter((s) => s === 'available').length;
  const bookable = roomsTotal - roomsMaintenance;
  const occupancy = bookable > 0 ? Math.round((occupied / bookable) * 100) : 0;

  const activeToday = data.reservations.filter(
    (r) => r.status !== 'cancelled' && r.checkIn <= today && today < r.checkOut,
  ).length;

  // Top service
  const svcCount = new Map<string, number>();
  for (const r of data.reservations) {
    for (const sv of r.services) {
      svcCount.set(sv.serviceId, (svcCount.get(sv.serviceId) ?? 0) + sv.quantity);
    }
  }
  let topService = '—';
  let max = 0;
  for (const [id, c] of svcCount) {
    if (c > max) {
      max = c;
      topService = data.services.find((s) => s.id === id)?.name ?? '—';
    }
  }

  const monthReservations = data.reservations.filter(
    (r) => r.checkIn >= monthStart && r.checkIn <= monthEnd,
  ).length;

  return {
    monthRevenue,
    monthExpenses,
    balance: caisseBalance(data),
    clientDebts,
    roomsAvailable,
    roomsTotal,
    activeToday,
    occupancy,
    roomsMaintenance,
    totalClients: data.clients.length,
    activeWorkers: data.workers.filter((w) => w.active).length,
    topService,
    monthReservations,
  };
}

// -------- Charts --------
export function lastNMonths(n: number, today: string): string[] {
  const out: string[] = [];
  const d = new Date(today);
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const c = new Date(d);
    c.setMonth(c.getMonth() - i);
    out.push(c.toISOString().slice(0, 7));
  }
  return out;
}

export function monthLabel(mk: string, locale: 'fr' | 'ar' = 'fr'): string {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    month: 'short',
    year: '2-digit',
  });
}

export function revenueByMonth(reservations: Reservation[], months: string[]): number[] {
  return months.map((mk) =>
    reservationIncomeInRange(reservations, `${mk}-01`, `${mk}-31`),
  );
}

export function reservationsByMonth(reservations: Reservation[], months: string[]): number[] {
  return months.map(
    (mk) => reservations.filter((r) => monthKey(r.checkIn) === mk && r.status !== 'cancelled').length,
  );
}

export function occupancyByFloor(data: AppData, today: string) {
  return data.floors.map((f) => {
    const floorRooms = data.rooms.filter((r) => r.floorId === f.id);
    const bookable = floorRooms.filter((r) => r.status !== 'maintenance');
    const occ = bookable.filter(
      (r) => effectiveRoomStatus(r, data.reservations, today) === 'occupied',
    ).length;
    const rate = bookable.length > 0 ? Math.round((occ / bookable.length) * 100) : 0;
    return { name: f.name, rate };
  });
}

export function expensesByCategory(data: AppData) {
  const map = new Map<string, number>();
  for (const e of data.expenses) {
    const cat = data.expenseCategories.find((c) => c.id === e.categoryId)?.name ?? 'Divers';
    map.set(cat, (map.get(cat) ?? 0) + e.amount);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

/** Nights sold per room over an optional range. */
export function nightsSoldByRoom(data: AppData, from?: string, to?: string) {
  const map = new Map<string, number>();
  for (const r of data.reservations) {
    if (r.status === 'cancelled') continue;
    if (from && to && !(r.checkIn >= from && r.checkIn <= to)) continue;
    const n = nightsBetween(r.checkIn, r.checkOut);
    for (const rr of r.rooms) {
      const name = data.rooms.find((x) => x.id === rr.roomId)?.name ?? '—';
      map.set(name, (map.get(name) ?? 0) + n);
    }
  }
  return [...map.entries()].map(([name, nights]) => ({ name, nights }));
}
