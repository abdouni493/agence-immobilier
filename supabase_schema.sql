-- ═══════════════════════════════════════════════════════════════════════════
--  RESIDENCE / AGENCE IMMOBILIÈRE — FULL DATABASE SCHEMA
--  Run this ONCE in the Supabase SQL Editor of a brand-new project.
--
--  It creates every table the application reads/writes, the row-level-security
--  policies it relies on, the auth → profile trigger, and one default settings
--  row. Written to run top-to-bottom on an empty project (drops are guarded so
--  it is also safe to re-run).
-- ═══════════════════════════════════════════════════════════════════════════

-- gen_random_uuid() lives in pgcrypto (already available on Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════
--  1. TABLES  (created in dependency order)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Residence identity (exactly one row, read on the login screen) ──────────
CREATE TABLE IF NOT EXISTS public.settings (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT 'Ma Résidence',
  logo_url    text,
  description text,
  email       text,
  phone       text,
  address     text,
  nif         text,
  nis         text,
  article     text,
  rc          text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);

-- ── Floors & categories (apartment/room classification) ─────────────────────
CREATE TABLE IF NOT EXISTS public.floors (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT floors_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- ── Clients (renters, buyers, sellers, apartment owners) ────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name           text NOT NULL,
  last_name            text NOT NULL,
  birth_date           date,
  birth_place          text,
  sexe                 text CHECK (sexe = ANY (ARRAY['M'::text, 'F'::text])),
  profession           text,
  address              text,
  city                 text,
  phone                text NOT NULL,
  phone2               text,
  email                text,
  document_type        text CHECK (document_type = ANY (ARRAY['permis'::text, 'cin'::text, 'passeport'::text])),
  document_number      text,
  document_issue_date  date,
  document_expiry_date date,
  document_issue_place text,
  photo_urls           text[] DEFAULT '{}'::text[],
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- ── Rooms / apartments (rental + sale properties) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  capacity         integer NOT NULL DEFAULT 2,
  floor_id         uuid,
  category_id      uuid,
  price_per_night  numeric NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'available'
                     CHECK (status = ANY (ARRAY['available'::text, 'occupied'::text, 'maintenance'::text])),
  maintenance_note text,
  -- Fiche appartement (real-estate agency fields)
  wilaya           text,
  commune          text,
  secteur          text,
  description      text,
  property_type    text NOT NULL DEFAULT 'rental'
                     CHECK (property_type = ANY (ARRAY['rental'::text, 'sale'::text])),
  owner_client_id  uuid,
  owner_name       text,
  owner_phone      text,
  mediator_id      uuid,
  sale_price       numeric,
  purchase_price   numeric,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT rooms_floor_id_fkey        FOREIGN KEY (floor_id)        REFERENCES public.floors(id)     ON DELETE SET NULL,
  CONSTRAINT rooms_category_id_fkey     FOREIGN KEY (category_id)     REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT rooms_owner_client_id_fkey FOREIGN KEY (owner_client_id) REFERENCES public.clients(id)    ON DELETE SET NULL
  -- NB: rooms.mediator_id FK is added after the mediators table is created (see below).
);

-- ── Maintenances (work done on a room; detail of a room) ────────────────────
CREATE TABLE IF NOT EXISTS public.maintenances (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL,
  name        text NOT NULL,
  cost        numeric NOT NULL DEFAULT 0,
  date        date NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenances_pkey PRIMARY KEY (id),
  CONSTRAINT maintenances_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE
);

-- ── Services (add-ons billed on a reservation) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  price       numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id)
);

