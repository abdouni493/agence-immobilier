import type { StoreInfo, ModuleKey, ActionKey } from '@/types';

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

export const fullPermissions = (): Record<ModuleKey, ActionKey[]> => {
  const out = {} as Record<ModuleKey, ActionKey[]>;
  for (const m of MODULE_ORDER) out[m] = [...MODULE_ACTIONS[m]];
  return out;
};
