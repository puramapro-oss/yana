-- Fix yana.profiles RLS infinite recursion (PostgreSQL error 42P17).
--
-- Bug : la policy profiles_select_own contient un sous-SELECT sur
-- yana.profiles, ce qui re-déclenche RLS et crée une boucle. Tous les
-- non-super_admin reçoivent un 500 PostgREST en lisant leur profil.
--
-- Fix : on remplace la sous-requête par un appel à une fonction
-- SECURITY DEFINER qui bypasse RLS pour vérifier le rôle super_admin.

CREATE OR REPLACE FUNCTION yana.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM yana.profiles
    WHERE auth_user_id = auth.uid() AND role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION yana.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yana.is_super_admin() TO anon, authenticated;

DROP POLICY IF EXISTS profiles_select_own ON yana.profiles;
CREATE POLICY profiles_select_own ON yana.profiles FOR SELECT
  USING (auth.uid() = auth_user_id OR yana.is_super_admin());

NOTIFY pgrst, 'reload schema';
