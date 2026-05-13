-- Phase 4 of Type 2 firm-quoting product.
-- Adds firm branding columns to panel_firms so SaaS-enabled firms can
-- white-label the generated PDF with their own logo + contact block.
--
-- Logo storage: brand_logo_key references an object in the
-- FIRM_LOGOS_BUCKET R2 bucket (key shape: firm-logos/<firm_id>/<ts>-<file>).
-- The binary lives in R2, not D1 — this column only stores the key.
--
-- Idempotency note: SQLite does not support ALTER TABLE ... ADD COLUMN
-- IF NOT EXISTS. This file is intended to be applied exactly once via
-- `wrangler d1 migrations apply`, which tracks applied migrations in the
-- d1_migrations table and skips files that have already run. If you need
-- to manually re-check, run `PRAGMA table_info(panel_firms);` first.
--
-- All columns nullable / default NULL — firms without branding fall back
-- to the ConveyQuote-only PDF template (no regression from Phase 3).

ALTER TABLE panel_firms ADD COLUMN brand_display_name TEXT;
ALTER TABLE panel_firms ADD COLUMN brand_address TEXT;
ALTER TABLE panel_firms ADD COLUMN brand_phone TEXT;
ALTER TABLE panel_firms ADD COLUMN brand_email TEXT;
ALTER TABLE panel_firms ADD COLUMN brand_logo_key TEXT;
