-- ═══════════════════════════════════════════════════════════════════════════
-- Migration — apartments: rental period (day/month) + furnished flag
--
-- Run this once in the Supabase SQL editor (it is idempotent).
--
--   • rooms.rental_period          'day' | 'month'  — billing unit of a rental
--   • rooms.furnished              boolean          — meublé / non meublé
--   • rooms.furniture_description  text             — list of the furniture
--
-- `rooms.price_per_night` keeps holding the rent for ONE billing unit:
-- one night when rental_period = 'day', one month when rental_period = 'month'.
--
-- The `wilaya` and `secteur` columns are no longer used by the application.
-- They are left in place so existing data is not lost; drop them manually if
-- you are sure you no longer need them.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS rental_period         text    NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS furnished             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS furniture_description text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'rooms_rental_period_check' AND table_name = 'rooms'
  ) THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_rental_period_check
      CHECK (rental_period = ANY (ARRAY['day'::text, 'month'::text]));
  END IF;
END $$;

-- Existing apartments keep the historical nightly billing.
UPDATE public.rooms SET rental_period = 'day' WHERE rental_period IS NULL;