-- ── Reservations + detail lines ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservations (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  client_id      uuid NOT NULL,
  check_in       date NOT NULL,
  check_out      date NOT NULL,
  check_in_time  text NOT NULL DEFAULT '14:00',
  check_out_time text NOT NULL DEFAULT '11:00',
  nights         integer NOT NULL DEFAULT 1,
  total          numeric NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status = ANY (ARRAY['paid'::text, 'debt'::text, 'active'::text, 'pending'::text, 'cancelled'::text])),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.reservation_rooms (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL,
  room_id         uuid NOT NULL,
  price_per_night numeric NOT NULL DEFAULT 0,
  CONSTRAINT reservation_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_rooms_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE,
  CONSTRAINT reservation_rooms_room_id_fkey        FOREIGN KEY (room_id)         REFERENCES public.rooms(id)        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.reservation_services (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  service_id     uuid NOT NULL,
  quantity       integer NOT NULL DEFAULT 1,
  unit_price     numeric NOT NULL DEFAULT 0,
  CONSTRAINT reservation_services_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_services_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE,
  CONSTRAINT reservation_services_service_id_fkey     FOREIGN KEY (service_id)     REFERENCES public.services(id)     ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  amount         numeric NOT NULL,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE
);

-- ── Workers (staff) + their detail rows ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workers (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  birth_date    date,
  cin           text,
  phone         text NOT NULL,
  role          text NOT NULL,
  start_date    date NOT NULL DEFAULT CURRENT_DATE,
  has_salary    boolean NOT NULL DEFAULT true,
  salary_type   text CHECK (salary_type = ANY (ARRAY['daily'::text, 'monthly'::text])),
  salary_amount numeric,
  has_account   boolean NOT NULL DEFAULT false,
  auth_user_id  uuid,
  permissions   jsonb NOT NULL DEFAULT '{}'::jsonb,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workers_pkey PRIMARY KEY (id),
  CONSTRAINT workers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ── Profiles (one per auth user; links a worker login to its worker row) ────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid NOT NULL,
  role       text NOT NULL DEFAULT 'worker' CHECK (role = ANY (ARRAY['admin'::text, 'worker'::text])),
  username   text UNIQUE,
  name       text,
  email      text,
  avatar_url text,
  worker_id  uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey        FOREIGN KEY (id)        REFERENCES auth.users(id)     ON DELETE CASCADE,
  CONSTRAINT profiles_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.worker_advances (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  amount      numeric NOT NULL,
  deducted    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT worker_advances_pkey PRIMARY KEY (id),
  CONSTRAINT worker_advances_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.worker_absences (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL,
  date        date NOT NULL,
  description text,
  cost        numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT worker_absences_pkey PRIMARY KEY (id),
  CONSTRAINT worker_absences_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.worker_payments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  amount      numeric NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT worker_payments_pkey PRIMARY KEY (id),
  CONSTRAINT worker_payments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE
);

-- ── Job roles (reference list of job titles) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_roles (
  id   uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT job_roles_pkey PRIMARY KEY (id)
);

-- ── Expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category_id uuid,
  description text,
  amount      numeric NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE SET NULL
);

-- ── Cash register (caisse) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text])),
  amount      numeric NOT NULL,
  description text NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_transactions_pkey PRIMARY KEY (id)
);

-- ── Mediators (intermediaries paid a commission on sales) ───────────────────
CREATE TABLE IF NOT EXISTS public.mediators (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name  text NOT NULL,
  phone      text NOT NULL,
  phone2     text,
  email      text,
  address    text,
  city       text,
  cin        text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mediators_pkey PRIMARY KEY (id)
);

-- rooms.mediator_id references mediators (added here so mediators exists first).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rooms_mediator_id_fkey' AND table_name = 'rooms'
  ) THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_mediator_id_fkey
      FOREIGN KEY (mediator_id) REFERENCES public.mediators(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mediator_payments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  mediator_id uuid NOT NULL,
  amount      numeric NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mediator_payments_pkey PRIMARY KEY (id),
  CONSTRAINT mediator_payments_mediator_id_fkey FOREIGN KEY (mediator_id) REFERENCES public.mediators(id) ON DELETE CASCADE
);

-- ── Sales (ventes) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  room_id             uuid,
  client_id           uuid NOT NULL,
  mediator_id         uuid,
  commission_type     text NOT NULL DEFAULT 'amount'
                        CHECK (commission_type = ANY (ARRAY['amount'::text, 'percent'::text])),
  commission_percent  numeric,
  mediator_commission numeric NOT NULL DEFAULT 0,
  price               numeric NOT NULL DEFAULT 0,
  date                date NOT NULL DEFAULT CURRENT_DATE,
  time                text NOT NULL DEFAULT '10:00',
  status              text NOT NULL DEFAULT 'debt'
                        CHECK (status = ANY (ARRAY['paid'::text, 'debt'::text])),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_room_id_fkey     FOREIGN KEY (room_id)     REFERENCES public.rooms(id)     ON DELETE SET NULL,
  CONSTRAINT sales_client_id_fkey   FOREIGN KEY (client_id)   REFERENCES public.clients(id)   ON DELETE RESTRICT,
  CONSTRAINT sales_mediator_id_fkey FOREIGN KEY (mediator_id) REFERENCES public.mediators(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id    uuid NOT NULL,
  amount     numeric NOT NULL,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sale_payments_pkey PRIMARY KEY (id),
  CONSTRAINT sale_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE
);

