# Implementation Phases

## Stack
- **Frontend:** React + Vite (port 3000, proxied to 8888 by Netlify)
- **Backend:** Netlify Functions (JS/TypeScript in `netlify/functions/`)
- **Database + Realtime:** Supabase (credentials in `.env`)
- **Deploy:** `/deploy` command (do not run build/deploy manually)

---

## Phase 1 — Schema + Practice Mode
> Goal: working solo Sudoku game. No multiplayer. Foundational schema locked in.

### Supabase Schema
- [x] `puzzles` table — `id`, `difficulty`, `grid` (81-char string, 0 = empty), `solution`
      (81-char string), `is_daily`, `daily_date` (nullable), `created_at`
- [x] `games` table — `id`, `code` (short shareable code), `difficulty`, `mistake_limit`,
      `status` (lobby | active | finished), `puzzle_id`, `started_at`, `created_at`
- [x] `game_players` table — `id`, `game_id`, `name`, `role` (player | spectator),
      `joined_late` (bool), `connected` (bool), `cells` (JSON: per-cell entries + correct flag),
      `notes` (JSON), `hint_count`, `mistake_count`, `finished_at`, `created_at`

### Puzzle Engine (React component, no backend needed)
- [x] 9×9 board rendering with given vs. player-entered cell styling
- [x] Cell selection with row/column/box highlight and same-digit highlight
- [x] On-screen number pad (digits 1–9, Erase, Notes toggle, Undo)
- [x] Keyboard input (digits, Backspace/Delete, arrow keys)
- [x] Definitive digit entry and conflict (duplicate) highlighting
- [x] Notes (pencil marks) mode
- [x] Undo (up to 20 steps, local only)
- [x] Keyboard suppression — tapping a cell never triggers native soft keyboard

### Practice Mode
- [x] Home screen with buttons: Create Game, Join Game, Practice, Daily Puzzle
      (Create/Join/Daily are stubs in Phase 1)
- [x] Player name prompt on first launch; name stored in localStorage
- [x] Practice flow: pick difficulty → load puzzle from Supabase → play
- [x] Timer (counts up, pause supported in Practice)
- [x] Hints (3 per game, +30s penalty, reveals correct digit for selected cell)
- [x] Completion detection + animated completion message
- [x] Settings panel: highlight duplicates, highlight selection, auto-clear notes, sound effects
      (sound toggle stored; actual sounds come in Phase 5)

---

## Phase 2 — Lobby + Basic Multiplayer
> Goal: full multiplayer loop — create, join, play, finish, results.

### Lobby
- [x] Create Game → generates short game code, inserts `games` row, navigates to Lobby
- [x] Join Game → enter code, join as player, navigate to Lobby
- [x] Lobby screen: game code + copy/share link, player list with ready toggles, game options
- [x] Any player can edit options; lobby shows "Alex changed difficulty to Hard" messages
- [x] Any player can press Start (enabled with ≥ 1 player present)
- [x] Lobby updates live via Supabase Realtime

### Multiplayer Game
- [x] On start: assign puzzle, set `games.status = active`, broadcast to all players
- [x] Shared game clock — starts when game starts, all players see the same elapsed time
- [x] Late join: player joins after start, gets fresh empty board, inherits current clock,
      flagged as "joined late"
- [x] Player cell entries validated client-side against `puzzles.solution`;
      result (correct/incorrect) stored in `game_players.cells` and broadcast via Realtime
- [x] Opponent mini-grids: gray/green/red per cell, name + completion % label
- [x] Mistake limit enforcement (if enabled): player eliminated at limit, may keep watching

### Finish + Results
- [x] Completion detected when all players have finished_at set
- [x] "Waiting for others" overlay shown to first finisher
- [x] Other players continue after first place is taken
- [x] Results screen: ranking, times (with hint penalties), mistakes, hints used,
      "joined late" flags
- [x] Play Again: creates new lobby, fresh puzzle

---

