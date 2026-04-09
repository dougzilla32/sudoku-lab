#!/bin/zsh

# ============================================================
# start.sh — Run at the beginning of every session
# Opens two iTerm2 windows side by side and starts
# the dev environment.
# ============================================================

# ── Delegate to Windows version if running under WSL ─────────

if [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
  exec bash "$(cd "$(dirname "$0")" && pwd)/windows/start-wsl.sh" "$@"
fi

# ── Find project root ─────────────────────────────────────────

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"

RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

die() { echo "\n  ${RED}Error:${RESET} $1\n"; exit 1 }

# ── Sanity checks ─────────────────────────────────────────────

[[ -f "$PROJECT_DIR/netlify.toml" ]] || \
  die "Could not find netlify.toml in $PROJECT_DIR — is this the right project folder?"

[[ -f "$PROJECT_DIR/.netlify/state.json" ]] || \
  die "This project hasn't been set up yet. Run ${BOLD}zsh bin/setup.sh${RESET} first."

[[ -f "$PROJECT_DIR/.env" ]] || \
  die "No .env file found. Run ${BOLD}zsh bin/setup.sh${RESET} first."

if ! open -Ra "iTerm" 2>/dev/null; then
  die "iTerm2 is not installed. Run ${BOLD}zsh bin/install.sh${RESET} first."
fi

# ── Get screen dimensions ─────────────────────────────────────

SCREEN_INFO=$(osascript -e 'tell application "Finder" to get bounds of window of desktop')
SCREEN_W=$(echo $SCREEN_INFO | awk -F',' '{print $3}' | tr -d ' ')
SCREEN_H=$(echo $SCREEN_INFO | awk -F',' '{print $4}' | tr -d ' ')

SPLIT_35=$((SCREEN_W * 35 / 100))
SPLIT_65=$((SCREEN_W * 65 / 100))
MENU_BAR=25
WIN_H=$((SCREEN_H - MENU_BAR))

# ── Open browser first so iTerm2 windows end up on top ──────────

open "http://localhost:8888"
sleep 1

# ── Open iTerm2 windows ───────────────────────────────────────

# If iTerm2 isn't running yet, give it a moment to initialize before we create windows
if ! pgrep -x iTerm2 > /dev/null; then
  open -a iTerm --hide
  sleep 1
fi

# Left window — Netlify dev server
osascript << APPLESCRIPT
tell application "iTerm"
  activate
  set leftWin to (create window with default profile)
  delay 1
  tell current session of leftWin
    write text "cd \"${PROJECT_DIR}\""
    delay 0.3
    write text "netlify dev --live"
  end tell
  set bounds of leftWin to {0, ${MENU_BAR}, ${SPLIT_35}, $((MENU_BAR + WIN_H))}
end tell
APPLESCRIPT

sleep 0.5

# Right window — Claude Code
osascript << APPLESCRIPT
tell application "iTerm"
  set rightWin to (create window with default profile)
  delay 1
  tell current session of rightWin
    write text "cd \"${PROJECT_DIR}\""
    delay 0.3
    write text "claude"
  end tell
  set bounds of rightWin to {${SPLIT_35}, ${MENU_BAR}, ${SCREEN_W}, $((MENU_BAR + WIN_H))}
end tell
APPLESCRIPT

echo ""
echo "  Dev environment starting up in iTerm2."
echo "  Left window:  Netlify dev server"
echo "  Right window: Claude Code"
echo ""
echo "  Wait ~15 seconds for a shareable live URL to appear in the left window."
echo ""
