# Sudoku Lab

A multiplayer Sudoku game where friends can play together in real time.

## Overview

Players create a game (choosing difficulty and options), which appears in the public game browser.
Others can join from the browser or via a shareable game code. Any player in the lobby can start the game — there is no
designated host. All players receive the same puzzle and race to complete it. Players see each
other's progress via opponent mini-grids showing correct/incorrect status — but never the actual
digits another player entered. Spectators, however, can see all players' full boards.

---

## Screens

1. **Home** — buttons: Create Game, Join Game, Practice (solo), Daily Puzzle
2. **Join Game** — shows a live list of open lobbies (difficulty, code, player count); any row
   can be tapped to join instantly. Also includes a "Join by code" field for active or private
   games not shown in the browser.
3. **Lobby** — shows the game code/link, a player list with ready status, and the chosen game
   options. Any player can edit the options or press Start. The Start button is available as soon
   as at least 1 player is present. Players can join a game in progress directly from the lobby
   (or via the game code while a game is running).
4. **Game** — the Sudoku board with controls, a timer, opponent mini-grids, and a reactions bar.
5. **Results** — finishing order, each player's time, and mistakes/hints used. Includes a Play
   Again button and a Share Result button.

---

## Player Names

When a player first opens the app, they are prompted to enter a display name (e.g., "Alex").
The name is stored locally and reused across sessions. Players can change their name from the
Home screen. Names do not need to be unique across the app — they are just for display.

---

## Game Options

