#!/bin/bash

# ============================================================
# start-wsl.sh — Run at the beginning of every session (Windows)
# Opens two Windows Terminal panes and starts the dev environment.
# Run from inside Ubuntu/WSL2.
# ============================================================

# ── Find project root ─────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

die() { echo -e "\n  ${RED}Error:${RESET} $1\n"; exit 1; }

# ── Sanity checks ─────────────────────────────────────────────

[[ -f "$PROJECT_DIR/netlify.toml" ]] || \
    die "Could not find netlify.toml in $PROJECT_DIR — is this the right project folder?"

[[ -f "$PROJECT_DIR/.netlify/state.json" ]] || \
    die "This project hasn't been set up yet. Run ${BOLD}bash bin/setup.sh${RESET} first."

[[ -f "$PROJECT_DIR/.env" ]] || \
    die "No .env file found. Run ${BOLD}bash bin/setup.sh${RESET} first."

# ── Open Windows Terminal panes ───────────────────────────────

# Open Windows Terminal with two panes side by side:
# Left: Netlify dev server
# Right: Claude Code
/mnt/c/Windows/System32/cmd.exe /c "wt.exe -w 0 new-tab --title \"Dev Server\" -p \"Ubuntu\" bash -c \"cd '$PROJECT_DIR' && echo '' && echo '  🌐  Netlify dev server — starting...' && echo '  Watch here for your shareable live URL.' && echo '' && netlify dev --live; exec bash\" ; split-pane --vertical --size 0.65 --title \"Claude Code\" -p \"Ubuntu\" bash -c \"cd '$PROJECT_DIR' && echo '' && echo '  🤖  Claude Code — starting...' && echo '' && claude; exec bash\""

# ── Open browser ──────────────────────────────────────────────

sleep 3
/mnt/c/Windows/System32/cmd.exe /c "start http://localhost:8888"

echo ""
echo "  Dev environment starting up in Windows Terminal."
echo "  Left pane:  Netlify dev server"
echo "  Right pane: Claude Code"
echo ""
echo "  Wait ~15 seconds for a shareable live URL to appear in the left pane."
echo ""
