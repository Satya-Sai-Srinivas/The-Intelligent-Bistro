-- Prerequisite for npm run seed-translations and frontend menu localization.
-- Run once in the Supabase SQL editor (or via CLI migration).

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT NULL;
