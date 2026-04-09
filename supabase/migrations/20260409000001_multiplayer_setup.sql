-- ================================================================
-- Phase 2: Multiplayer setup
-- ================================================================

-- Ready toggle for lobby
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS ready BOOLEAN NOT NULL DEFAULT false;

-- Full replica identity so UPDATE payloads include all columns
ALTER TABLE games        REPLICA IDENTITY FULL;
ALTER TABLE game_players REPLICA IDENTITY FULL;

-- Enable Supabase Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
