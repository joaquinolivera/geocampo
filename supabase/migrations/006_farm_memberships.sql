-- ============================================================
-- Migration 006: RBAC — extend farm_members + add invitation flow
-- ============================================================
-- The existing farm_members table has: id, farm_id, user_id, role,
-- invited_by, joined_at. We extend it with invitation columns and
-- add the new roles capataz + empleado to the farm_role enum.
-- ============================================================

-- ── 1. Extend farm_role enum ─────────────────────────────────
-- Add the user-facing roles. Existing values are kept.
ALTER TYPE farm_role ADD VALUE IF NOT EXISTS 'capataz';
ALTER TYPE farm_role ADD VALUE IF NOT EXISTS 'empleado';

-- ── 2. Add invitation columns to farm_members ────────────────
ALTER TABLE farm_members
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS invited_at        TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_token  TEXT UNIQUE;

-- Back-fill email for existing members from auth.users
UPDATE farm_members fm
SET email = u.email
FROM auth.users u
WHERE fm.user_id = u.id
  AND fm.email IS NULL;

-- Back-fill accepted_at for existing active members (they joined, not pending)
UPDATE farm_members
SET accepted_at = joined_at
WHERE accepted_at IS NULL
  AND user_id IS NOT NULL;

-- Make email non-null after back-fill (default to a placeholder for any nulls)
UPDATE farm_members
SET email = 'unknown@geocampo.app'
WHERE email IS NULL;

-- ── 3. Ensure farm owner always has a membership ─────────────
INSERT INTO farm_members (farm_id, user_id, email, role, accepted_at)
SELECT
  f.id,
  f.owner_id,
  COALESCE(u.email, 'unknown@geocampo.app'),
  'owner',
  NOW()
FROM farms f
LEFT JOIN auth.users u ON u.id = f.owner_id
WHERE f.owner_id IS NOT NULL
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- ── 4. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_farm_members_token ON farm_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_farm_members_email ON farm_members(email);

-- ── 5. Drop old RLS policies and replace ────────────────────
-- (002_rls_policies.sql created generic policies; we replace with RBAC-aware ones)
DROP POLICY IF EXISTS "farm_members_select" ON farm_members;
DROP POLICY IF EXISTS "farm_members_insert" ON farm_members;
DROP POLICY IF EXISTS "farm_members_update" ON farm_members;
DROP POLICY IF EXISTS "farm_members_delete" ON farm_members;

-- Fallback: also drop any policies that might have been named differently
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'farm_members' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON farm_members';
  END LOOP;
END$$;

-- Members can see all memberships for farms they belong to (including pending invites for themselves)
CREATE POLICY "memberships_select" ON farm_members
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM farm_members m2
      WHERE m2.user_id = auth.uid() AND m2.accepted_at IS NOT NULL
    )
    OR user_id = auth.uid()
  );

-- Only owners can create invites; service-role API routes bypass RLS
CREATE POLICY "memberships_insert" ON farm_members
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members m2
      WHERE m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.accepted_at IS NOT NULL
    )
  );

-- Owners can update any membership; invitees can accept their own invite
CREATE POLICY "memberships_update" ON farm_members
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM farm_members m2
      WHERE m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.accepted_at IS NOT NULL
    )
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

-- Only owners can remove members
CREATE POLICY "memberships_delete" ON farm_members
  FOR DELETE USING (
    farm_id IN (
      SELECT farm_id FROM farm_members m2
      WHERE m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.accepted_at IS NOT NULL
    )
  );

-- ── 6. Helper functions ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_farm_role(p_farm_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM farm_members
  WHERE farm_id = p_farm_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL
  LIMIT 1;
$$;

-- Returns TRUE if current user can perform action on farm
CREATE OR REPLACE FUNCTION farm_role_can(p_farm_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN p_action = 'manage_farm'     THEN get_farm_role(p_farm_id) = 'owner'
    WHEN p_action = 'invite_members'  THEN get_farm_role(p_farm_id) = 'owner'
    WHEN p_action = 'edit_pastures'   THEN get_farm_role(p_farm_id) IN ('owner', 'capataz', 'manager')
    WHEN p_action = 'edit_herds'      THEN get_farm_role(p_farm_id) IN ('owner', 'capataz', 'manager')
    WHEN p_action = 'view_financials' THEN get_farm_role(p_farm_id) IN ('owner', 'capataz', 'manager')
    WHEN p_action = 'add_records'     THEN get_farm_role(p_farm_id) IS NOT NULL
    ELSE FALSE
  END;
$$;
