-- ── Trigger: auto-manage games.empty_since ──────────────────────
-- After a player row is deleted: if no real players remain, stamp empty_since.
-- After a player row is inserted: if a real player now exists, clear empty_since.

CREATE OR REPLACE FUNCTION manage_game_empty_since()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = OLD.game_id AND role = 'player'
    ) THEN
      UPDATE games SET empty_since = now() WHERE id = OLD.game_id;
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.role = 'player' THEN
      UPDATE games SET empty_since = NULL WHERE id = NEW.game_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_game_empty_since ON game_players;
CREATE TRIGGER trg_game_empty_since
AFTER INSERT OR DELETE ON game_players
FOR EACH ROW EXECUTE FUNCTION manage_game_empty_since();
