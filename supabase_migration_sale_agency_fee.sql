-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION — Part de l'agence sur les ventes (حصة الوكالة)
--
--  Copiez/collez CE FICHIER ENTIER dans le SQL Editor de Supabase et exécutez.
--  Il est ré-exécutable sans risque.
-- ═══════════════════════════════════════════════════════════════════════════
-- agency_fee_type    : 'percent' (pourcentage du prix) ou 'amount' (montant fixe)
-- agency_fee_percent : pourcentage saisi (si agency_fee_type = 'percent')
-- agency_fee         : part de l'agence finale en DA (affichée dans la caisse)

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS agency_fee_type    text,
  ADD COLUMN IF NOT EXISTS agency_fee_percent numeric,
  ADD COLUMN IF NOT EXISTS agency_fee         numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_agency_fee_type_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_agency_fee_type_check
      CHECK (agency_fee_type IS NULL OR agency_fee_type = ANY (ARRAY['percent'::text, 'amount'::text]));
  END IF;
END $$;

-- Recharge le cache du schéma de l'API Supabase
NOTIFY pgrst, 'reload schema';
