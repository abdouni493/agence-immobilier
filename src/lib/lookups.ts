import type { AppData } from '@/data/seed';
import type { Client, Reservation, Room } from '@/types';
import { monthsBetween, nightsBetween } from './utils';

export function clientName(data: AppData, id: string): string {
  const c = data.clients.find((x) => x.id === id);
  return c ? `${c.firstName} ${c.lastName}` : '—';
}

export function clientById(data: AppData, id: string): Client | undefined {
  return data.clients.find((x) => x.id === id);
}

export function roomName(data: AppData, id: string): string {
  return data.rooms.find((r) => r.id === id)?.name ?? '—';
}

export function roomLabel(data: AppData, id: string): string {
  const r = data.rooms.find((x) => x.id === id);
  if (!r) return '—';
  const cat = data.categories.find((c) => c.id === r.categoryId)?.name ?? '';
  return `${r.name}${cat ? ` · ${cat}` : ''}`;
}

export function categoryName(data: AppData, id: string): string {
  return data.categories.find((c) => c.id === id)?.name ?? '—';
}

export function floorName(data: AppData, id: string): string {
  return data.floors.find((f) => f.id === id)?.name ?? '—';
}

export function serviceName(data: AppData, id: string): string {
  return data.services.find((s) => s.id === id)?.name ?? '—';
}

export function expenseCategoryName(data: AppData, id: string): string {
  return data.expenseCategories.find((c) => c.id === id)?.name ?? '—';
}

export function reservationRoomLabels(data: AppData, r: Reservation): string {
  return r.rooms.map((rr) => `Appart. ${roomName(data, rr.roomId)}`).join(' · ');
}

export function mediatorName(data: AppData, id?: string): string {
  if (!id) return '—';
  const m = data.mediators.find((x) => x.id === id);
  return m ? `${m.firstName} ${m.lastName}` : '—';
}

/** Commune line for an apartment card / invoice. */
export function roomLocation(data: AppData, id: string): string {
  const r = data.rooms.find((x) => x.id === id);
  return r?.commune || '—';
}

// ─── Rental billing helpers ─────────────────────────────────────────────────

/** Billing unit of an apartment — 'day' for legacy rows without the field. */
export function rentalPeriodOf(room: Pick<Room, 'rentalPeriod'> | undefined): 'day' | 'month' {
  return room?.rentalPeriod === 'month' ? 'month' : 'day';
}

/** How many billing units (nights or months) a stay spans for this apartment. */
export function rentalUnits(
  room: Pick<Room, 'rentalPeriod'> | undefined,
  checkIn: string,
  checkOut: string,
): number {
  return rentalPeriodOf(room) === 'month'
    ? monthsBetween(checkIn, checkOut)
    : nightsBetween(checkIn, checkOut);
}

/** The billing unit of the first apartment of a reservation. */
export function reservationPeriod(data: AppData, r: Reservation): 'day' | 'month' {
  const first = r.rooms[0];
  return rentalPeriodOf(first ? data.rooms.find((x) => x.id === first.roomId) : undefined);
}