Any player in the lobby can adjust these before the game starts. When a player changes an
option, a brief message appears in the lobby for all players (e.g., "Alex changed difficulty
to Hard"):

- **Difficulty:** Easy, Medium, Hard, Expert (default: Medium)
- **Mistake limit:** Off (unlimited) / 3 mistakes (default: Off). When enabled, a player who
  makes 3 incorrect cell placements is eliminated from the race but may continue solving for
  personal satisfaction.

---

## Player Count

- **Players:** 1–8 per game (a single player can start and play solo via the lobby, or use
  Practice mode)
- **Spectators:** up to 20 spectators may watch any game in progress (see Spectator Mode)
- If a game is already in progress, new players may join late — they start with a fresh empty
  board but the game clock is shared, so their elapsed time is the same as everyone else's.
  They are flagged as "joined late" on the Results screen.

---

## Controls

### Input

- **On-screen number pad:** digits 1–9, an Erase button, a Notes toggle, and an Undo button.
  Works for touch and mouse.
- **Keyboard:** digits 1–9, Backspace/Delete to erase, arrow keys to move between cells.
  Both input methods work simultaneously.

### Notes (Pencil Marks)

The Notes toggle switches between definitive entry and pencil-mark entry. In Notes mode, pressing
a digit writes a small candidate number in the cell rather than a definitive answer. Notes are
private — opponents' mini-grids do not reflect notes.

An **auto-clear** setting (in Settings) optionally removes pencil marks for a digit when that
digit is placed definitively anywhere in the same row, column, or box.

### Undo

Each player has an Undo button (also bound to Ctrl+Z / Cmd+Z) that reverts their last action
(definitive entry or note). Undo is local only — it does not affect other players' views.
History depth: up to 20 steps.

### Hints

Each player gets 3 hints per game. Using a hint reveals the correct digit for the selected cell
and adds +30 seconds to the player's final time. A small notification is broadcast to all players
when someone uses a hint (e.g., "Alex used a hint") — the revealed digit is not shared.

---

## Board Visuals

### Cell Styling

- **Given (pre-filled) cells** are visually distinct from player-entered cells (e.g., bolder
  weight or different color). Given cells are locked and cannot be edited.
- Player-entered cells show no correctness tint — only conflict highlighting applies.

### Conflict Highlighting

- **Duplicate highlighting:** If the same digit appears more than once in a row, column, or
  3×3 box, the conflicting cells are tinted red. This is the only error feedback on the
  player's own board.
- **Selection highlighting:** Tapping or clicking a cell lightly shades its entire row, column,
  and box, and highlights all other cells containing the same digit.
- Both highlights are toggleable in Settings.

---

## Timer

- Counts up from 00:00, displayed prominently on each player's screen.
- Each player sees only their own elapsed time (final time includes any hint penalties).
- Pause is available in Practice (solo) mode only — pausing during a multiplayer race is not
  allowed.

---

## Multiplayer

### Opponent Mini-Grids

Each opponent's progress is shown as a small 9×9 grid:
- Opponent's name above the grid; completion percentage (e.g., "72%") below it.
- Cell colors: gray = unfilled, green = correct placement, red = incorrect placement.
- Cells animate (pulse) when their state changes so players notice live activity.

### Finish States

- **Winning:** The first player to correctly fill the entire board wins. The board is validated
  server-side against the puzzle solution.
- **Continue after win:** Other players keep playing after a winner is announced so everyone
  can finish and see their final time.
- **Completion animation:** When a player finishes, a brief animated overlay shows their solving
  time and rank (e.g., "1st place — Solved in 4:32!").

### Celebration Moments

Beyond the finish animation, small moments of delight fire during play:
- **Row / column / box complete:** a brief soft flash on the completed group of cells.
- **Passing an opponent:** a subtle "overtake" indicator when your completion % passes someone
  else's (e.g., a small arrow nudge on their mini-grid).
- **Comeback win:** if the player who was furthest behind wins, a special "Comeback!" label
  appears on the Results screen.

### Results Screen

Shows:
- Final ranking of all players (spectators are listed separately)
- Each player's time (including hint penalties)
- Each player's mistake count and hints used
- "Joined late" flag for any player who joined after the game started
- A **Play Again** button that creates a new lobby with the same players and a fresh puzzle
- A **Share Result** button (see Sharing below)

### Realtime Behavior

- Lobby updates live as players join, leave, and edit options.
- **What is synced:** each player's cell entries broadcast as correct/incorrect status only
  (green/red). The server validates each entry against the puzzle solution before broadcasting.
  Hint and reaction events are also broadcast. Results screen appears for all players and
  spectators as soon as any player completes the puzzle.
- **What is not synced:** pencil marks, undo history, local highlights, cursor position.

### Reconnection

Each player's full game state (cell entries, notes, timer, hint count) is persisted server-side
in real time. If a player loses their connection mid-game:
- Other players see their mini-grid go dim with a "disconnected" indicator.
- When the player reconnects (same device or a new one, using the game code), they are shown
  a **Rejoin Game** button that restores their exact state and resumes their timer.
- If a player never returns, their slot remains visible but dim on the Results screen.

### Game Persistence

There is no designated host. A game persists on the server as long as at least one active player
or spectator is connected. If all players disconnect, the game is kept alive for 30 minutes so
players can rejoin.

---

## Spectator Mode

Any number of viewers (up to 20) can join a game as a spectator:
- Spectators see **each player's full board** including the actual digits entered — they are
  watching, not competing, so there is no reason to hide the numbers.
- Spectators also see the live game clock and all opponent mini-grids.
- Spectators can send emoji reactions visible to all players and spectators.
- Spectators are listed in the lobby and on the Results screen, but are not ranked.
- To join as a spectator, enter the game code and choose "Watch" instead of "Play".
- Because spectators can see all digits, switching from spectator to player is not allowed —
  it would give an unfair advantage. The Watch/Play choice is final at join time.

---

## Emoji Reactions

During a game (and in the lobby), any player or spectator can fire a quick emoji reaction. A
small floating emoji pops up over the sender's name/mini-grid and fades out after ~2 seconds.
Reactions are purely cosmetic and do not affect gameplay.

Suggested reaction palette (7 options): 🔥 👏 😱 😂 💀 👀 🏆

Triggered via a reactions bar on the game screen (single tap/click). Reactions are rate-limited
to one per player per 3 seconds to prevent spam.

---

## Sound Effects

All sounds are short, soft, and friendly — not harsh or competitive. Master toggle in Settings.

| Event | Sound |
|---|---|
| Place a digit (no conflict) | Soft "tick" — a quiet, satisfying tap |
| Conflict detected | Low, gentle "thud" — subtle, not punishing |
| Erase a cell | Faint "swoosh" |
| Complete a row, column, or box | Ascending 3-note chime (quick, bright) |
| Use a hint | Soft "sparkle" shimmer (2–3 descending tones) |
| Opponent finishes | Distant fanfare — audible but not intrusive |
| You finish (any rank) | Warm 4-note completion jingle |
| You win (1st place) | Fuller celebratory jingle (~2 sec) |
| Emoji reaction received | Friendly "bloop" — different pitch per emoji |
| Rejoin game | Gentle "welcome back" ascending tone |

---

## Daily Puzzle

A single puzzle is available each day, the same for every player worldwide:
- Accessible from the Home screen as "Daily Puzzle".
- Plays in solo mode (no lobby, no opponents), with Practice mode rules (pause allowed).
- After completing, a **Share Result** button generates a shareable card (see Sharing).
- Difficulty is fixed per day (rotates on a weekly schedule: Easy → Medium → Hard → Expert →
  Medium → Hard → Medium).

---

## Sharing

After finishing a multiplayer game or the Daily Puzzle, the Share Result button generates a
compact shareable text card:

```
Sudoku Lab – Daily Puzzle (Apr 8)
Solved in 4:32 ⭐ No hints · 1 mistake

🟩🟥🟩
🟩🟩🟩
🟩🟩🟩
```

The emoji grid is 3×3 — one emoji per 3×3 box. A box is 🟩 if all its player-filled cells were
placed correctly, 🟥 if any mistakes were made in that box, or 🟨 if a hint was used in that
box. If both a mistake and a hint occurred in the same box, 🟨 wins — the hint is the more
notable event. Given (pre-filled) cells do not affect the box color.

For multiplayer, the card also shows finishing rank (e.g., "1st of 4 players").
The card is copied to clipboard. On mobile it also triggers the native share sheet.

---

## Practice Mode (Solo)

From the Home screen a player can start a solo game without a lobby. Shares the same board,
controls, and highlighting as multiplayer. Supports pause. No opponents, no race — just a
personal timer and a completion message when the puzzle is solved.

---

## Settings

Accessible via a panel on the game screen:
- Highlight duplicates (on/off, default: on)
- Highlight row/column/box on selection (on/off, default: on)
- Auto-clear notes when digit is placed (on/off, default: on)
- Sound effects (on/off, default: on)

---

## Puzzle Source

Puzzles are drawn from a pre-generated puzzle bank stored in Supabase, tagged by difficulty.
Each puzzle record includes the starting grid and the complete solution (used for server-side
validation). Daily puzzles are a separate tagged subset. This approach guarantees puzzle quality
and accurate difficulty ratings.

---

## Mobile Web

The game must be fully playable on mobile browsers (iOS Safari, Android Chrome) without
installing an app.

### Viewport and Layout

- Set `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
  to prevent accidental pinch-zoom on the grid.
- Use `dvh` (dynamic viewport height) units instead of `vh` to account for Safari's collapsing
  address bar. Fall back to a JS-measured height if `dvh` is not supported.
- Add `env(safe-area-inset-*)` padding so content is not obscured by notches or the iOS home
  indicator.
- The grid must fill nearly the full screen width on phones (≥ 320px). Cells must be at least
  36px to be reliably tappable.

### Portrait vs. Landscape

- **Portrait (primary):** board stacks above the number pad. Opponent mini-grids appear in a
  horizontally scrollable strip above the board.
- **Landscape:** board shifts left, number pad and mini-grids appear in a right-side column.
  Timer and reactions bar move to the top strip.

### Keyboard Suppression

Tapping a Sudoku cell must never trigger the device's native software keyboard. Achieve this by:
- Not using a native `<input>` for cell focus, or using one with `inputmode="none"` and
  `readonly` to capture keyboard hardware events without popping the soft keyboard.
- Handling all digit input through the on-screen number pad and the hardware keyboard listener.

### Touch Targets

- Number pad buttons must be at least 44×44px (Apple HIG minimum).
- The Notes toggle and Undo button should be at least 44px tall.
- Reactions bar emoji buttons: at least 40×40px with adequate spacing to prevent mis-taps.

### iOS-Specific

- `position: fixed` elements (settings panel, reactions bar) may shift when the soft keyboard
  appears — avoid relying on fixed positioning for any element that should stay visible if a
  keyboard could be open.
- Test scroll behavior on Safari: the grid itself should not scroll; only designated scroll
  containers (opponent strip, settings panel) should scroll.
- Disable iOS tap highlight (`-webkit-tap-highlight-color: transparent`) on interactive cells
  and buttons to keep the UI clean.

### Android-Specific

- Test on Chrome for Android with both portrait and landscape orientations.
- The Android back button should close modals/panels before navigating away — intercept the
  `popstate` event where applicable.

### Performance

- Cell pulse animations must use only `transform` and `opacity` (no layout-triggering
  properties) so they stay smooth on mid-range devices.
- Opponent mini-grid updates should be batched — do not trigger a re-render per cell per
  message; accumulate updates and apply them together.

### PWA (Progressive Web App)

Add a Web App Manifest and a minimal service worker so the game can be installed to the home
screen on both iOS and Android. This gives a full-screen, app-like feel with no address bar.
Offline support is not required — the service worker is only for installability and caching
the app shell.

---

## Style

Clean and modern. Dark background. Large, readable Sudoku grid.
Friendly and fun — not serious or corporate.
