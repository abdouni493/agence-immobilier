// ============ AUTH & USERS ============
export type Role = 'admin' | 'worker';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  avatar: string | null;
  workerId?: string; // link to a worker record if role === 'worker'
  permissions?: Permissions; // worker's own permissions, loaded at auth time
}

// ============ PERMISSIONS ============
export type ModuleKey =
  | 'dashboard'
  | 'reservations'
  | 'ventes'
  | 'achats'
  | 'chambres'
  | 'services'
  | 'clients'
  | 'mediators'
  | 'workers'
  | 'expenses'
  | 'caisse'
  | 'reports'
  | 'settings';

export type ActionKey = 'view' | 'create' | 'edit' | 'delete' | 'print' | 'pay';

export type Permissions = Partial<Record<ModuleKey, ActionKey[]>>;

// ============ CLIENTS ============
export type Sexe = 'M' | 'F';
export type DocumentType = 'permis' | 'cin' | 'passeport';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  birthPlace?: string;
  sexe?: Sexe;
  profession?: string;
  address?: string;
  city?: string;
  phone: string;
  phone2?: string;
  email?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  documentIssueDate?: string;
  documentExpiryDate?: string;
  documentIssuePlace?: string;
  photos?: string[]; // data URLs
  createdAt: string;
}

// ============ ROOMS ============
export type RoomStatus = 'available' | 'occupied' | 'maintenance';
export type PropertyType = 'rental' | 'sale';

export interface Floor {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string; // e.g. "203"
  capacity: number; // nombre de chambres
  floorId: string;
  categoryId: string;
  pricePerNight: number;
  status: RoomStatus;
  maintenanceNote?: string;
  // Fiche appartement (agence immobilière)
  wilaya?: string;
  commune?: string;
  secteur?: string;
  description?: string;
  propertyType?: PropertyType; // location (rental) ou vente (sale)
  ownerClientId?: string; // client qui a confié / vendu cet appartement à l'agence
  ownerName?: string; // nom complet du propriétaire (optionnel, saisie libre)
  ownerPhone?: string; // téléphone du propriétaire (optionnel, saisie libre)
  mediatorId?: string; // médiateur associé à cet appartement (optionnel)
  salePrice?: number; // prix de vente affiché
  purchasePrice?: number; // prix d'achat par l'agence
}

export interface Maintenance {
  id: string;
  roomId: string;
  name: string;
  cost: number;
  date: string;
  description?: string;
}

// ============ SERVICES ============
export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
}

// ============ RESERVATIONS ============
export type ReservationStatus = 'paid' | 'debt' | 'active' | 'pending' | 'cancelled';

export interface ReservationRoom {
  roomId: string;
  pricePerNight: number;
}

export interface ReservationService {
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Reservation {
  id: string;
  code: string; // RES-001
  clientId: string;
  rooms: ReservationRoom[];
  services: ReservationService[];
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  checkInTime: string; // HH:MM
  checkOutTime: string; // HH:MM
  nights: number;
  total: number; // editable total
  payments: Payment[];
  status: ReservationStatus;
  createdAt: string;
  notes?: string; // client-provided description/remarque
}

// ============ MEDIATORS ============
export interface MediatorPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Mediator {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  cin?: string;
  notes?: string;
  payments: MediatorPayment[];
  createdAt: string;
}

// ============ SALES (VENTES) ============
export type SaleStatus = 'paid' | 'debt';
export type CommissionType = 'amount' | 'percent';

export interface Sale {
  id: string;
  code: string; // VEN-001
  roomId: string; // appartement vendu
  clientId: string; // acheteur
  mediatorId?: string;
  commissionType: CommissionType;
  commissionPercent?: number; // si commissionType === 'percent'
  mediatorCommission: number; // montant final en DA
  price: number; // prix de vente
  date: string; // ISO date
  time: string; // HH:MM
  payments: Payment[];
  status: SaleStatus;
  notes?: string;
  createdAt: string;
}

// ============ PURCHASES (ACHATS) ============
export interface Purchase {
  id: string;
  code: string; // ACH-001
  roomId: string; // appartement acquis
  clientId: string; // vendeur (client qui vend à l'agence)
  purchasePrice: number; // prix payé par l'agence
  salePrice: number; // prix de revente prévu
  date: string; // ISO date
  time: string; // HH:MM
  payments: Payment[]; // paiements de l'agence au vendeur
  status: SaleStatus;
  notes?: string;
  createdAt: string;
}

// ============ WORKERS ============
export type SalaryType = 'daily' | 'monthly';

export interface Advance {
  id: string;
  date: string;
  description?: string;
  amount: number;
  deducted: boolean;
}

export interface Absence {
  id: string;
  date: string;
  description?: string;
  cost: number;
}

export interface WorkerPayment {
  id: string;
  date: string;
  amount: number;
  description?: string;
}

export interface Worker {
  id: string;
  name: string;
  birthDate?: string;
  cin?: string;
  phone: string;
  role: string; // job title
  startDate: string;
  hasSalary: boolean;
  salaryType?: SalaryType;
  salaryAmount?: number;
  hasAccount: boolean;
  account?: { email: string; username: string; password: string };
  authUserId?: string; // links the worker row to its auth.users / profile id
  permissions: Permissions;
  advances: Advance[];
  absences: Absence[];
  payments: WorkerPayment[];
  active: boolean;
}

// ============ EXPENSES ============
export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  amount: number;
  date: string;
}

// ============ CAISSE ============
export type CashType = 'deposit' | 'withdrawal';

export interface CashTransaction {
  id: string;
  type: CashType;
  amount: number;
  description: string;
  date: string;
}

// ============ SETTINGS ============
export interface StoreInfo {
  name: string;
  logo: string | null;
  description: string;
  email: string;
  phone: string;
  address: string;
  nif: string;
  nis: string;
  article: string;
  rc: string;
}
