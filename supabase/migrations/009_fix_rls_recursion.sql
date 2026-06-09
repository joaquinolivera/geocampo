-- ============================================================
-- Migration 009: Fix RLS infinite recursion on farm_members
-- ============================================================
-- Problem: the SELECT policy on farm_members contained a subquery
--   that also read farm_members → Postgres detected infinite recursion.
--
-- Fix: SECURITY DEFINER scalar-boolean helpers that read farm_members
--   without triggering RLS, used in every policy expression.
--   (Set-returning functions are NOT allowed in RLS USING clauses.)
--
-- Also: NOTIFY PostgREST to reload schema cache (fixes horometro_actual
--   and other columns added in migrations 006-008).
-- ============================================================

-- ── 1. SECURITY DEFINER helpers (bypass RLS, return scalar booleans) ─────────

-- Returns TRUE if the current user is an accepted member of the given farm
CREATE OR REPLACE FUNCTION auth_is_farm_member(p_farm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM farm_members
    WHERE  farm_id     = p_farm_id
      AND  user_id     = auth.uid()
      AND  accepted_at IS NOT NULL
  );
$$;

-- Returns TRUE if the current user is an *owner* of the given farm
CREATE OR REPLACE FUNCTION auth_is_farm_owner(p_farm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM farm_members
    WHERE  farm_id     = p_farm_id
      AND  user_id     = auth.uid()
      AND  role        = 'owner'
      AND  accepted_at IS NOT NULL
  );
$$;

-- ── 2. Drop all existing policies on farm_members ────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'farm_members' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON farm_members';
  END LOOP;
END$$;

-- ── 3. Recreate policies using scalar boolean helpers ────────────────────────

-- Members see rows for farms they belong to, plus their own pending invites
CREATE POLICY "memberships_select" ON farm_members
  FOR SELECT USING (
    auth_is_farm_member(farm_id)
    OR user_id = auth.uid()
  );

-- Only owners may insert invites (service-role API routes bypass RLS)
CREATE POLICY "memberships_insert" ON farm_members
  FOR INSERT WITH CHECK (
    auth_is_farm_owner(farm_id)
  );

-- Owners can update any row; invitees can accept their own pending invite
CREATE POLICY "memberships_update" ON farm_members
  FOR UPDATE USING (
    auth_is_farm_owner(farm_id)
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

-- Only owners can remove members
CREATE POLICY "memberships_delete" ON farm_members
  FOR DELETE USING (
    auth_is_farm_owner(farm_id)
  );

-- ── 4. Reload PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
