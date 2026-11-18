import type { StoreInfo, ModuleKey, ActionKey, AptField, DashCard, Permissions } from '@/types';

export const STORE_INFO: StoreInfo = {
  name: 'Ma Résidence',
  logo: null,
  description: '',
  email: '',
  phone: '',
  address: '',
  nif: '',
  nis: '',
  article: '',
  rc: '',
};

// All modules + their available actions (used by the permissions matrix)
export const MODULE_ACTIONS: Record<ModuleKey, ActionKey[]> = {
  dashboard: ['view'],
  reservations: ['view', 'create', 'edit', 'delete', 'print', 'pay'],
  ventes: ['view', 'create', 'edit', 'delete', 'print', 'pay'],
  achats: ['view', 'create', 'edit', 'delete', 'print', 'pay'],
  chambres: ['view', 'create', 'edit', 'delete'],
  services: ['view', 'create', 'edit', 'delete'],
  clients: ['view', 'create', 'edit', 'delete'],
  mediators: ['view', 'create', 'edit', 'delete', 'print', 'pay'],
  workers: ['view', 'create', 'edit', 'delete', 'pay'],
  expenses: ['view', 'create', 'edit', 'delete'],
  caisse: ['view', 'create'],
  reports: ['view', 'print'],
  settings: ['view', 'edit'],
};

export const MODULE_ORDER: ModuleKey[] = [
  'dashboard',
  'reservations',
  'ventes',
  'achats',
  'chambres',
  'services',
  'clients',
  'mediators',
  'workers',
  'expenses',
  'caisse',
  'reports',
  'settings',
];

/** Every piece of apartment information that can be shown or hidden. */
export const APT_FIELDS: AptField[] = [
  'photos', 'location', 'price', 'rooms', 'floorCategory', 'furniture',
  'description', 'owner', 'mediator', 'status', 'history',
];

/** Every dashboard statistic card whose value can be shown or zeroed. */
export const DASH_CARDS: DashCard[] = [
  'revenue', 'expenses', 'balance', 'debts', 'roomsAvailable', 'activeReservations',
  'occupancy', 'maintenance', 'totalClients', 'activeWorkers', 'monthReservations', 'topService',
];

export const fullPermissions = (): Permissions => {
  const out = {} as Record<ModuleKey, ActionKey[]>;
  for (const m of MODULE_ORDER) out[m] = [...MODULE_ACTIONS[m]];
  return { ...out, aptFields: [...APT_FIELDS], dashCards: [...DASH_CARDS] };
};
