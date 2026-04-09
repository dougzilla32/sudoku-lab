-- Add a display name to each game (cute auto-generated, not unique)
ALTER TABLE games ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
