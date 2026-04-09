-- ── Heartbeat column ────────────────────────────────────────────
ALTER TABLE game_players
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── RPC: delete games with zero real players ─────────────────────
CREATE OR REPLACE FUNCTION cleanup_empty_games()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM games
  WHERE id NOT IN (
    SELECT DISTINCT game_id FROM game_players WHERE role = 'player'
  );
END;
$$;
