-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION — Frais d'agence, commissions employés, photos d'appartement,
--              corbeille des appartements (suppression douce)
--
--  Copiez/collez CE FICHIER ENTIER dans le SQL Editor de Supabase et exécutez.
--  Il est ré-exécutable sans risque (tout est IF NOT EXISTS / ON CONFLICT).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
--  1. LOCATIONS — frais d'agence + commission employé sur ces frais
-- ───────────────────────────────────────────────────────────────────────────
-- agency_fee                        : montant facturé au client (inclus dans total)
-- agency_fee_worker_id              : employé qui touche un % de ces frais
-- agency_fee_percent                : pourcentage attribué à cet employé (0-100)
-- agency_fee_commission             : montant figé de la commission, en DA
-- agency_fee_commission_settled     : true dès que la commission a été payée
-- agency_fee_commission_payment_id  : la fiche de paie qui l'a réglée

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS agency_fee                       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_fee_worker_id             uuid,
  ADD COLUMN IF NOT EXISTS agency_fee_percent               numeric,
  ADD COLUMN IF NOT EXISTS agency_fee_commission            numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_fee_commission_settled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agency_fee_commission_payment_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_agency_fee_worker_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_agency_fee_worker_id_fkey
      FOREIGN KEY (agency_fee_worker_id) REFERENCES public.workers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_agency_fee_worker
  ON public.reservations(agency_fee_worker_id)
  WHERE agency_fee_worker_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
--  2. PAIE DES EMPLOYÉS — détail figé + rattachement des éléments réglés
--     Un acompte / une absence / une commission réglés portent l'id de la
--     fiche de paie : ils sortent du prochain paiement et rejoignent l'historique.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.worker_payments
  ADD COLUMN IF NOT EXISTS gross             numeric,
  ADD COLUMN IF NOT EXISTS commissions_total numeric,
  ADD COLUMN IF NOT EXISTS absences_total    numeric,
  ADD COLUMN IF NOT EXISTS advances_total    numeric;

ALTER TABLE public.worker_advances
  ADD COLUMN IF NOT EXISTS worker_payment_id uuid;

ALTER TABLE public.worker_absences
  ADD COLUMN IF NOT EXISTS deducted          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_payment_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'worker_advances_worker_payment_id_fkey'
  ) THEN
    ALTER TABLE public.worker_advances
      ADD CONSTRAINT worker_advances_worker_payment_id_fkey
      FOREIGN KEY (worker_payment_id) REFERENCES public.worker_payments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'worker_absences_worker_payment_id_fkey'
  ) THEN
    ALTER TABLE public.worker_absences
      ADD CONSTRAINT worker_absences_worker_payment_id_fkey
      FOREIGN KEY (worker_payment_id) REFERENCES public.worker_payments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_agency_fee_commission_payment_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_agency_fee_commission_payment_id_fkey
      FOREIGN KEY (agency_fee_commission_payment_id) REFERENCES public.worker_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_worker_advances_payment_id ON public.worker_advances(worker_payment_id);
CREATE INDEX IF NOT EXISTS idx_worker_absences_payment_id ON public.worker_absences(worker_payment_id);

-- Les absences déjà saisies AVANT cette mise à jour n'avaient pas de notion de
-- "déduite". Celles qui précèdent le dernier paiement de l'employé sont
-- considérées comme déjà réglées, sinon elles réapparaîtraient sur la paie.
UPDATE public.worker_absences a
SET    deducted = true
WHERE  a.deducted = false
AND    EXISTS (
         SELECT 1 FROM public.worker_payments p
         WHERE p.worker_id = a.worker_id
         AND   p.date >= a.date
       );

-- ───────────────────────────────────────────────────────────────────────────
--  3. APPARTEMENTS — galerie photos + corbeille (suppression douce)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS deleted    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Les listes/pickers ne lisent que les appartements non supprimés.
CREATE INDEX IF NOT EXISTS idx_rooms_deleted ON public.rooms(deleted);

-- ───────────────────────────────────────────────────────────────────────────
--  4. STORAGE — bucket public « apartment-photos »
--     Les images sont compressées à ~100 Ko côté application avant l'envoi ;
--     la limite de 5 Mo n'est qu'un garde-fou.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'apartment-photos',
  'apartment-photos',
  true,
  5242880,                                                     -- 5 Mo max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Lecture publique (les <img> du site pointent directement sur l'URL publique).
DROP POLICY IF EXISTS "apartment photos public read" ON storage.objects;
CREATE POLICY "apartment photos public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'apartment-photos');

-- Envoi / remplacement / suppression réservés aux utilisateurs connectés.
DROP POLICY IF EXISTS "apartment photos insert" ON storage.objects;
CREATE POLICY "apartment photos insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'apartment-photos');

DROP POLICY IF EXISTS "apartment photos update" ON storage.objects;
CREATE POLICY "apartment photos update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'apartment-photos')
  WITH CHECK (bucket_id = 'apartment-photos');

DROP POLICY IF EXISTS "apartment photos delete" ON storage.objects;
CREATE POLICY "apartment photos delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'apartment-photos');

-- ═══════════════════════════════════════════════════════════════════════════
--  TERMINÉ.
--  Rechargez l'application (F5) : les frais d'agence, les commissions, les
--  photos d'appartement et la corbeille sont disponibles immédiatement.
-- ═══════════════════════════════════════════════════════════════════════════
