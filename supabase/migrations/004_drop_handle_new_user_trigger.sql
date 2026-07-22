-- Migration 004: Drop handle_new_user trigger
-- Run date: 2026-06-08
--
-- Reason: The handle_new_user() trigger was firing on auth.users INSERT
-- and attempting to auto-create a farm row. It caused "Database error saving
-- new user" during signup because of constraint/RLS issues in the trigger body.
--
-- Farm creation is now handled explicitly via POST /api/farms (called by the
-- setup wizard after the user completes their farm configuration).
--
-- Safe to run multiple times (IF EXISTS guards).

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
