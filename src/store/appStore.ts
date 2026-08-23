import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { todayISO } from '@/lib/utils';
import type {
  User,
  StoreInfo,
  Client,
  Room,
  Floor,
  Category,
  Service,
  Reservation,
  ReservationRoom,
  ReservationService,
  Payment,
  Worker,
  Advance,
  Absence,
  WorkerPayment,
  Expense,
  ExpenseCategory,
  Maintenance,
  CashTransaction,
  Mediator,
  MediatorPayment,
  Sale,
  Purchase,
  Permissions,
  ModuleKey,
} from '@/types';
import { createInitialData, type AppData } from '@/data/seed';
import { STORE_INFO } from '@/data/constants';

// ─── DB → TypeScript mappers ───────────────────────────────────────────────

function dbToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    birthDate: (row.birth_date as string) || undefined,
    birthPlace: (row.birth_place as string) || undefined,
    sexe: (row.sexe as Client['sexe']) || undefined,
    profession: (row.profession as string) || undefined,
    address: (row.address as string) || undefined,
    city: (row.city as string) || undefined,
    phone: row.phone as string,
    phone2: (row.phone2 as string) || undefined,
    email: (row.email as string) || undefined,
    documentType: (row.document_type as Client['documentType']) || undefined,
    documentNumber: (row.document_number as string) || undefined,
    documentIssueDate: (row.document_issue_date as string) || undefined,
    documentExpiryDate: (row.document_expiry_date as string) || undefined,
    documentIssuePlace: (row.document_issue_place as string) || undefined,
    photos: (row.photo_urls as string[]) || [],
    createdAt: ((row.created_at as string) || '').slice(0, 10),
  };
}

function dbToFloor(row: Record<string, unknown>): Floor {
  return { id: row.id as string, name: row.name as string };
}

function dbToCategory(row: Record<string, unknown>): Category {
  return { id: row.id as string, name: row.name as string };
}

function dbToRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    name: row.name as string,
    capacity: row.capacity as number,
    floorId: row.floor_id as string,
    categoryId: row.category_id as string,
    pricePerNight: row.price_per_night as number,
    status: row.status as Room['status'],
    maintenanceNote: (row.maintenance_note as string) || undefined,
    commune: (row.commune as string) || undefined,
    description: (row.description as string) || undefined,
    rentalPeriod: (row.rental_period as Room['rentalPeriod']) || 'day',
    furnished: row.furnished === true,
    furnitureDescription: (row.furniture_description as string) || undefined,
    propertyType: (row.property_type as Room['propertyType']) || 'rental',
    ownerClientId: (row.owner_client_id as string) || undefined,
    ownerName: (row.owner_name as string) || undefined,
    ownerPhone: (row.owner_phone as string) || undefined,
    ownerPhone2: (row.owner_phone2 as string) || undefined,
    ownerEmail: (row.owner_email as string) || undefined,
    ownerAddress: (row.owner_address as string) || undefined,
    ownerCity: (row.owner_city as string) || undefined,
    ownerProfession: (row.owner_profession as string) || undefined,
    ownerDocumentType: (row.owner_document_type as Room['ownerDocumentType']) || undefined,
    ownerDocumentNumber: (row.owner_document_number as string) || undefined,
    mediatorId: (row.mediator_id as string) || undefined,
    salePrice: row.sale_price != null ? (row.sale_price as number) : undefined,
    purchasePrice: row.purchase_price != null ? (row.purchase_price as number) : undefined,
    photos: (row.photo_urls as string[]) || [],
    deleted: row.deleted === true,
    deletedAt: (row.deleted_at as string) || undefined,
  };
}

function dbToPaymentRow(p: Record<string, unknown>): Payment {
  return {
    id: p.id as string,
    amount: p.amount as number,
    date: p.date as string,
    note: (p.note as string) || undefined,
  };
}

function dbToMediator(row: Record<string, unknown>): Mediator {
  const payments: MediatorPayment[] = ((row.mediator_payments as Record<string, unknown>[]) || [])
    .map(dbToPaymentRow)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    phone: row.phone as string,
    phone2: (row.phone2 as string) || undefined,
    email: (row.email as string) || undefined,
    address: (row.address as string) || undefined,
    city: (row.city as string) || undefined,
    cin: (row.cin as string) || undefined,
    notes: (row.notes as string) || undefined,
    payments,
    createdAt: ((row.created_at as string) || '').slice(0, 10),
  };
}

function dbToSale(row: Record<string, unknown>): Sale {
  const payments: Payment[] = ((row.sale_payments as Record<string, unknown>[]) || [])
    .map(dbToPaymentRow)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    id: row.id as string,
    code: row.code as string,
    roomId: (row.room_id as string) || '',
    clientId: row.client_id as string,
    mediatorId: (row.mediator_id as string) || undefined,
    commissionType: (row.commission_type as Sale['commissionType']) || 'amount',
    commissionPercent: row.commission_percent != null ? (row.commission_percent as number) : undefined,
    mediatorCommission: (row.mediator_commission as number) || 0,
    price: row.price as number,
    date: row.date as string,
    time: (row.time as string) || '10:00',
    payments,
    status: row.status as Sale['status'],
    notes: (row.notes as string) || undefined,
    createdAt: ((row.created_at as string) || '').slice(0, 10),
  };
}

function dbToPurchase(row: Record<string, unknown>): Purchase {
  const payments: Payment[] = ((row.purchase_payments as Record<string, unknown>[]) || [])
    .map(dbToPaymentRow)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    id: row.id as string,
    code: row.code as string,
    roomId: (row.room_id as string) || '',
    clientId: row.client_id as string,
    purchasePrice: (row.purchase_price as number) || 0,
    salePrice: (row.sale_price as number) || 0,
    date: row.date as string,
    time: (row.time as string) || '10:00',
    payments,
    status: row.status as Purchase['status'],
    notes: (row.notes as string) || undefined,
    createdAt: ((row.created_at as string) || '').slice(0, 10),
  };
}

function dbToService(row: Record<string, unknown>): Service {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    price: row.price as number,
  };
}

function dbToReservation(row: Record<string, unknown>): Reservation {
  const rooms: ReservationRoom[] = ((row.reservation_rooms as Record<string, unknown>[]) || []).map(
    (rr) => ({ roomId: rr.room_id as string, pricePerNight: rr.price_per_night as number }),
  );
  const services: ReservationService[] = (
    (row.reservation_services as Record<string, unknown>[]) || []
  ).map((rs) => ({
    serviceId: rs.service_id as string,
    quantity: rs.quantity as number,
    unitPrice: rs.unit_price as number,
  }));
  const payments: Payment[] = ((row.payments as Record<string, unknown>[]) || []).map((p) => ({
    id: p.id as string,
    amount: p.amount as number,
    date: p.date as string,
    note: (p.note as string) || undefined,
  }));
  const r: Reservation = {
    id: row.id as string,
    code: row.code as string,
    clientId: row.client_id as string,
    rooms,
    services,
    checkIn: row.check_in as string,
    checkOut: row.check_out as string,
    checkInTime: (row.check_in_time as string) || '14:00',
    checkOutTime: (row.check_out_time as string) || '11:00',
    nights: row.nights as number,
    total: row.total as number,
    payments,
    status: row.status as Reservation['status'],
    createdAt: ((row.created_at as string) || '').slice(0, 10),
    notes: (row.notes as string) || undefined,
    agencyFee: (row.agency_fee as number) || 0,
    agencyFeeCommissionEnabled: row.agency_fee_worker_id != null,
    agencyFeeWorkerId: (row.agency_fee_worker_id as string) || undefined,
    agencyFeePercent: row.agency_fee_percent != null ? (row.agency_fee_percent as number) : undefined,
    agencyFeeCommission: (row.agency_fee_commission as number) || 0,
    agencyFeeCommissionSettled: row.agency_fee_commission_settled === true,
    agencyFeeCommissionPaymentId: (row.agency_fee_commission_payment_id as string) || undefined,
  };
  return r;
}

