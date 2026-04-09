-- ================================================================
-- Sudoku Lab — Database Schema
-- Run this in the Supabase dashboard: SQL Editor > New query
-- ================================================================

-- ── Tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS puzzles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  difficulty  TEXT        NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
  grid        TEXT        NOT NULL CHECK (char_length(grid) = 81),
  solution    TEXT        NOT NULL CHECK (char_length(solution) = 81),
  is_daily    BOOLEAN     NOT NULL DEFAULT false,
  daily_date  DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  difficulty    TEXT        NOT NULL DEFAULT 'medium'
                            CHECK (difficulty IN ('easy','medium','hard','expert')),
  mistake_limit INTEGER,    -- NULL = unlimited, 3 = 3 mistakes allowed
  status        TEXT        NOT NULL DEFAULT 'lobby'
                            CHECK (status IN ('lobby','active','finished')),
  puzzle_id     UUID        REFERENCES puzzles(id),
  started_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_players (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'player'
                            CHECK (role IN ('player','spectator')),
  joined_late   BOOLEAN     NOT NULL DEFAULT false,
  connected     BOOLEAN     NOT NULL DEFAULT true,
  cells         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  notes         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  hint_count    INTEGER     NOT NULL DEFAULT 0,
  mistake_count INTEGER     NOT NULL DEFAULT 0,
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS games_code_idx    ON games(code);
CREATE INDEX IF NOT EXISTS gp_game_id_idx    ON game_players(game_id);
CREATE INDEX IF NOT EXISTS puzzles_diff_idx  ON puzzles(difficulty);
CREATE INDEX IF NOT EXISTS puzzles_daily_idx ON puzzles(daily_date) WHERE is_daily = true;

-- ── Row Level Security ───────────────────────────────────────────

ALTER TABLE puzzles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "puzzles_public_read"  ON puzzles      FOR SELECT USING (true);
CREATE POLICY "games_public_read"    ON games        FOR SELECT USING (true);
CREATE POLICY "games_public_insert"  ON games        FOR INSERT WITH CHECK (true);
CREATE POLICY "games_public_update"  ON games        FOR UPDATE USING (true);
CREATE POLICY "gp_public_read"       ON game_players FOR SELECT USING (true);
CREATE POLICY "gp_public_insert"     ON game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "gp_public_update"     ON game_players FOR UPDATE USING (true);

-- ── Seed Puzzles ─────────────────────────────────────────────────
-- Easy and Expert are fully verified.
-- Medium and Hard are derived from Easy (same solution, fewer givens).
-- TODO: replace Medium and Hard with properly generated unique puzzles.

INSERT INTO puzzles (difficulty, grid, solution) VALUES

-- Easy — Wikipedia "Sudoku" article puzzle (30 givens, verified)
( 'easy',
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179' ),

-- Medium — derived from Easy, 25 givens (placeholder — TODO replace)
( 'medium',
  '530000000600195000098000060800060003400803000700020000060000280000410000000080079',
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179' ),

-- Hard — derived from Easy, 18 givens (placeholder — TODO replace)
( 'hard',
  '530000000000095000008000000800060003000803000700020000000000080000410000000080079',
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179' ),

-- Expert — Arto Inkala "World's Hardest Sudoku" 2010 (21 givens, verified)
( 'expert',
  '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
  '812753649943682175675491283154237896369845721287169534521974368438526917796318452' );
