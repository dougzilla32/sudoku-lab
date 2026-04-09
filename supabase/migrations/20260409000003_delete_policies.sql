-- Allow players to delete their own rows when leaving a game
CREATE POLICY "gp_public_delete" ON game_players FOR DELETE USING (true);

-- Allow deletion of games (needed for stale lobby cleanup)
CREATE POLICY "games_public_delete" ON games FOR DELETE USING (true);

-- Track when a lobby becomes empty so we can clean it up
ALTER TABLE games ADD COLUMN IF NOT EXISTS empty_since TIMESTAMPTZ;