function dbToWorker(row: Record<string, unknown>): Worker {
  const advances: Advance[] = ((row.worker_advances as Record<string, unknown>[]) || []).map(
    (a) => ({
      id: a.id as string,
      date: a.date as string,
      description: (a.description as string) || undefined,
      amount: a.amount as number,
      deducted: a.deducted as boolean,
      workerPaymentId: (a.worker_payment_id as string) || undefined,
    }),
  );
  const absences: Absence[] = ((row.worker_absences as Record<string, unknown>[]) || []).map(
    (a) => ({
      id: a.id as string,
      date: a.date as string,
      description: (a.description as string) || undefined,
      cost: a.cost as number,
      deducted: a.deducted === true,
      workerPaymentId: (a.worker_payment_id as string) || undefined,
    }),
  );
  const payments: WorkerPayment[] = ((row.worker_payments as Record<string, unknown>[]) || []).map(
    (p) => ({
      id: p.id as string,
      date: p.date as string,
      amount: p.amount as number,
      description: (p.description as string) || undefined,
      gross: p.gross != null ? (p.gross as number) : undefined,
      commissionsTotal: p.commissions_total != null ? (p.commissions_total as number) : undefined,
      absencesTotal: p.absences_total != null ? (p.absences_total as number) : undefined,
      advancesTotal: p.advances_total != null ? (p.advances_total as number) : undefined,
    }),
  );
  const profile = row.profiles as Record<string, unknown> | null;
  return {
    id: row.id as string,
    name: row.name as string,
    birthDate: (row.birth_date as string) || undefined,
    cin: (row.cin as string) || undefined,
    phone: row.phone as string,
    role: row.role as string,
    startDate: row.start_date as string,
    hasSalary: row.has_salary as boolean,
    salaryType: (row.salary_type as Worker['salaryType']) || undefined,
    salaryAmount: (row.salary_amount as number) || undefined,
    hasAccount: row.has_account as boolean,
    account:
      row.has_account && profile
        ? {
            email: (profile.email as string) || '',
            username: (profile.username as string) || '',
            password: '',
          }
        : undefined,
    authUserId: (row.auth_user_id as string) || undefined,
    permissions: (row.permissions as Permissions) || {},
    advances,
    absences,
    payments,
    active: row.active as boolean,
  };
}

function dbToExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    name: row.name as string,
    categoryId: row.category_id as string,
    description: (row.description as string) || undefined,
    amount: row.amount as number,
    date: row.date as string,
  };
}

function dbToExpenseCategory(row: Record<string, unknown>): ExpenseCategory {
  return { id: row.id as string, name: row.name as string };
}

function dbToMaintenance(row: Record<string, unknown>): Maintenance {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    name: row.name as string,
    cost: row.cost as number,
    date: row.date as string,
    description: (row.description as string) || undefined,
  };
}

function dbToCashTransaction(row: Record<string, unknown>): CashTransaction {
  return {
    id: row.id as string,
    type: row.type as CashTransaction['type'],
    amount: row.amount as number,
    description: row.description as string,
    date: row.date as string,
  };
}

