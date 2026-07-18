-- ============================================================
-- Migration 012: Fix owner farm_members rows missing accepted_at
-- ============================================================
-- The /api/farms route previously inserted owner rows without
-- setting accepted_at, causing the middleware's farm lookup
-- (.not('accepted_at', 'is', null)) to find 0 farms and
-- redirect authenticated owners to /setup on every login.
-- ============================================================

-- Back-fill accepted_at for all owner rows where user_id is set
-- but accepted_at is still null (they already joined — they're owners)
UPDATE farm_members
SET accepted_at = COALESCE(joined_at, NOW())
WHERE role = 'owner'
  AND user_id IS NOT NULL
  AND accepted_at IS NULL;

-- Also back-fill any non-owner active members who slipped through
-- (they have a user_id so they clearly accepted at some point)
UPDATE farm_members
SET accepted_at = COALESCE(joined_at, NOW())
WHERE user_id IS NOT NULL
  AND accepted_at IS NULL;
