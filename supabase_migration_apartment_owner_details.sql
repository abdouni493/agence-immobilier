-- ============================================================================
-- Migration : full owner details on an apartment (propriétaire du bien)
-- ----------------------------------------------------------------------------
-- The apartment form now lets the user type the owner's information optionally,
-- exactly like a client (phone(s), e-mail, address, city, profession and an
-- identity document). These fields feed the "Propriétaire du bien" block on the
-- printed rental contract and payment voucher (bon de versement).
--
-- Safe to run several times: every column is added with IF NOT EXISTS.
-- Run it once in the Supabase SQL editor.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS owner_phone2         text,
  ADD COLUMN IF NOT EXISTS owner_email          text,
  ADD COLUMN IF NOT EXISTS owner_address        text,
  ADD COLUMN IF NOT EXISTS owner_city           text,
  ADD COLUMN IF NOT EXISTS owner_profession     text,
  ADD COLUMN IF NOT EXISTS owner_document_type  text,
  ADD COLUMN IF NOT EXISTS owner_document_number text;

-- Restrict the document type to the three supported values (permis / cin /
-- passeport) while still allowing NULL when no document is entered.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'rooms_owner_document_type_check'
      AND table_name = 'rooms'
  ) THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_owner_document_type_check
      CHECK (owner_document_type IS NULL
             OR owner_document_type = ANY (ARRAY['permis'::text, 'cin'::text, 'passeport'::text]));
  END IF;
END $$;

COMMENT ON COLUMN public.rooms.owner_phone2          IS 'Propriétaire : téléphone secondaire (optionnel)';
COMMENT ON COLUMN public.rooms.owner_email           IS 'Propriétaire : e-mail (optionnel)';
COMMENT ON COLUMN public.rooms.owner_address         IS 'Propriétaire : adresse (optionnel)';
COMMENT ON COLUMN public.rooms.owner_city            IS 'Propriétaire : ville / commune (optionnel)';
COMMENT ON COLUMN public.rooms.owner_profession      IS 'Propriétaire : profession (optionnel)';
COMMENT ON COLUMN public.rooms.owner_document_type   IS 'Propriétaire : type de pièce (permis / cin / passeport)';
COMMENT ON COLUMN public.rooms.owner_document_number IS 'Propriétaire : numéro de la pièce d''identité';
