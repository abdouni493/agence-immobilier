-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION : Ventes, Achats, Médiateurs + extension Appartements
-- À exécuter dans le SQL Editor de Supabase (une seule fois).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Extension de la table rooms (appartements) ───────────────────────────
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS wilaya text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS commune text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS secteur text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS property_type text NOT NULL DEFAULT 'rental'
  CHECK (property_type = ANY (ARRAY['rental'::text, 'sale'::text]));
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS purchase_price numeric;

-- ── 2. Médiateurs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mediators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  phone2 text,
  email text,
  address text,
  city text,
  cin text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mediators_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.mediator_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mediator_id uuid NOT NULL REFERENCES public.mediators(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mediator_payments_pkey PRIMARY KEY (id)
);

-- ── 3. Ventes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  mediator_id uuid REFERENCES public.mediators(id) ON DELETE SET NULL,
  commission_type text NOT NULL DEFAULT 'amount'
    CHECK (commission_type = ANY (ARRAY['amount'::text, 'percent'::text])),
  commission_percent numeric,
  mediator_commission numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time text NOT NULL DEFAULT '10:00',
  status text NOT NULL DEFAULT 'debt'
    CHECK (status = ANY (ARRAY['paid'::text, 'debt'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sales_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sale_payments_pkey PRIMARY KEY (id)
);

-- ── 4. Achats ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  purchase_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time text NOT NULL DEFAULT '10:00',
  status text NOT NULL DEFAULT 'debt'
    CHECK (status = ANY (ARRAY['paid'::text, 'debt'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchases_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.purchase_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchase_payments_pkey PRIMARY KEY (id)
);

-- ── 5. RLS (même modèle que le reste de l'application : accès authentifié) ──
ALTER TABLE public.mediators         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediator_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['mediators','mediator_payments','sales','sale_payments','purchases','purchase_payments']
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated full access" ON public.%I;
       CREATE POLICY "authenticated full access" ON public.%I
         FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;
