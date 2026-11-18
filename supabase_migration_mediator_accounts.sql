-- ═══════════════════════════════════════════════════════════════════════════
--  Mediator (intermédiaire / وسيط) login accounts + permissions
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Account + permissions on the mediator row (same model as workers).
ALTER TABLE public.mediators ADD COLUMN IF NOT EXISTS has_account      boolean NOT NULL DEFAULT false;
ALTER TABLE public.mediators ADD COLUMN IF NOT EXISTS auth_user_id     uuid;
ALTER TABLE public.mediators ADD COLUMN IF NOT EXISTS account_email    text;
ALTER TABLE public.mediators ADD COLUMN IF NOT EXISTS account_username text;
ALTER TABLE public.mediators ADD COLUMN IF NOT EXISTS permissions      jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mediators_auth_user_id_fkey') THEN
    ALTER TABLE public.mediators
      ADD CONSTRAINT mediators_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Profiles: a third role 'mediator' and the link to the mediator row.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mediator_id uuid;

DO $$
DECLARE c record;
BEGIN
  -- Drop the existing CHECK on profiles.role (its name depends on how the
  -- table was created), then add the new one.
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role = ANY (ARRAY['admin'::text, 'worker'::text, 'mediator'::text]));

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_mediator_id_fkey') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_mediator_id_fkey
      FOREIGN KEY (mediator_id) REFERENCES public.mediators(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Signup trigger: also stores mediator_id from the signup metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, role, name, username, email, worker_id, mediator_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'worker'),
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'username',
      NEW.email,
      NULLIF(NEW.raw_user_meta_data ->> 'worker_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data ->> 'mediator_id', '')::uuid
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;
