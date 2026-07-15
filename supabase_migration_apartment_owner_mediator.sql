-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION — Apartment owner (free-text) + mediator link
--
--  Adds three optional columns to `rooms`:
--    • owner_name   — full name of the apartment owner (free text, optional)
--    • owner_phone  — owner phone number (free text, optional)
--    • mediator_id  — mediator associated with the apartment (FK → mediators)
--
--  Run this ONCE in the Supabase SQL Editor of the existing project
--  (nejxsmguhyqxdlvjdylo). Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_name  text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS mediator_id uuid;

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
