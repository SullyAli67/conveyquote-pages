-- Phase 1 of Type 2 firm-quoting product.
-- Adds dual-role flags to panel_firms so the same row can be both a
-- ConveyQuote panel firm (Type 1, receives allocations from the central
-- engine) and a SaaS quoting firm (Type 2, issues its own quotes via the
-- new calculation engine).
--
-- Defaults preserve existing behaviour: every existing row stays a panel
-- firm and is NOT enabled for the SaaS product until explicitly flipped.
--
-- Idempotency note: SQLite does not support ALTER TABLE ... ADD COLUMN
-- IF NOT EXISTS. This file is intended to be applied exactly once via
-- `wrangler d1 migrations apply`, which tracks applied migrations in the
-- d1_migrations table and skips files that have already run. If you need
-- to manually re-check, run `PRAGMA table_info(panel_firms);` first.

ALTER TABLE panel_firms ADD COLUMN is_panel_firm INTEGER NOT NULL DEFAULT 1;
ALTER TABLE panel_firms ADD COLUMN is_saas_firm INTEGER NOT NULL DEFAULT 0;
