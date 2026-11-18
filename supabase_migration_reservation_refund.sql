-- ═══════════════════════════════════════════════════════════════════════════
--  Bon de récupération (refund of the paid amount to the client)
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS refund_amount numeric;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS refund_date   date;
