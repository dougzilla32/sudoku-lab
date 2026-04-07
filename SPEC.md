# Sudoku Lab

A multiplayer Sudoku game where friends can play together in real time.

## What it does

Players can create a game and share a short join code with friends.
Everyone joins a lobby and waits. When the host starts the game,
all players get the same Sudoku puzzle and race to complete it.
Players can see each other's progress as it happens.

## Screens

1. **Home** — two buttons: Create Game and Join Game
2. **Lobby** — shows the join code and a list of players who have joined.
   Host sees a Start button. Other players wait.
3. **Game** — the Sudoku board. Shows a timer and a progress bar for
   each player. Highlights conflicts in real time.
4. **Results** — shows the finishing order when the puzzle is solved.

## Data

- `rooms` table — one row per game. Stores the join code, status
  (waiting / playing / finished), and the puzzle.
- `players` table — one row per player per game. Stores their name,
  which cells they've filled in, and their finish time.

## Realtime behaviour

- Lobby updates live as players join
- Board updates live as players fill in cells
- Results screen appears for all players when someone finishes

## Style

Clean and modern. Dark background. Large, readable Sudoku grid.
Friendly and fun — not serious or corporate.
