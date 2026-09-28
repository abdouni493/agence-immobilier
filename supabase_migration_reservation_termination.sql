-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION — Résiliation (فسخ عقد إيجار) des locations
--
--  Copiez/collez CE FICHIER ENTIER dans le SQL Editor de Supabase et exécutez.
--  Il est ré-exécutable sans risque.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
--  1. Nouveau statut « terminated » (location résiliée / مفسوخ)
--     On supprime l'ancienne contrainte CHECK sur reservations.status, quel
--     que soit son nom, puis on la recrée avec la nouvelle valeur.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM   pg_constraint con
    JOIN   pg_class      rel ON rel.oid = con.conrelid
    JOIN   pg_namespace  nsp ON nsp.oid = rel.relnamespace
    WHERE  nsp.nspname = 'public'
    AND    rel.relname = 'reservations'
    AND    con.contype = 'c'
    AND    pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.reservations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status = ANY (ARRAY[
    'paid'::text, 'debt'::text, 'active'::text, 'pending'::text,
    'cancelled'::text, 'terminated'::text
  ]));

-- ───────────────────────────────────────────────────────────────────────────
--  2. Détails de la résiliation
-- ───────────────────────────────────────────────────────────────────────────
-- termination_date   : date de la résiliation — l'appartement est libre dès ce jour
-- termination_reason : motifs (وذلك للأسباب التالية)
-- terminated_by      : 'tenant' (المستأجر) ou 'owner' (المالك)
-- termination_place  : « Fait à » (حرر في)

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS termination_date   date,
  ADD COLUMN IF NOT EXISTS termination_reason text,
  ADD COLUMN IF NOT EXISTS terminated_by      text,
  ADD COLUMN IF NOT EXISTS termination_place  text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_terminated_by_check'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_terminated_by_check
      CHECK (terminated_by IS NULL OR terminated_by = ANY (ARRAY['tenant'::text, 'owner'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- ───────────────────────────────────────────────────────────────────────────
--  3. Remettre « disponible » les appartements des locations déjà résiliées
--     (sans effet lors de la première exécution, utile en ré-exécution).
-- ───────────────────────────────────────────────────────────────────────────

UPDATE public.rooms ro
SET    status = 'available'
WHERE  ro.status = 'occupied'
AND    EXISTS (
         SELECT 1
         FROM   public.reservation_rooms rr
         JOIN   public.reservations r ON r.id = rr.reservation_id
         WHERE  rr.room_id = ro.id
         AND    r.status = 'terminated'
       );

-- ═══════════════════════════════════════════════════════════════════════════
--  TERMINÉ.
--  Rechargez l'application (F5) : le bouton « Résilier le contrat » apparaît
--  sur les locations en cours et le filtre « Résiliées » est disponible.
-- ═══════════════════════════════════════════════════════════════════════════