function dbToStoreInfo(row: Record<string, unknown>): StoreInfo {
  return {
    name: (row.name as string) || 'Ma Résidence',
    logo: (row.logo_url as string) || null,
    description: (row.description as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || '',
    address: (row.address as string) || '',
    nif: (row.nif as string) || '',
    nis: (row.nis as string) || '',
    article: (row.article as string) || '',
    rc: (row.rc as string) || '',
  };
}

// ─── Status model ──────────────────────────────────────────────────────────
//
// A reservation has a LIFECYCLE status that the user advances manually:
//   pending → active → (paid | debt)
//
//   • pending  — created with a future check-in; must be activated on/after
//                the check-in date (Activer).
//   • active   — stay in progress; must be terminated on/after the check-out
//                date (Terminer), which then resolves to paid or debt.
//   • paid     — terminated and fully settled.
//   • debt     — terminated with a remaining balance (can still be paid off,
//                which flips it back to paid).
//   • cancelled — never changes automatically.
//
// Payment changes must NEVER move a reservation between lifecycle stages —
// e.g. a fully-paid FUTURE reservation stays `pending`, not `paid`.

function paymentsSum(payments: Payment[]): number {
  return payments.reduce((s, p) => s + p.amount, 0);
}

/** Every brand-new reservation starts pending; the user activates it
 *  explicitly once the check-in day arrives. */
function initialStatus(_checkIn: string, _today: string): Reservation['status'] {
  return 'pending';
}

/**
 * Reconcile ONLY the paid/debt distinction for an already-terminated
 * reservation. Lifecycle statuses (pending / active / cancelled) are advanced
 * explicitly by the user and are returned unchanged.
 */
function reconcilePaymentStatus(
  status: Reservation['status'],
  total: number,
  payments: Payment[],
): Reservation['status'] {
  if (status === 'paid' || status === 'debt') {
    return paymentsSum(payments) >= total ? 'paid' : 'debt';
  }
  return status;
}

function nextResCode(reservations: Reservation[]): string {
  const max = reservations.reduce((m, r) => {
    const n = parseInt(r.code.replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `RES-${String(max + 1).padStart(3, '0')}`;
}

function nextCode(list: { code: string }[], prefix: string): string {
  const max = list.reduce((m, r) => {
    const n = parseInt(r.code.replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/** paid/debt reconciliation for sales & purchases (no lifecycle statuses). */
function settleStatus(total: number, payments: Payment[]): 'paid' | 'debt' {
  return paymentsSum(payments) >= total ? 'paid' : 'debt';
}

// ─── State interface ───────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
}

interface AppState extends AppData, AuthState {
  storeInfo: StoreInfo;
  loading: boolean;

  // Internal helpers
  setUser: (user: User | null) => void;
  loadAll: () => Promise<void>;
  loadStoreInfo: () => Promise<void>;

  // Auth
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (p: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateAccount: (patch: Partial<User>) => Promise<void>;
  changePassword: (oldPw: string, newPw: string) => Promise<boolean>;

  // Clients
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Rooms / floors / categories
  addRoom: (r: Omit<Room, 'id' | 'status'>) => Promise<Room | null>;
  updateRoom: (id: string, patch: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  restoreRoom: (id: string) => Promise<void>;
  purgeRoom: (id: string) => Promise<void>;
  setRoomMaintenance: (id: string, note?: string) => Promise<void>;
  endRoomMaintenance: (id: string) => Promise<void>;
  addFloor: (name: string) => Promise<void>;
  deleteFloor: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Services
  addService: (s: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, patch: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  // Reservations
  addReservation: (r: Omit<Reservation, 'id' | 'code' | 'createdAt'>) => Promise<void>;
  updateReservation: (id: string, patch: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  addPayment: (resId: string, amount: number, note?: string) => Promise<void>;

  // Workers
  addWorker: (w: Omit<Worker, 'id' | 'advances' | 'absences' | 'payments'>) => Promise<void>;
  updateWorker: (id: string, patch: Partial<Worker>) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  addWorkerAdvance: (workerId: string, a: Omit<Advance, 'id' | 'deducted'>) => Promise<void>;
  addWorkerAbsence: (workerId: string, a: Omit<Absence, 'id'>) => Promise<void>;
  addWorkerPayment: (
    workerId: string,
    p: Omit<WorkerPayment, 'id'>,
    settle?: { reservationIds?: string[] },
  ) => Promise<void>;
  setWorkerPermissions: (workerId: string, perms: Permissions) => Promise<void>;
  addRole: (name: string) => Promise<void>;

  // Expenses
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseCategory: (name: string) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;

  // Maintenances
  addMaintenance: (m: Omit<Maintenance, 'id'>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  // Cash
  addCashTransaction: (t: Omit<CashTransaction, 'id'>) => Promise<void>;

  // Mediators
  addMediator: (m: Omit<Mediator, 'id' | 'createdAt' | 'payments'>) => Promise<Mediator>;
  updateMediator: (id: string, patch: Partial<Mediator>) => Promise<void>;
  deleteMediator: (id: string) => Promise<void>;
  addMediatorPayment: (mediatorId: string, amount: number, note?: string) => Promise<MediatorPayment | null>;

  // Sales (ventes)
  addSale: (s: Omit<Sale, 'id' | 'code' | 'createdAt'>) => Promise<Sale | null>;
  updateSale: (id: string, patch: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addSalePayment: (saleId: string, amount: number, note?: string) => Promise<Payment | null>;

  // Purchases (achats)
  addPurchase: (p: Omit<Purchase, 'id' | 'code' | 'createdAt'>) => Promise<Purchase | null>;
  updatePurchase: (id: string, patch: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addPurchasePayment: (purchaseId: string, amount: number, note?: string) => Promise<Payment | null>;

  // Settings / data
  updateStoreInfo: (patch: Partial<StoreInfo>) => Promise<void>;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetData: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useApp = create<AppState>()((set, get) => ({
  ...createInitialData(),
  storeInfo: STORE_INFO,
  user: null,
  loading: false,

  setUser: (user) => set({ user }),

  // ── Load all data from Supabase ──────────────────────────────────────────
  loadAll: async () => {
    if (get().loading) return; // prevent concurrent calls
    set({ loading: true });
    try {
      const [
        clientsRes,
        floorsRes,
        categoriesRes,
        roomsRes,
        servicesRes,
        reservationsRes,
        workersRes,
        expensesRes,
        expCatsRes,
        maintenancesRes,
        cashRes,
        mediatorsRes,
        salesRes,
        purchasesRes,
        settingsRes,
      ] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('floors').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('rooms').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
        supabase
          .from('reservations')
          .select('*, reservation_rooms(*), reservation_services(*), payments(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('workers')
          .select('*, worker_advances(*), worker_absences(*), worker_payments(*), profiles(username, email)')
          .order('name'),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('expense_categories').select('*').order('name'),
        supabase.from('maintenances').select('*').order('date', { ascending: false }),
        supabase.from('cash_transactions').select('*').order('date', { ascending: false }),
        supabase.from('mediators').select('*, mediator_payments(*)').order('created_at', { ascending: false }),
        supabase.from('sales').select('*, sale_payments(*)').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*, purchase_payments(*)').order('created_at', { ascending: false }),
        supabase.from('settings').select('*').single(),
      ]);

      // Derive roles from workers
      const workerRows = (workersRes.data ?? []) as Record<string, unknown>[];
      const roles = [...new Set(workerRows.map((w) => w.role as string).filter(Boolean))];

      set({
        clients: ((clientsRes.data ?? []) as Record<string, unknown>[]).map(dbToClient),
        floors: ((floorsRes.data ?? []) as Record<string, unknown>[]).map(dbToFloor),
        categories: ((categoriesRes.data ?? []) as Record<string, unknown>[]).map(dbToCategory),
        rooms: ((roomsRes.data ?? []) as Record<string, unknown>[]).map(dbToRoom),
        services: ((servicesRes.data ?? []) as Record<string, unknown>[]).map(dbToService),
        reservations: ((reservationsRes.data ?? []) as Record<string, unknown>[]).map(
          dbToReservation,
        ),
        workers: workerRows.map(dbToWorker),
        expenses: ((expensesRes.data ?? []) as Record<string, unknown>[]).map(dbToExpense),
        expenseCategories: ((expCatsRes.data ?? []) as Record<string, unknown>[]).map(
          dbToExpenseCategory,
        ),
        maintenances: ((maintenancesRes.data ?? []) as Record<string, unknown>[]).map(
          dbToMaintenance,
        ),
        cashTransactions: ((cashRes.data ?? []) as Record<string, unknown>[]).map(
          dbToCashTransaction,
        ),
        mediators: ((mediatorsRes.data ?? []) as Record<string, unknown>[]).map(dbToMediator),
        sales: ((salesRes.data ?? []) as Record<string, unknown>[]).map(dbToSale),
        purchases: ((purchasesRes.data ?? []) as Record<string, unknown>[]).map(dbToPurchase),
        roles,
        storeInfo: settingsRes.data
          ? dbToStoreInfo(settingsRes.data as Record<string, unknown>)
          : STORE_INFO,
        loading: false,
      });
    } catch (e) {
      console.error('loadAll error:', e);
      set({ loading: false });
    }
  },

  // Loads only the residence identity (name/logo/etc.) — used on the login
  // screen before authentication. Requires the `settings` table to be readable
  // by the anon role (see the public-read policy in the SQL).
  loadStoreInfo: async () => {
    const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    if (data) set({ storeInfo: dbToStoreInfo(data as Record<string, unknown>) });
  },

  // ── AUTH ─────────────────────────────────────────────────────────────────

  login: async (identifier, password) => {
    const id = identifier.trim().toLowerCase();
    let email = id;

    // If no @ sign, look up profile by username to find email
    if (!id.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', id)
        .single();
      if (!profile?.email) return false;
      email = profile.email as string;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Load all data before setting user (ensures data is ready when UI renders)
    await get().loadAll();

    const role = (profile?.role as User['role']) ?? 'worker';
    let workerId = (profile?.worker_id as string) ?? undefined;
    let permissions: Permissions | undefined;
    if (role === 'worker') {
      const wc = await fetchWorkerPermissions(data.user.id);
      workerId = wc.workerId ?? workerId;
      permissions = wc.permissions;
    }

    set({
      user: {
        id: data.user.id,
        name: (profile?.name as string) ?? data.user.email ?? '',
        username: (profile?.username as string) ?? '',
        email: data.user.email ?? '',
        password: '',
        role,
        avatar: (profile?.avatar_url as string) ?? null,
        workerId,
        permissions,
      },
    });

    return true;
  },

  signup: async ({ firstName, lastName, email, username, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'admin', name: `${firstName} ${lastName}`, username },
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Échec de la création du compte' };

    // Upsert profile so email is stored for username-based login
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name: `${firstName} ${lastName}`,
      username,
      email,
      role: 'admin',
      avatar_url: null,
    });

    await get().loadAll();

    set({
      user: {
        id: data.user.id,
        name: `${firstName} ${lastName}`,
        username,
        email,
        password: '',
        role: 'admin',
        avatar: null,
      },
    });

    return { ok: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    // Keep storeInfo (the residence's public identity) so the login screen
    // still shows the real name/logo after logout without needing a refresh.
    set({ user: null, ...createInitialData() });
  },

  updateAccount: async (patch) => {
    const u = get().user;
    if (!u) return;

    const profilePatch: Record<string, unknown> = {};
    if (patch.name !== undefined) profilePatch.name = patch.name;
    if (patch.username !== undefined) profilePatch.username = patch.username;
    if (patch.avatar !== undefined) profilePatch.avatar_url = patch.avatar;
    if (patch.email !== undefined) profilePatch.email = patch.email;

    if (Object.keys(profilePatch).length > 0) {
      await supabase.from('profiles').update(profilePatch).eq('id', u.id);
    }

    if (patch.email && patch.email !== u.email) {
      await supabase.auth.updateUser({ email: patch.email });
    }

    set((s) => ({ user: s.user ? { ...s.user, ...patch } : null }));
  },

  changePassword: async (oldPw, newPw) => {
    const u = get().user;
    if (!u) return false;
    // Verify old password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: u.email,
      password: oldPw,
    });
    if (verifyError) return false;
    const { error } = await supabase.auth.updateUser({ password: newPw });
    return !error;
  },

  // ── CLIENTS ──────────────────────────────────────────────────────────────

  addClient: async (c) => {
    const today = todayISO();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        first_name: c.firstName,
        last_name: c.lastName,
        birth_date: c.birthDate || null,
        birth_place: c.birthPlace || null,
        sexe: c.sexe || null,
        profession: c.profession || null,
        address: c.address || null,
        city: c.city || null,
        phone: c.phone,
        phone2: c.phone2 || null,
        email: c.email || null,
        document_type: c.documentType || null,
        document_number: c.documentNumber || null,
        document_issue_date: c.documentIssueDate || null,
        document_expiry_date: c.documentExpiryDate || null,
        document_issue_place: c.documentIssuePlace || null,
        photo_urls: c.photos ?? [],
        created_at: today,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add client');

    const client: Client = {
      ...c,
      id: (data as Record<string, unknown>).id as string,
      createdAt: today,
      photos: c.photos ?? [],
    };
    set((s) => ({ clients: [client, ...s.clients] }));
    return client;
  },

  updateClient: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.firstName !== undefined) dbPatch.first_name = patch.firstName;
    if (patch.lastName !== undefined) dbPatch.last_name = patch.lastName;
    if (patch.birthDate !== undefined) dbPatch.birth_date = patch.birthDate || null;
    if (patch.birthPlace !== undefined) dbPatch.birth_place = patch.birthPlace || null;
    if (patch.sexe !== undefined) dbPatch.sexe = patch.sexe || null;
    if (patch.profession !== undefined) dbPatch.profession = patch.profession || null;
    if (patch.address !== undefined) dbPatch.address = patch.address || null;
    if (patch.city !== undefined) dbPatch.city = patch.city || null;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.phone2 !== undefined) dbPatch.phone2 = patch.phone2 || null;
    if (patch.email !== undefined) dbPatch.email = patch.email || null;
    if (patch.documentType !== undefined) dbPatch.document_type = patch.documentType || null;
    if (patch.documentNumber !== undefined) dbPatch.document_number = patch.documentNumber || null;
    if (patch.documentIssueDate !== undefined) dbPatch.document_issue_date = patch.documentIssueDate || null;
    if (patch.documentExpiryDate !== undefined) dbPatch.document_expiry_date = patch.documentExpiryDate || null;
    if (patch.documentIssuePlace !== undefined) dbPatch.document_issue_place = patch.documentIssuePlace || null;
    if (patch.photos !== undefined) dbPatch.photo_urls = patch.photos;

    await supabase.from('clients').update(dbPatch).eq('id', id);
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  },

  deleteClient: async (id) => {
    await supabase.from('clients').delete().eq('id', id);
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
  },

  // ── ROOMS / FLOORS / CATEGORIES ──────────────────────────────────────────

  addRoom: async (r) => {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: r.name,
        capacity: r.capacity,
        floor_id: r.floorId || null,
        category_id: r.categoryId || null,
        price_per_night: r.pricePerNight,
        status: 'available',
        maintenance_note: r.maintenanceNote || null,
        commune: r.commune || null,
        description: r.description || null,
        rental_period: r.rentalPeriod || 'day',
        furnished: r.furnished ?? false,
        furniture_description: r.furnitureDescription || null,
        property_type: r.propertyType || 'rental',
        owner_client_id: r.ownerClientId || null,
        owner_name: r.ownerName || null,
        owner_phone: r.ownerPhone || null,
        owner_phone2: r.ownerPhone2 || null,
        owner_email: r.ownerEmail || null,
        owner_address: r.ownerAddress || null,
        owner_city: r.ownerCity || null,
        owner_profession: r.ownerProfession || null,
        owner_document_type: r.ownerDocumentType || null,
        owner_document_number: r.ownerDocumentNumber || null,
        mediator_id: r.mediatorId || null,
        sale_price: r.salePrice ?? null,
        purchase_price: r.purchasePrice ?? null,
        photo_urls: r.photos ?? [],
      })
      .select()
      .single();
    if (error || !data) {
      console.error('addRoom failed:', error);
      return null;
    }
    const room: Room = {
      ...r,
      id: (data as Record<string, unknown>).id as string,
      status: 'available',
    };
    set((s) => ({ rooms: [...s.rooms, room] }));
    return room;
  },

  updateRoom: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.capacity !== undefined) dbPatch.capacity = patch.capacity;
    if (patch.floorId !== undefined) dbPatch.floor_id = patch.floorId || null;
    if (patch.categoryId !== undefined) dbPatch.category_id = patch.categoryId || null;
    if (patch.pricePerNight !== undefined) dbPatch.price_per_night = patch.pricePerNight;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.maintenanceNote !== undefined) dbPatch.maintenance_note = patch.maintenanceNote || null;
    if (patch.commune !== undefined) dbPatch.commune = patch.commune || null;
    if (patch.description !== undefined) dbPatch.description = patch.description || null;
    if (patch.rentalPeriod !== undefined) dbPatch.rental_period = patch.rentalPeriod;
    if (patch.furnished !== undefined) dbPatch.furnished = patch.furnished;
    if (patch.furnitureDescription !== undefined) dbPatch.furniture_description = patch.furnitureDescription || null;
    if (patch.propertyType !== undefined) dbPatch.property_type = patch.propertyType;
    if (patch.ownerClientId !== undefined) dbPatch.owner_client_id = patch.ownerClientId || null;
    if (patch.ownerName !== undefined) dbPatch.owner_name = patch.ownerName || null;
    if (patch.ownerPhone !== undefined) dbPatch.owner_phone = patch.ownerPhone || null;
    if (patch.ownerPhone2 !== undefined) dbPatch.owner_phone2 = patch.ownerPhone2 || null;
    if (patch.ownerEmail !== undefined) dbPatch.owner_email = patch.ownerEmail || null;
    if (patch.ownerAddress !== undefined) dbPatch.owner_address = patch.ownerAddress || null;
    if (patch.ownerCity !== undefined) dbPatch.owner_city = patch.ownerCity || null;
    if (patch.ownerProfession !== undefined) dbPatch.owner_profession = patch.ownerProfession || null;
    if (patch.ownerDocumentType !== undefined) dbPatch.owner_document_type = patch.ownerDocumentType || null;
    if (patch.ownerDocumentNumber !== undefined) dbPatch.owner_document_number = patch.ownerDocumentNumber || null;
    if (patch.mediatorId !== undefined) dbPatch.mediator_id = patch.mediatorId || null;
    if (patch.salePrice !== undefined) dbPatch.sale_price = patch.salePrice ?? null;
    if (patch.purchasePrice !== undefined) dbPatch.purchase_price = patch.purchasePrice ?? null;
    if (patch.photos !== undefined) dbPatch.photo_urls = patch.photos ?? [];
    if (patch.deleted !== undefined) dbPatch.deleted = patch.deleted;
    if (patch.deletedAt !== undefined) dbPatch.deleted_at = patch.deletedAt || null;
    await supabase.from('rooms').update(dbPatch).eq('id', id);
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  },

  // Soft delete: the apartment is kept in the database as a draft (corbeille)
  // so it can be restored, and so reservations/sales still resolve its name.
  deleteRoom: async (id) => {
    const deletedAt = new Date().toISOString();
    const { error } = await supabase
      .from('rooms')
      .update({ deleted: true, deleted_at: deletedAt })
      .eq('id', id);
    if (error) {
      console.error('deleteRoom (soft) failed:', error);
      return;
    }
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === id ? { ...r, deleted: true, deletedAt } : r)),
    }));
  },

  restoreRoom: async (id) => {
    const { error } = await supabase
      .from('rooms')
      .update({ deleted: false, deleted_at: null })
      .eq('id', id);
    if (error) {
      console.error('restoreRoom failed:', error);
      return;
    }
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === id ? { ...r, deleted: false, deletedAt: undefined } : r)),
    }));
  },

  // Definitive removal — only reachable from the corbeille.
  purgeRoom: async (id) => {
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) {
      console.error('purgeRoom failed:', error);
      throw error;
    }
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) }));
  },

  setRoomMaintenance: async (id, note) => {
    await supabase
      .from('rooms')
      .update({ status: 'maintenance', maintenance_note: note || null })
      .eq('id', id);
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === id ? { ...r, status: 'maintenance', maintenanceNote: note } : r,
      ),
    }));
  },

  endRoomMaintenance: async (id) => {
    await supabase
      .from('rooms')
      .update({ status: 'available', maintenance_note: null })
      .eq('id', id);
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === id ? { ...r, status: 'available', maintenanceNote: undefined } : r,
      ),
    }));
  },

  addFloor: async (name) => {
    const { data, error } = await supabase.from('floors').insert({ name }).select().single();
    if (error || !data) return;
    set((s) => ({
      floors: [...s.floors, { id: (data as Record<string, unknown>).id as string, name }],
    }));
  },

  deleteFloor: async (id) => {
    // Delete rooms on this floor first
    await supabase.from('rooms').delete().eq('floor_id', id);
    await supabase.from('floors').delete().eq('id', id);
    set((s) => ({
      floors: s.floors.filter((f) => f.id !== id),
      rooms: s.rooms.filter((r) => r.floorId !== id),
    }));
  },

  addCategory: async (name) => {
    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (error || !data) return;
    set((s) => ({
      categories: [...s.categories, { id: (data as Record<string, unknown>).id as string, name }],
    }));
  },

  deleteCategory: async (id) => {
    await supabase.from('categories').delete().eq('id', id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  // ── SERVICES ─────────────────────────────────────────────────────────────

  addService: async (svc) => {
    const { data, error } = await supabase
      .from('services')
      .insert({ name: svc.name, description: svc.description || null, price: svc.price })
      .select()
      .single();
    if (error || !data) return;
    set((s) => ({
      services: [
        ...s.services,
        { ...svc, id: (data as Record<string, unknown>).id as string },
      ],
    }));
  },

  updateService: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.description !== undefined) dbPatch.description = patch.description || null;
    if (patch.price !== undefined) dbPatch.price = patch.price;
    await supabase.from('services').update(dbPatch).eq('id', id);
    set((s) => ({ services: s.services.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  },

  deleteService: async (id) => {
    await supabase.from('services').delete().eq('id', id);
    set((s) => ({ services: s.services.filter((x) => x.id !== id) }));
  },

  // ── RESERVATIONS ─────────────────────────────────────────────────────────

  addReservation: async (r) => {
    const code = nextResCode(get().reservations);
    const today = todayISO();

    // Lifecycle status comes from the wizard (date-based); fall back defensively.
    const status: Reservation['status'] = r.status ?? initialStatus(r.checkIn, today);

    const { data: resData, error } = await supabase
      .from('reservations')
      .insert({
        code,
        client_id: r.clientId,
        check_in: r.checkIn,
        check_out: r.checkOut,
        check_in_time: r.checkInTime,
        check_out_time: r.checkOutTime,
        nights: r.nights,
        total: r.total,
        status,
        notes: r.notes || null,
        created_at: today,
        agency_fee: r.agencyFee ?? 0,
        agency_fee_worker_id: r.agencyFeeCommissionEnabled ? r.agencyFeeWorkerId || null : null,
        agency_fee_percent: r.agencyFeeCommissionEnabled ? r.agencyFeePercent ?? null : null,
        agency_fee_commission: r.agencyFeeCommissionEnabled ? r.agencyFeeCommission ?? 0 : 0,
        agency_fee_commission_settled: false,
      })
      .select()
      .single();

    if (error || !resData) return;
    const resId = (resData as Record<string, unknown>).id as string;

    if (r.rooms.length > 0) {
      await supabase.from('reservation_rooms').insert(
        r.rooms.map((room) => ({
          reservation_id: resId,
          room_id: room.roomId,
          price_per_night: room.pricePerNight,
        })),
      );
    }

    if (r.services.length > 0) {
      await supabase.from('reservation_services').insert(
        r.services.map((svc) => ({
          reservation_id: resId,
          service_id: svc.serviceId,
          quantity: svc.quantity,
          unit_price: svc.unitPrice,
        })),
      );
    }

    let payments: Payment[] = [];
    if (r.payments.length > 0) {
      const { data: payData } = await supabase
        .from('payments')
        .insert(
          r.payments.map((p) => ({
            reservation_id: resId,
            amount: p.amount,
            date: p.date,
            note: p.note || null,
          })),
        )
        .select();
      if (payData) {
        payments = (payData as Record<string, unknown>[]).map((p) => ({
          id: p.id as string,
          amount: p.amount as number,
          date: p.date as string,
          note: (p.note as string) || undefined,
        }));
      }
    }

    const newRes: Reservation = {
      id: resId,
      code,
      clientId: r.clientId,
      rooms: r.rooms,
      services: r.services,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      nights: r.nights,
      total: r.total,
      payments,
      status,
      createdAt: today,
      notes: r.notes || undefined,
      agencyFee: r.agencyFee ?? 0,
      agencyFeeCommissionEnabled: !!r.agencyFeeCommissionEnabled && !!r.agencyFeeWorkerId,
      agencyFeeWorkerId: r.agencyFeeCommissionEnabled ? r.agencyFeeWorkerId : undefined,
      agencyFeePercent: r.agencyFeeCommissionEnabled ? r.agencyFeePercent : undefined,
      agencyFeeCommission: r.agencyFeeCommissionEnabled ? r.agencyFeeCommission ?? 0 : 0,
      agencyFeeCommissionSettled: false,
    };

    set((s) => ({ reservations: [newRes, ...s.reservations] }));
  },

  updateReservation: async (id, patch) => {
    const current = get().reservations.find((r) => r.id === id);

    const dbPatch: Record<string, unknown> = {};
    if (patch.clientId !== undefined) dbPatch.client_id = patch.clientId;
    if (patch.checkIn !== undefined) dbPatch.check_in = patch.checkIn;
    if (patch.checkOut !== undefined) dbPatch.check_out = patch.checkOut;
    if (patch.checkInTime !== undefined) dbPatch.check_in_time = patch.checkInTime;
    if (patch.checkOutTime !== undefined) dbPatch.check_out_time = patch.checkOutTime;
    if (patch.nights !== undefined) dbPatch.nights = patch.nights;
    if (patch.total !== undefined) dbPatch.total = patch.total;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes || null;
    if (patch.agencyFee !== undefined) dbPatch.agency_fee = patch.agencyFee ?? 0;
    if (patch.agencyFeeCommissionEnabled !== undefined || patch.agencyFeeWorkerId !== undefined) {
      const enabled = patch.agencyFeeCommissionEnabled ?? current?.agencyFeeCommissionEnabled ?? false;
      const workerId = patch.agencyFeeWorkerId ?? current?.agencyFeeWorkerId;
      dbPatch.agency_fee_worker_id = enabled && workerId ? workerId : null;
    }
    if (patch.agencyFeePercent !== undefined) dbPatch.agency_fee_percent = patch.agencyFeePercent ?? null;
    if (patch.agencyFeeCommission !== undefined) dbPatch.agency_fee_commission = patch.agencyFeeCommission ?? 0;

    // Resolve the status that must be persisted: an explicit transition wins;
    // otherwise reconcile paid/debt from the (possibly updated) payments/total.
    const effectiveTotal = patch.total ?? current?.total ?? 0;
    const effectivePayments = patch.payments ?? current?.payments ?? [];
    const finalStatus =
      patch.status ??
      (current ? reconcilePaymentStatus(current.status, effectiveTotal, effectivePayments) : undefined);
    if (finalStatus !== undefined && finalStatus !== current?.status) {
      dbPatch.status = finalStatus;
    }

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('reservations').update(dbPatch).eq('id', id);
    }

    if (patch.rooms !== undefined) {
      await supabase.from('reservation_rooms').delete().eq('reservation_id', id);
      if (patch.rooms.length > 0) {
        await supabase.from('reservation_rooms').insert(
          patch.rooms.map((r) => ({
            reservation_id: id,
            room_id: r.roomId,
            price_per_night: r.pricePerNight,
          })),
        );
      }
    }

    if (patch.services !== undefined) {
      await supabase.from('reservation_services').delete().eq('reservation_id', id);
      if (patch.services.length > 0) {
        await supabase.from('reservation_services').insert(
          patch.services.map((s) => ({
            reservation_id: id,
            service_id: s.serviceId,
            quantity: s.quantity,
            unit_price: s.unitPrice,
          })),
        );
      }
    }

    // Full sync of the payment set: wipe the old rows and re-insert the list in
    // the patch, so `patch.payments` is authoritative. The previous insert-only
    // path could only ever ADD money (an edit that lowered the paid amount was
    // silently dropped) and could duplicate a row on a repeated edit.
    let syncedPayments: Payment[] | undefined;
    if (patch.payments !== undefined) {
      await supabase.from('payments').delete().eq('reservation_id', id);
      if (patch.payments.length > 0) {
        const { data: payData } = await supabase
          .from('payments')
          .insert(
            patch.payments.map((p) => ({
              reservation_id: id,
              amount: p.amount,
              date: p.date,
              note: p.note || null,
            })),
          )
          .select();
        syncedPayments = payData
          ? (payData as Record<string, unknown>[]).map((p) => ({
              id: p.id as string,
              amount: p.amount as number,
              date: p.date as string,
              note: (p.note as string) || undefined,
            }))
          : patch.payments;
      } else {
        syncedPayments = [];
      }
    }

    set((s) => ({
      reservations: s.reservations.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        // Use the rows we just persisted (with their real DB ids) as the source
        // of truth for the payment list.
        if (syncedPayments !== undefined) merged.payments = syncedPayments;
        // An explicit status in the patch is a manual transition (Activer /
        // Terminer) and wins. Otherwise only the paid/debt split is reconciled.
        merged.status =
          patch.status ?? reconcilePaymentStatus(merged.status, merged.total, merged.payments);
        return merged;
      }),
    }));
  },

  deleteReservation: async (id) => {
    await supabase.from('reservations').delete().eq('id', id);
    set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) }));
  },

  addPayment: async (resId, amount, note) => {
    const { data: payData } = await supabase
      .from('payments')
      .insert({
        reservation_id: resId,
        amount,
        date: todayISO(),
        note: note || null,
      })
      .select()
      .single();

    if (!payData) return;
    const payment: Payment = {
      id: (payData as Record<string, unknown>).id as string,
      amount: (payData as Record<string, unknown>).amount as number,
      date: (payData as Record<string, unknown>).date as string,
      note: ((payData as Record<string, unknown>).note as string) || undefined,
    };

    // Paying off a debt flips it to paid; a pending/active stay keeps its
    // lifecycle status (an early payment never auto-activates/terminates).
    // Persist the flip so it survives a refresh.
    const current = get().reservations.find((r) => r.id === resId);
    if (current) {
      const payments = [...current.payments, payment];
      const status = reconcilePaymentStatus(current.status, current.total, payments);
      if (status !== current.status) {
        await supabase.from('reservations').update({ status }).eq('id', resId);
      }
      set((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === resId ? { ...r, payments, status } : r,
        ),
      }));
    }
  },

  // ── WORKERS ──────────────────────────────────────────────────────────────

  addWorker: async (w) => {
    const { data, error } = await supabase
      .from('workers')
      .insert({
        name: w.name,
        birth_date: w.birthDate || null,
        cin: w.cin || null,
        phone: w.phone,
        role: w.role,
        start_date: w.startDate,
        has_salary: w.hasSalary,
        salary_type: w.salaryType || null,
        salary_amount: w.salaryAmount || null,
        has_account: w.hasAccount,
        permissions: w.permissions || {},
        active: w.active ?? true,
      })
      .select()
      .single();

    if (error || !data) return;
    const newId = (data as Record<string, unknown>).id as string;

    // Create Supabase Auth account for the worker via signUp.
    // Ideal solution is a server-side Edge Function, but signUp works for
    // internal deployments where email confirmation is disabled in Supabase Auth settings.
    if (w.hasAccount && w.account && w.account.email && w.account.password) {
      // signUp() replaces the ACTIVE session with the newly-created worker's
      // session. Capture the admin's session first so we can restore it after,
      // otherwise creating a worker silently logs the admin out (and back in as
      // the worker). Restored in the `finally` below regardless of outcome.
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: w.account.email,
          password: w.account.password,
          options: {
            data: {
              name: w.name,
              role: 'worker',
              username: w.account.username,
              worker_id: newId, // so a handle_new_user trigger can link it directly
            },
          },
        });

        if (signUpError) {
          console.error('Error creating worker auth account:', signUpError);
        } else if (signUpData.user) {
          // A `handle_new_user` trigger may already have created this profile row,
          // so UPSERT (not INSERT) to avoid a 409 conflict and make sure worker_id
          // is written onto the existing row.
          const { error: profileError } = await supabase.from('profiles').upsert(
            {
              id: signUpData.user.id,
              role: 'worker',
              name: w.name,
              username: w.account.username,
              email: w.account.email,
              worker_id: newId,
            },
            { onConflict: 'id' },
          );
          if (profileError) console.error('Worker profile upsert failed:', profileError);
          // auth_user_id is the reliable link the app matches permissions on.
          const { error: linkError } = await supabase
            .from('workers')
            .update({ auth_user_id: signUpData.user.id })
            .eq('id', newId);
          if (linkError) console.error('Worker auth_user_id link failed:', linkError);
        }
      } finally {
        // Put the admin back — keeps them logged in after creating the worker.
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }
      }
    }

    const worker: Worker = {
      id: newId,
      name: w.name,
      birthDate: w.birthDate,
      cin: w.cin,
      phone: w.phone,
      role: w.role,
      startDate: w.startDate,
      hasSalary: w.hasSalary,
      salaryType: w.salaryType,
      salaryAmount: w.salaryAmount,
      hasAccount: w.hasAccount,
      account: w.hasAccount && w.account
        ? { email: w.account.email, username: w.account.username, password: '' }
        : undefined,
      permissions: w.permissions || {},
      advances: [],
      absences: [],
      payments: [],
      active: w.active ?? true,
    };

    // Add role to local list if not present
    if (!get().roles.includes(w.role)) {
      set((s) => ({ roles: [...s.roles, w.role] }));
    }
    set((s) => ({ workers: [...s.workers, worker] }));
  },

  updateWorker: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.birthDate !== undefined) dbPatch.birth_date = patch.birthDate || null;
    if (patch.cin !== undefined) dbPatch.cin = patch.cin || null;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.role !== undefined) dbPatch.role = patch.role;
    if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
    if (patch.hasSalary !== undefined) dbPatch.has_salary = patch.hasSalary;
    if (patch.salaryType !== undefined) dbPatch.salary_type = patch.salaryType || null;
    if (patch.salaryAmount !== undefined) dbPatch.salary_amount = patch.salaryAmount || null;
    if (patch.hasAccount !== undefined) dbPatch.has_account = patch.hasAccount;
    if (patch.active !== undefined) dbPatch.active = patch.active;

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('workers').update(dbPatch).eq('id', id);
    }

    if (patch.role && !get().roles.includes(patch.role)) {
      set((s) => ({ roles: [...s.roles, patch.role as string] }));
    }
    set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  },

  deleteWorker: async (id) => {
    await supabase.from('workers').delete().eq('id', id);
    set((s) => ({ workers: s.workers.filter((w) => w.id !== id) }));
  },

  addWorkerAdvance: async (workerId, a) => {
    const { data } = await supabase
      .from('worker_advances')
      .insert({
        worker_id: workerId,
        date: a.date,
        description: a.description || null,
        amount: a.amount,
        deducted: false,
      })
      .select()
      .single();
    if (!data) return;
    const advance: Advance = {
      id: (data as Record<string, unknown>).id as string,
      date: a.date,
      description: a.description,
      amount: a.amount,
      deducted: false,
    };
    set((s) => ({
      workers: s.workers.map((w) =>
        w.id === workerId ? { ...w, advances: [...w.advances, advance] } : w,
      ),
    }));
  },

  addWorkerAbsence: async (workerId, a) => {
    const { data } = await supabase
      .from('worker_absences')
      .insert({
        worker_id: workerId,
        date: a.date,
        description: a.description || null,
        cost: a.cost,
      })
      .select()
      .single();
    if (!data) return;
    const absence: Absence = {
      id: (data as Record<string, unknown>).id as string,
      date: a.date,
      description: a.description,
      cost: a.cost,
    };
    set((s) => ({
      workers: s.workers.map((w) =>
        w.id === workerId ? { ...w, absences: [...w.absences, absence] } : w,
      ),
    }));
  },

  // A payment closes the current pay period: every pending advance, absence and
  // agency-fee commission it absorbed is stamped with the payment id, so it
  // never shows up in the NEXT payment and appears in the payment history.
  addWorkerPayment: async (workerId, p, settle) => {
    const { data, error } = await supabase
      .from('worker_payments')
      .insert({
        worker_id: workerId,
        date: p.date,
        amount: p.amount,
        description: p.description || null,
        gross: p.gross ?? null,
        commissions_total: p.commissionsTotal ?? null,
        absences_total: p.absencesTotal ?? null,
        advances_total: p.advancesTotal ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      console.error('addWorkerPayment failed:', error);
      return;
    }
    const paymentId = (data as Record<string, unknown>).id as string;

    // Mark all pending advances / absences as deducted by this payment.
    await supabase
      .from('worker_advances')
      .update({ deducted: true, worker_payment_id: paymentId })
      .eq('worker_id', workerId)
      .eq('deducted', false);
    await supabase
      .from('worker_absences')
      .update({ deducted: true, worker_payment_id: paymentId })
      .eq('worker_id', workerId)
      .eq('deducted', false);

    // Settle the agency-fee commissions that were part of this payment.
    const settledResIds = settle?.reservationIds ?? [];
    if (settledResIds.length > 0) {
      await supabase
        .from('reservations')
        .update({
          agency_fee_commission_settled: true,
          agency_fee_commission_payment_id: paymentId,
        })
        .in('id', settledResIds);
    }

    const payment: WorkerPayment = {
      id: paymentId,
      date: p.date,
      amount: p.amount,
      description: p.description,
      gross: p.gross,
      commissionsTotal: p.commissionsTotal,
      absencesTotal: p.absencesTotal,
      advancesTotal: p.advancesTotal,
    };
    set((s) => ({
      workers: s.workers.map((w) =>
        w.id === workerId
          ? {
              ...w,
              payments: [...w.payments, payment],
              advances: w.advances.map((adv) =>
                adv.deducted ? adv : { ...adv, deducted: true, workerPaymentId: paymentId },
              ),
              absences: w.absences.map((abs) =>
                abs.deducted ? abs : { ...abs, deducted: true, workerPaymentId: paymentId },
              ),
            }
          : w,
      ),
      reservations: s.reservations.map((r) =>
        settledResIds.includes(r.id)
          ? { ...r, agencyFeeCommissionSettled: true, agencyFeeCommissionPaymentId: paymentId }
          : r,
      ),
    }));
  },

  setWorkerPermissions: async (workerId, perms) => {
    const { error } = await supabase.from('workers').update({ permissions: perms }).eq('id', workerId);
    if (error) {
      // Surface a blocked write (e.g. missing RLS UPDATE policy) instead of
      // silently updating only local state — otherwise the admin thinks it saved.
      console.error('setWorkerPermissions failed:', error);
      throw error;
    }
    set((s) => ({
      workers: s.workers.map((w) => (w.id === workerId ? { ...w, permissions: perms } : w)),
    }));
  },

  addRole: async (name) => {
    if (get().roles.includes(name)) return;
    set((s) => ({ roles: [...s.roles, name] }));
  },

  // ── EXPENSES ─────────────────────────────────────────────────────────────

  addExpense: async (e) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        name: e.name,
        category_id: e.categoryId,
        description: e.description || null,
        amount: e.amount,
        date: e.date,
      })
      .select()
      .single();
    if (error || !data) return;
    const expense: Expense = {
      ...e,
      id: (data as Record<string, unknown>).id as string,
    };
    set((s) => ({ expenses: [expense, ...s.expenses] }));
  },

  updateExpense: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.categoryId !== undefined) dbPatch.category_id = patch.categoryId;
    if (patch.description !== undefined) dbPatch.description = patch.description || null;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    await supabase.from('expenses').update(dbPatch).eq('id', id);
    set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  },

  deleteExpense: async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) }));
  },

  addExpenseCategory: async (name) => {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name })
      .select()
      .single();
    if (error || !data) return;
    set((s) => ({
      expenseCategories: [
        ...s.expenseCategories,
        { id: (data as Record<string, unknown>).id as string, name },
      ],
    }));
  },

  deleteExpenseCategory: async (id) => {
    await supabase.from('expense_categories').delete().eq('id', id);
    set((s) => ({ expenseCategories: s.expenseCategories.filter((c) => c.id !== id) }));
  },

  // ── MAINTENANCES ─────────────────────────────────────────────────────────

  addMaintenance: async (m) => {
    const { data, error } = await supabase
      .from('maintenances')
      .insert({
        room_id: m.roomId,
        name: m.name,
        cost: m.cost,
        date: m.date,
        description: m.description || null,
      })
      .select()
      .single();
    if (error || !data) return;
    const maintenance: Maintenance = {
      ...m,
      id: (data as Record<string, unknown>).id as string,
    };
    set((s) => ({ maintenances: [maintenance, ...s.maintenances] }));
  },

  deleteMaintenance: async (id) => {
    await supabase.from('maintenances').delete().eq('id', id);
    set((s) => ({ maintenances: s.maintenances.filter((m) => m.id !== id) }));
  },

  // ── CASH ─────────────────────────────────────────────────────────────────

  addCashTransaction: async (t) => {
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert({
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date,
      })
      .select()
      .single();
    if (error || !data) return;
    const tx: CashTransaction = {
      ...t,
      id: (data as Record<string, unknown>).id as string,
    };
    set((s) => ({ cashTransactions: [tx, ...s.cashTransactions] }));
  },

  // ── MEDIATORS ────────────────────────────────────────────────────────────

  addMediator: async (m) => {
    const today = todayISO();
    const { data, error } = await supabase
      .from('mediators')
      .insert({
        first_name: m.firstName,
        last_name: m.lastName,
        phone: m.phone,
        phone2: m.phone2 || null,
        email: m.email || null,
        address: m.address || null,
        city: m.city || null,
        cin: m.cin || null,
        notes: m.notes || null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to add mediator');
    const mediator: Mediator = {
      ...m,
      id: (data as Record<string, unknown>).id as string,
      payments: [],
      createdAt: today,
    };
    set((s) => ({ mediators: [mediator, ...s.mediators] }));
    return mediator;
  },

  updateMediator: async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.firstName !== undefined) dbPatch.first_name = patch.firstName;
    if (patch.lastName !== undefined) dbPatch.last_name = patch.lastName;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.phone2 !== undefined) dbPatch.phone2 = patch.phone2 || null;
    if (patch.email !== undefined) dbPatch.email = patch.email || null;
    if (patch.address !== undefined) dbPatch.address = patch.address || null;
    if (patch.city !== undefined) dbPatch.city = patch.city || null;
    if (patch.cin !== undefined) dbPatch.cin = patch.cin || null;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes || null;
    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('mediators').update(dbPatch).eq('id', id);
    }
    set((s) => ({ mediators: s.mediators.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },

  deleteMediator: async (id) => {
    await supabase.from('mediators').delete().eq('id', id);
    set((s) => ({ mediators: s.mediators.filter((m) => m.id !== id) }));
  },

  addMediatorPayment: async (mediatorId, amount, note) => {
    const { data } = await supabase
      .from('mediator_payments')
      .insert({ mediator_id: mediatorId, amount, date: todayISO(), note: note || null })
      .select()
      .single();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const payment: MediatorPayment = {
      id: row.id as string,
      amount: row.amount as number,
      date: row.date as string,
      note: (row.note as string) || undefined,
    };
    set((s) => ({
      mediators: s.mediators.map((m) =>
        m.id === mediatorId ? { ...m, payments: [...m.payments, payment] } : m,
      ),
    }));
    return payment;
  },

  // ── SALES (VENTES) ───────────────────────────────────────────────────────

  addSale: async (sale) => {
    const code = nextCode(get().sales, 'VEN');
    const today = todayISO();
    const status = settleStatus(sale.price, sale.payments);

    const { data, error } = await supabase
      .from('sales')
      .insert({
        code,
        room_id: sale.roomId || null,
        client_id: sale.clientId,
        mediator_id: sale.mediatorId || null,
        commission_type: sale.commissionType,
        commission_percent: sale.commissionPercent ?? null,
        mediator_commission: sale.mediatorCommission,
        price: sale.price,
        date: sale.date,
        time: sale.time,
        status,
        notes: sale.notes || null,
      })
      .select()
      .single();
    if (error || !data) {
      console.error('addSale failed:', error);
      return null;
    }
    const saleId = (data as Record<string, unknown>).id as string;

    let payments: Payment[] = [];
    if (sale.payments.length > 0) {
      const { data: payData } = await supabase
        .from('sale_payments')
        .insert(
          sale.payments.map((p) => ({
            sale_id: saleId,
            amount: p.amount,
            date: p.date,
            note: p.note || null,
          })),
        )
        .select();
      if (payData) payments = (payData as Record<string, unknown>[]).map(dbToPaymentRow);
    }

    const newSale: Sale = { ...sale, id: saleId, code, payments, status, createdAt: today };
    set((s) => ({ sales: [newSale, ...s.sales] }));
    return newSale;
  },

  updateSale: async (id, patch) => {
    const current = get().sales.find((x) => x.id === id);

    const dbPatch: Record<string, unknown> = {};
    if (patch.roomId !== undefined) dbPatch.room_id = patch.roomId || null;
    if (patch.clientId !== undefined) dbPatch.client_id = patch.clientId;
    if (patch.mediatorId !== undefined) dbPatch.mediator_id = patch.mediatorId || null;
    if (patch.commissionType !== undefined) dbPatch.commission_type = patch.commissionType;
    if (patch.commissionPercent !== undefined) dbPatch.commission_percent = patch.commissionPercent ?? null;
    if (patch.mediatorCommission !== undefined) dbPatch.mediator_commission = patch.mediatorCommission;
    if (patch.price !== undefined) dbPatch.price = patch.price;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    if (patch.time !== undefined) dbPatch.time = patch.time;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes || null;

    // Full sync of the payment set when the patch carries one (same rationale
    // as reservations: the list in the patch is authoritative).
    let syncedPayments: Payment[] | undefined;
    if (patch.payments !== undefined) {
      await supabase.from('sale_payments').delete().eq('sale_id', id);
      if (patch.payments.length > 0) {
        const { data: payData } = await supabase
          .from('sale_payments')
          .insert(
            patch.payments.map((p) => ({
              sale_id: id,
              amount: p.amount,
              date: p.date,
              note: p.note || null,
            })),
          )
          .select();
        syncedPayments = payData
          ? (payData as Record<string, unknown>[]).map(dbToPaymentRow)
          : patch.payments;
      } else {
        syncedPayments = [];
      }
    }

    const effTotal = patch.price ?? current?.price ?? 0;
    const effPayments = syncedPayments ?? current?.payments ?? [];
    const status = settleStatus(effTotal, effPayments);
    if (status !== current?.status) dbPatch.status = status;

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('sales').update(dbPatch).eq('id', id);
    }

    set((s) => ({
      sales: s.sales.map((x) => {
        if (x.id !== id) return x;
        const merged = { ...x, ...patch };
        if (syncedPayments !== undefined) merged.payments = syncedPayments;
        merged.status = settleStatus(merged.price, merged.payments);
        return merged;
      }),
    }));
  },

  deleteSale: async (id) => {
    await supabase.from('sales').delete().eq('id', id);
    set((s) => ({ sales: s.sales.filter((x) => x.id !== id) }));
  },

  addSalePayment: async (saleId, amount, note) => {
    const { data } = await supabase
      .from('sale_payments')
      .insert({ sale_id: saleId, amount, date: todayISO(), note: note || null })
      .select()
      .single();
    if (!data) return null;
    const payment = dbToPaymentRow(data as Record<string, unknown>);

    const current = get().sales.find((x) => x.id === saleId);
    if (current) {
      const payments = [...current.payments, payment];
      const status = settleStatus(current.price, payments);
      if (status !== current.status) {
        await supabase.from('sales').update({ status }).eq('id', saleId);
      }
      set((s) => ({
        sales: s.sales.map((x) => (x.id === saleId ? { ...x, payments, status } : x)),
      }));
    }
    return payment;
  },

  // ── PURCHASES (ACHATS) ───────────────────────────────────────────────────

  addPurchase: async (purchase) => {
    const code = nextCode(get().purchases, 'ACH');
    const today = todayISO();
    const status = settleStatus(purchase.purchasePrice, purchase.payments);

    const { data, error } = await supabase
      .from('purchases')
      .insert({
        code,
        room_id: purchase.roomId || null,
        client_id: purchase.clientId,
        purchase_price: purchase.purchasePrice,
        sale_price: purchase.salePrice,
        date: purchase.date,
        time: purchase.time,
        status,
        notes: purchase.notes || null,
      })
      .select()
      .single();
    if (error || !data) {
      console.error('addPurchase failed:', error);
      return null;
    }
    const purchaseId = (data as Record<string, unknown>).id as string;

    let payments: Payment[] = [];
    if (purchase.payments.length > 0) {
      const { data: payData } = await supabase
        .from('purchase_payments')
        .insert(
          purchase.payments.map((p) => ({
            purchase_id: purchaseId,
            amount: p.amount,
            date: p.date,
            note: p.note || null,
          })),
        )
        .select();
      if (payData) payments = (payData as Record<string, unknown>[]).map(dbToPaymentRow);
    }

    const newPurchase: Purchase = { ...purchase, id: purchaseId, code, payments, status, createdAt: today };
    set((s) => ({ purchases: [newPurchase, ...s.purchases] }));
    return newPurchase;
  },

  updatePurchase: async (id, patch) => {
    const current = get().purchases.find((x) => x.id === id);

    const dbPatch: Record<string, unknown> = {};
    if (patch.roomId !== undefined) dbPatch.room_id = patch.roomId || null;
    if (patch.clientId !== undefined) dbPatch.client_id = patch.clientId;
    if (patch.purchasePrice !== undefined) dbPatch.purchase_price = patch.purchasePrice;
    if (patch.salePrice !== undefined) dbPatch.sale_price = patch.salePrice;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    if (patch.time !== undefined) dbPatch.time = patch.time;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes || null;

    let syncedPayments: Payment[] | undefined;
    if (patch.payments !== undefined) {
      await supabase.from('purchase_payments').delete().eq('purchase_id', id);
      if (patch.payments.length > 0) {
        const { data: payData } = await supabase
          .from('purchase_payments')
          .insert(
            patch.payments.map((p) => ({
              purchase_id: id,
              amount: p.amount,
              date: p.date,
              note: p.note || null,
            })),
          )
          .select();
        syncedPayments = payData
          ? (payData as Record<string, unknown>[]).map(dbToPaymentRow)
          : patch.payments;
      } else {
        syncedPayments = [];
      }
    }

    const effTotal = patch.purchasePrice ?? current?.purchasePrice ?? 0;
    const effPayments = syncedPayments ?? current?.payments ?? [];
    const status = settleStatus(effTotal, effPayments);
    if (status !== current?.status) dbPatch.status = status;

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('purchases').update(dbPatch).eq('id', id);
    }

    set((s) => ({
      purchases: s.purchases.map((x) => {
        if (x.id !== id) return x;
        const merged = { ...x, ...patch };
        if (syncedPayments !== undefined) merged.payments = syncedPayments;
        merged.status = settleStatus(merged.purchasePrice, merged.payments);
        return merged;
      }),
    }));
  },

  deletePurchase: async (id) => {
    await supabase.from('purchases').delete().eq('id', id);
    set((s) => ({ purchases: s.purchases.filter((x) => x.id !== id) }));
  },

  addPurchasePayment: async (purchaseId, amount, note) => {
    const { data } = await supabase
      .from('purchase_payments')
      .insert({ purchase_id: purchaseId, amount, date: todayISO(), note: note || null })
      .select()
      .single();
    if (!data) return null;
    const payment = dbToPaymentRow(data as Record<string, unknown>);

    const current = get().purchases.find((x) => x.id === purchaseId);
    if (current) {
      const payments = [...current.payments, payment];
      const status = settleStatus(current.purchasePrice, payments);
      if (status !== current.status) {
        await supabase.from('purchases').update({ status }).eq('id', purchaseId);
      }
      set((s) => ({
        purchases: s.purchases.map((x) => (x.id === purchaseId ? { ...x, payments, status } : x)),
      }));
    }
    return payment;
  },

  // ── SETTINGS / DATA ───────────────────────────────────────────────────────

  updateStoreInfo: async (patch) => {
    const newInfo = { ...get().storeInfo, ...patch };
    await supabase
      .from('settings')
      .update({
        name: newInfo.name,
        logo_url: newInfo.logo,
        description: newInfo.description,
        email: newInfo.email,
        phone: newInfo.phone,
        address: newInfo.address,
        nif: newInfo.nif,
        nis: newInfo.nis,
        article: newInfo.article,
        rc: newInfo.rc,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    set((s) => ({ storeInfo: { ...s.storeInfo, ...patch } }));
  },

  exportData: () => {
    const s = get();
    const snapshot = {
      storeInfo: s.storeInfo,
      clients: s.clients,
      floors: s.floors,
      categories: s.categories,
      rooms: s.rooms,
      services: s.services,
      reservations: s.reservations,
      workers: s.workers,
      expenses: s.expenses,
      expenseCategories: s.expenseCategories,
      maintenances: s.maintenances,
      cashTransactions: s.cashTransactions,
      mediators: s.mediators,
      sales: s.sales,
      purchases: s.purchases,
      roles: s.roles,
    };
    return JSON.stringify(snapshot, null, 2);
  },

  importData: (json) => {
    try {
      const d = JSON.parse(json);
      set({
        storeInfo: d.storeInfo ?? get().storeInfo,
        clients: d.clients ?? [],
        floors: d.floors ?? [],
        categories: d.categories ?? [],
        rooms: d.rooms ?? [],
        services: d.services ?? [],
        reservations: d.reservations ?? [],
        workers: d.workers ?? [],
        expenses: d.expenses ?? [],
        expenseCategories: d.expenseCategories ?? [],
        maintenances: d.maintenances ?? [],
        cashTransactions: d.cashTransactions ?? [],
        mediators: d.mediators ?? [],
        sales: d.sales ?? [],
        purchases: d.purchases ?? [],
        roles: d.roles ?? [],
      });
      return true;
    } catch {
      return false;
    }
  },

  resetData: () => set({ ...createInitialData(), storeInfo: STORE_INFO }),
}));

