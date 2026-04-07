# Sudoku Lab

A multiplayer Sudoku game where friends can play together in real time.

## What it does

Players can create a game (choosing difficulty and options) which creates a game in the lobby.
Players can join any game in the lobby via a shareable game code or link. When the host starts
the game, all players get the same Sudoku puzzle and race to complete it. Players can see each
other's progress as it happens. The way that players see progress is with a mini-grid for each
opponent: gray = unfilled, green = correctly placed, red = incorrectly placed. Opponents see
green/red status only — they never see the actual digits another player has entered.

## Screens

1. **Home** — three buttons: Create Game, Join Game, Practice (solo)
2. **Lobby** — shows the game code/link for sharing, a list of players with ready status,
   and the host's chosen game options. Host sees a Start button (enabled once at least one
   other player is ready). Non-host players see a Ready toggle. Host can adjust options before
   starting.
3. **Game** — the Sudoku board with controls. Shows a timer and opponent mini-grids.
4. **Results** — shows finishing order, each player's time, and mistakes/hints used.
   Includes a Play Again button that returns all players to a fresh lobby with the same group.

## Game Options (set by host at game creation)

- **Difficulty:** Easy, Medium, Hard, Expert (default: Medium)
- **Mistake limit:** Off (unlimited) / 3 mistakes (default: Off). When enabled, a player who
  makes 3 incorrect cell placements is eliminated from the race but may continue solving for
  their own satisfaction.

## Input Controls

- **On-screen number pad:** digits 1–9, an Erase button, a Notes toggle, and an Undo button.
  Works for touch and mouse.
- **Keyboard:** digits 1–9, Backspace/Delete to erase, arrow keys to move between cells.
  Both input methods work simultaneously.

## Pencil Marks (Notes Mode)

A Notes toggle switches between definitive entry and pencil-mark entry. In Notes mode, pressing
a digit writes a small candidate number in the cell rather than a definitive answer. Notes are
private — opponents' mini-grids do not reflect notes. An auto-clear setting (in Settings)
optionally removes pencil marks for a digit when that digit is placed definitively anywhere in
the same row, column, or box.

## Undo

Each player has an Undo button (also bound to Ctrl+Z / Cmd+Z) that reverts their last action
(definitive entry or note). Undo is local only — it does not affect other players' views.
History depth: up to 20 steps.

## Hints

Each player gets 3 hints per game. Using a hint reveals the correct digit for the currently
selected cell. A hint costs +30 seconds added to the player's final time. A small indicator
is broadcast to all players when someone uses a hint (e.g., "Alex used a hint").

## Timer

- Counts up from 00:00, displayed prominently on each player's screen.
- Each player sees only their own elapsed time (final time includes any hint penalties).
- Pause is available in Practice (solo) mode only — pausing during a multiplayer race is
  not allowed.

## Conflict Highlighting (on the player's own board)

- **Duplicate highlighting:** If the same digit appears more than once in a row, column, or
  3×3 box, the conflicting cells are tinted red. This is the only error feedback on the
  player's own board — cells are not marked correct/incorrect beyond conflict detection.
- **Selection highlighting:** Tapping or clicking a cell lightly shades its entire row,
  column, and box, and highlights all other cells containing the same digit.
- Both highlights are toggleable in Settings.

## Cell Styling

- **Given (pre-filled) cells** are visually distinct from player-entered cells (e.g., bolder
  weight or a different color). Given cells are locked and cannot be edited.
- Player-entered cells show no correctness tint — only conflict highlighting applies.

## Opponent Mini-Grids

Each opponent's progress is shown as a small 9×9 grid:
- Opponent's name displayed above the grid.
- Completion percentage (e.g., "72%") displayed below the grid.
- Cell colors: gray = unfilled, green = correct placement, red = incorrect placement.
- Cells animate (pulse) when their state changes so players notice live activity.

## Finish States

- **Winning:** The first player to correctly fill the entire board wins. The board is validated
  server-side against the puzzle solution.
- **Continue after win:** Other players keep playing after a winner is announced so everyone
  can finish and see their final time.
- **Completion animation:** When a player finishes, a brief animated message appears showing
  their solving time and rank (e.g., "1st place — Solved in 4:32!").

## Results Screen

Shows:
- Final ranking of all players
- Each player's time (including hint penalties)
- Each player's mistake count and hints used
- A **Play Again** button that creates a new lobby with the same players and a fresh puzzle

## Practice Mode (Solo)

From the Home screen a player can start a solo game without a lobby. Shares the same board,
controls, and highlighting as multiplayer. Supports pause. No opponents, no race — just a
personal timer and a completion message when the puzzle is solved.

## Settings

Accessible via a panel on the game screen:
- Highlight duplicates (on/off, default: on)
- Highlight row/column/box on selection (on/off, default: on)
- Auto-clear notes when digit is placed (on/off, default: on)
- Sound effects (on/off, default: on)

## Realtime Behaviour

- Lobby updates live as players join and toggle ready.
- **What is synced:** each player's cell entries broadcast as correct/incorrect status only
  (green/red). The server validates each entry against the puzzle solution before broadcasting.
  Hint usage is also broadcast (name only, not the revealed digit).
- **What is not synced:** pencil marks, undo history, local highlights, cursor position.
- Results screen appears for all players as soon as any player completes the puzzle.

## Puzzle Source

Puzzles are drawn from a pre-generated puzzle bank stored in Supabase, tagged by difficulty.
Each puzzle record includes the starting grid and the complete solution (used for server-side
validation). This approach guarantees puzzle quality and accurate difficulty ratings.

## Style

Clean and modern. Dark background. Large, readable Sudoku grid.
Friendly and fun — not serious or corporate.
