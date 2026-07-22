-- Migration 005: Add Stripe subscription fields to farms table
-- Run via: supabase db push  OR  psql $DATABASE_URL -f this_file.sql

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT    NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_plan       TEXT    NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Index for webhook lookups by Stripe customer
CREATE INDEX IF NOT EXISTS idx_farms_stripe_customer_id
  ON farms (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Valid subscription_status values:
--   trialing   — within 14-day free trial
--   active     — paid and current
--   past_due   — payment failed, grace period
--   canceled   — subscription ended
--   incomplete — checkout started but not completed

COMMENT ON COLUMN farms.stripe_customer_id      IS 'Stripe customer ID (cus_xxx)';
COMMENT ON COLUMN farms.subscription_status     IS 'trialing | active | past_due | canceled | incomplete';
COMMENT ON COLUMN farms.subscription_plan       IS 'starter | pro | enterprise';
COMMENT ON COLUMN farms.trial_ends_at           IS 'When the 14-day free trial expires';
COMMENT ON COLUMN farms.subscription_period_end IS 'Current billing period end (from Stripe)';
