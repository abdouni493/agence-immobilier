import { useMemo } from 'react';
import { useApp } from './appStore';
import type { AppData } from '@/data/seed';

/**
 * Returns the full AppData object with a stable reference per slice change.
 * Selecting each slice individually avoids Zustand v5's new-object-snapshot loop.
 */
export function useAppData(): AppData {
  const clients = useApp((s) => s.clients);
  const floors = useApp((s) => s.floors);
  const categories = useApp((s) => s.categories);
  const rooms = useApp((s) => s.rooms);
  const services = useApp((s) => s.services);
  const reservations = useApp((s) => s.reservations);
  const workers = useApp((s) => s.workers);
  const expenses = useApp((s) => s.expenses);
  const expenseCategories = useApp((s) => s.expenseCategories);
  const maintenances = useApp((s) => s.maintenances);
  const cashTransactions = useApp((s) => s.cashTransactions);
  const mediators = useApp((s) => s.mediators);
  const sales = useApp((s) => s.sales);
  const purchases = useApp((s) => s.purchases);
  const roles = useApp((s) => s.roles);

  return useMemo(
    () => ({
      clients,
      floors,
      categories,
      rooms,
      services,
      reservations,
      workers,
      expenses,
      expenseCategories,
      maintenances,
      cashTransactions,
      mediators,
      sales,
      purchases,
      roles,
    }),
    [
      clients,
      floors,
      categories,
      rooms,
      services,
      reservations,
      workers,
      expenses,
      expenseCategories,
      maintenances,
      cashTransactions,
      mediators,
      sales,
      purchases,
      roles,
    ],
  );
}