## Phase 3 — Resilience + Social
> Goal: handles real-world messiness; adds spectators and reactions.

### Reconnection
- [ ] Full player state (cells, notes, hint count, mistake count) persisted in Supabase
      in real time as moves are made
- [ ] Disconnected player's mini-grid goes dim with "disconnected" indicator for others
- [ ] On reconnect via game code: show Rejoin Game button, restore state, resume timer
- [ ] If player never returns: slot stays dim on Results screen
- [ ] Game persists on server 30 min after all players disconnect

### Spectator Mode
- [ ] Join via game code → choose Watch (spectator) or Play (player)
- [ ] Watch/Play choice is final — spectators cannot switch to player (they see all digits)
- [ ] Spectator view: all players' full boards (actual digits visible), live clock,
      opponent mini-grids, reactions
- [ ] Spectators listed in lobby and Results screen (not ranked)
- [ ] Up to 20 spectators per game

### Social
- [ ] Player name entry on first launch (stored in localStorage, editable from Home)
- [ ] Emoji reactions bar in game screen: 🔥 👏 😱 😂 💀 👀 🏆
- [ ] Reactions rate-limited to 1 per player per 3 seconds
- [ ] Floating emoji animation over sender's name/mini-grid, fades after ~2 seconds
- [ ] Reactions available to both players and spectators

---

## Phase 4 — Daily Puzzle + Sharing
> Goal: daily engagement hook and shareable results.

### Daily Puzzle
- [ ] Home screen "Daily Puzzle" button
- [ ] Server selects today's puzzle from `puzzles` where `is_daily = true`
      and `daily_date = today`
- [ ] Plays in Practice mode rules (solo, pause allowed)
- [ ] Completion triggers Share Result button

### Sharing
- [ ] Share Result available after any multiplayer game or Daily Puzzle completion
- [ ] Generates text card: title, time, hints/mistakes summary, 3×3 emoji grid
- [ ] 3×3 grid: one emoji per 3×3 box — 🟩 clean, 🟥 any mistake, 🟨 hint used;
      if both mistake and hint in same box, 🟨 wins
- [ ] Multiplayer card includes finishing rank (e.g., "1st of 4 players")
- [ ] Copies to clipboard; on mobile triggers native Web Share API

---

## Phase 5 — Polish
> Goal: sounds, animations, mobile, PWA.

### Sounds
- [ ] Implement all 10 sound effects (see SPEC.md Sound Effects table)
- [ ] Wire to Settings sound toggle
- [ ] Sounds: tick, thud, swoosh, 3-note chime, sparkle, distant fanfare, 4-note jingle,
      celebratory jingle, bloop (per-emoji pitch), welcome-back tone

### Celebration Animations
- [ ] Row/column/box completion: brief soft flash on the completed cell group
- [ ] Overtake indicator: subtle animation on opponent mini-grid when you pass their %
- [ ] "Comeback!" label on Results screen when the furthest-behind player wins

### Mobile Web
- [ ] `<meta viewport>` with `maximum-scale=1`
- [ ] `dvh` units for viewport height (Safari address bar fix); JS fallback
- [ ] `env(safe-area-inset-*)` padding for notch + home indicator
- [ ] Portrait layout: mini-grids in horizontal scrollable strip above board
- [ ] Landscape layout: board left, number pad + mini-grids right column
- [ ] Keyboard suppression: `inputmode="none"` / no native input on cell tap
- [ ] Touch targets: number pad ≥ 44×44px, reaction buttons ≥ 40×40px
- [ ] `-webkit-tap-highlight-color: transparent` on cells and buttons
- [ ] Android back button closes modals before navigating
- [ ] Animations use only `transform`/`opacity` (no layout thrash)
- [ ] Batch opponent mini-grid updates (accumulate, apply together)

### PWA
- [ ] Web App Manifest (name, icons, theme color, display: standalone)
- [ ] Minimal service worker for app shell caching + home screen installability
- [ ] Test install flow on iOS Safari and Android Chrome
