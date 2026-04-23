-- B1.0 — profile birthdate + locale constraint
ALTER TABLE yana.profiles ADD COLUMN IF NOT EXISTS birthdate date;
ALTER TABLE yana.profiles ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'fr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='profiles_locale_check' AND table_schema='yana'
  ) THEN
    ALTER TABLE yana.profiles ADD CONSTRAINT profiles_locale_check
      CHECK (locale IN ('fr','en','es','de','it','pt','ar','zh','ja','ko','hi','ru','tr','nl','pl','sv'));
  END IF;
END $$;