// ─── Permission helpers ─────────────────────────────────────────────────────

/**
 * Fetch the logged-in worker's OWN row (by auth user id) to read its
 * permissions. This is independent of loadAll()'s `workers` list, which a
 * worker session usually can't read in full (the workers table holds salaries
 * and is typically RLS-restricted to admins). A dedicated "read own row" RLS
 * policy lets this single-row query succeed for the worker themselves.
 */
export async function fetchWorkerPermissions(
  authUserId: string,
): Promise<{ workerId?: string; permissions: Permissions }> {
  const { data } = await supabase
    .from('workers')
    .select('id, permissions')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!data) return { permissions: {} };
  const row = data as Record<string, unknown>;
  return { workerId: row.id as string, permissions: (row.permissions as Permissions) ?? {} };
}

export function useCurrentPermissions(): Permissions | null {
  const user = useApp((s) => s.user);
  const workers = useApp((s) => s.workers);
  if (!user || user.role === 'admin') return null;
  // Match the worker row by EITHER the profile link (workerId) OR — more
  // reliably — its auth_user_id, which always equals the logged-in user's id.
  // profiles.worker_id is often NULL (a handle_new_user trigger creates the
  // profile before our insert), so auth_user_id is the dependable link.
  const worker = workers.find(
    (w) => (!!user.workerId && w.id === user.workerId) || (!!w.authUserId && w.authUserId === user.id),
  );
  if (worker) return worker.permissions ?? {};
  // Last resort: the permissions snapshot fetched directly at auth time.
  return user.permissions ?? {};
}

export function canAccess(perms: Permissions | null, module: ModuleKey): boolean {
  if (perms === null) return true;
  const actions = perms[module];
  return !!actions && actions.length > 0;
}

export function can(perms: Permissions | null, module: ModuleKey, action: string): boolean {
  if (perms === null) return true;
  return !!perms[module]?.includes(action as never);
}