-- ── Purchases (achats — agency buys an apartment from a client) ─────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  room_id        uuid,
  client_id      uuid NOT NULL,
  purchase_price numeric NOT NULL DEFAULT 0,
  sale_price     numeric NOT NULL DEFAULT 0,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  time           text NOT NULL DEFAULT '10:00',
  status         text NOT NULL DEFAULT 'debt'
                   CHECK (status = ANY (ARRAY['paid'::text, 'debt'::text])),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_room_id_fkey   FOREIGN KEY (room_id)   REFERENCES public.rooms(id)   ON DELETE SET NULL,
  CONSTRAINT purchases_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.purchase_payments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  amount      numeric NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_payments_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_payments_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE
);

-- Helpful indexes on the foreign keys the app filters/joins on most.
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id                 ON public.rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_category_id              ON public.rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_room_id           ON public.maintenances(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client_id         ON public.reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_res_id       ON public.reservation_rooms(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_services_res_id    ON public.reservation_services(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id        ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_workers_auth_user_id           ON public.workers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_worker_advances_worker_id      ON public.worker_advances(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_absences_worker_id      ON public.worker_absences(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker_id      ON public.worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_profiles_worker_id             ON public.profiles(worker_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id           ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_mediator_payments_mediator_id  ON public.mediator_payments(mediator_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id                ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id          ON public.sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_purchases_client_id            ON public.purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_id  ON public.purchase_payments(purchase_id);

-- ═══════════════════════════════════════════════════════════════════════════
--  2. AUTH → PROFILE TRIGGER
--  Whenever a Supabase auth user is created (admin signup or worker account),
--  create the matching public.profiles row from the signup metadata. Wrapped
--  so a profile hiccup can never block auth-user creation.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, role, name, username, email, worker_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'worker'),
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'username',
      NEW.email,
      NULLIF(NEW.raw_user_meta_data ->> 'worker_id', '')::uuid
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN others THEN
    -- Never abort the auth signup because of a profile insert problem
    -- (e.g. a duplicate username). The app upserts the profile afterwards.
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
--  3. ROW LEVEL SECURITY
--  Model used by the app: any authenticated user has full access to every
--  table (access is gated in the UI by the per-worker `permissions` JSON).
--  In addition, `settings` and `profiles` are readable by the anon role so the
--  login screen can show the residence identity and resolve a username → email
--  BEFORE the user is authenticated.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'settings','floors','categories','clients','rooms','maintenances','services',
    'reservations','reservation_rooms','reservation_services','payments',
    'workers','profiles','worker_advances','worker_absences','worker_payments',
    'job_roles','expense_categories','expenses','cash_transactions',
    'mediators','mediator_payments','sales','sale_payments','purchases','purchase_payments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated full access" ON public.%I;', tbl);
    EXECUTE format(
      'CREATE POLICY "authenticated full access" ON public.%I
         FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl
    );
  END LOOP;
END $$;

-- Anon read access required before login.
DROP POLICY IF EXISTS "public read settings" ON public.settings;
CREATE POLICY "public read settings" ON public.settings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read profiles" ON public.profiles;
CREATE POLICY "public read profiles" ON public.profiles
  FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
--  4. SEED — one residence-identity row (the app reads settings with .single())
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.settings (name)
SELECT 'Ma Résidence'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- ═══════════════════════════════════════════════════════════════════════════
--  DONE. Create the first admin account from the app's Sign-up screen.
--  (Disable "Confirm email" under Auth → Providers → Email in Supabase so the
--   admin/worker accounts can log in immediately.)
-- ═══════════════════════════════════════════════════════════════════════════
