#!/bin/zsh

# ============================================================
# install.sh — Run once ever on this machine (or to update)
# Installs software, logs in to accounts, and optionally
# runs setup.sh. Safe to run multiple times.
# ============================================================

# ── Delegate to Windows version if running under WSL ─────────

if [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
  exec bash "$(cd "$(dirname "$0")" && pwd)/windows/install-wsl.sh" "$@"
fi

# ── Find project root ─────────────────────────────────────────

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

print_header() { echo "\n${BOLD}${BLUE}── $1${RESET}" }
print_ok()     { echo "  ${GREEN}✓${RESET}  $1" }
print_warn()   { echo "  ${YELLOW}!${RESET}  $1" }
print_missing(){ echo "  ${RED}✗${RESET}  $1" }
print_info()   { echo "     $1" }
print_problem(){ echo "  ${RED}⚠${RESET}  $1" }

# ── Helpers ───────────────────────────────────────────────────

brew_has()      { brew list --formula 2>/dev/null | grep -q "^${1}$"; }
brew_cask_has() { brew list --cask    2>/dev/null | grep -q "^${1}$"; }

# Node.js helper scripts are in bin/
JSSCRIPT="$SCRIPT_DIR/_json_check.js"

# ════════════════════════════════════════════════════════════
# PHASE 1 — Software checks
# ════════════════════════════════════════════════════════════

print_header "Checking your system"
echo ""

ACTIONS=()
WARNINGS=()

# ── Homebrew ──────────────────────────────────────────────────

if command -v brew &>/dev/null; then
  print_ok "Homebrew"
else
  print_missing "Homebrew — not installed"
  ACTIONS+=("install_homebrew")
fi

# ── Node.js ───────────────────────────────────────────────────

REQUIRED_NODE="20.12.2"
if command -v node &>/dev/null; then
  CURRENT_NODE=$(node --version | sed 's/v//')
  NODE_PATH=$(which node)
  if brew_has node; then
    BREW_NODE=$(brew info node --json 2>/dev/null | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(d[0]['versions']['stable'])" 2>/dev/null)
    if [[ -n "$BREW_NODE" && "$CURRENT_NODE" != "$BREW_NODE"* ]]; then
      print_warn "Node.js — $CURRENT_NODE installed, $BREW_NODE available"
      ACTIONS+=("upgrade_node:$CURRENT_NODE:$BREW_NODE")
    else
      print_ok "Node.js $CURRENT_NODE (Homebrew)"
    fi
  else
    print_warn "Node.js $CURRENT_NODE — installed but not via Homebrew"
    print_info "    Path: $NODE_PATH"
    WARNINGS+=("node_not_homebrew:$NODE_PATH")
    if [[ "$(printf '%s\n' "$REQUIRED_NODE" "$CURRENT_NODE" | sort -V | head -1)" != "$REQUIRED_NODE" ]]; then
      print_problem "Version $CURRENT_NODE is too old — need $REQUIRED_NODE+"
      ACTIONS+=("install_node_homebrew:$CURRENT_NODE")
    fi
  fi
else
  print_missing "Node.js — not installed"
  ACTIONS+=("install_node")
fi

# ── Claude Code ───────────────────────────────────────────────

if command -v claude &>/dev/null; then
  CLAUDE_PATH=$(which claude)
  if brew_has claude || brew_cask_has claude || \
     [[ "$CLAUDE_PATH" == /opt/homebrew/* ]] || \
     [[ "$CLAUDE_PATH" == /usr/local/Cellar/* ]] || \
     [[ "$CLAUDE_PATH" == /usr/local/Caskroom/* ]]; then
    print_problem "Claude Code — installed via Homebrew (needs to be replaced)"
    print_info "    The Homebrew version lags behind and conflicts with auto-updates."
    print_info "    Path: $CLAUDE_PATH"
    ACTIONS+=("replace_claude_homebrew")
  else
    print_ok "Claude Code (native installer, auto-updates)"
  fi
else
  print_missing "Claude Code — not installed"
  ACTIONS+=("install_claude")
fi

# ── Netlify CLI ───────────────────────────────────────────────

if command -v netlify &>/dev/null; then
  CURRENT_NETLIFY=$(netlify --version 2>/dev/null | awk '{print $1}' | sed 's/netlify-cli\///')
  LATEST_NETLIFY=$(npm view netlify-cli version 2>/dev/null)
  if [[ -n "$LATEST_NETLIFY" && "$CURRENT_NETLIFY" != "$LATEST_NETLIFY" ]]; then
    print_warn "Netlify CLI — $CURRENT_NETLIFY installed, $LATEST_NETLIFY available"
    ACTIONS+=("upgrade_netlify:$CURRENT_NETLIFY:$LATEST_NETLIFY")
  else
    print_ok "Netlify CLI $CURRENT_NETLIFY"
  fi
else
  print_missing "Netlify CLI — not installed"
  ACTIONS+=("install_netlify")
fi

# ── Supabase CLI ──────────────────────────────────────────────

if command -v supabase &>/dev/null; then
  CURRENT_SUPA=$(SUPABASE_NO_UPDATE_CHECK=1 supabase --version 2>/dev/null | awk '{print $NF}')
  SUPA_PATH=$(which supabase)
  if brew_has supabase; then
    LATEST_SUPA=$(brew info supabase/tap/supabase --json 2>/dev/null | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(d[0]['versions']['stable'])" 2>/dev/null)
    if [[ -n "$LATEST_SUPA" && "$CURRENT_SUPA" != "$LATEST_SUPA" ]]; then
      print_warn "Supabase CLI — $CURRENT_SUPA installed, $LATEST_SUPA available"
      ACTIONS+=("upgrade_supabase:$CURRENT_SUPA:$LATEST_SUPA")
    else
      print_ok "Supabase CLI $CURRENT_SUPA (Homebrew)"
    fi
  else
    print_warn "Supabase CLI $CURRENT_SUPA — installed but not via Homebrew"
    print_info "    Path: $SUPA_PATH"
    print_info "    Homebrew is the recommended install method."
    WARNINGS+=("supabase_not_homebrew:$SUPA_PATH")
    ACTIONS+=("replace_supabase_homebrew:$CURRENT_SUPA")
  fi
else
  print_missing "Supabase CLI — not installed"
  ACTIONS+=("install_supabase")
fi

# ── MacDown 3000 ──────────────────────────────────────────────

if brew_cask_has macdown-3000 || [[ -d "/Applications/MacDown 3000.app" ]]; then
  print_ok "MacDown 3000 (Markdown viewer)"
elif brew_cask_has macdown || [[ -d "/Applications/MacDown.app" ]]; then
  print_problem "MacDown — old deprecated version installed (needs to be replaced)"
  print_info "    The old MacDown is being discontinued. MacDown 3000 is its replacement."
  ACTIONS+=("replace_macdown")
else
  print_missing "MacDown 3000 — not installed"
  ACTIONS+=("install_macdown")
fi

# ── iTerm2 ────────────────────────────────────────────────────

if brew_cask_has iterm2 || [[ -d "/Applications/iTerm.app" ]]; then
  print_ok "iTerm2 (terminal)"
else
  print_missing "iTerm2 — not installed"
  ACTIONS+=("install_iterm2")
fi

# ── Run installs if needed ────────────────────────────────────

echo ""
if [[ ${#ACTIONS[@]} -gt 0 ]]; then

  print_header "Here's what needs to happen"
  echo ""

  for action in "${ACTIONS[@]}"; do
    case "${action%%:*}" in
      install_homebrew)
        print_info "• Install Homebrew (Mac package manager)" ;;
      install_node)
        print_info "• Install Node.js via Homebrew" ;;
      install_node_homebrew)
        parts=(${(s/:/)action})
        print_info "• Install Node.js via Homebrew (replaces non-Homebrew version ${parts[2]})" ;;
      upgrade_node)
        parts=(${(s/:/)action})
        print_info "• Upgrade Node.js ${parts[2]} → ${parts[3]}" ;;
      replace_claude_homebrew)
        print_info "• Remove Homebrew Claude Code and install official native version" ;;
      install_claude)
        print_info "• Install Claude Code (official native installer, auto-updates)" ;;
      install_netlify)
        print_info "• Install Netlify CLI via npm" ;;
      upgrade_netlify)
        parts=(${(s/:/)action})
        print_info "• Upgrade Netlify CLI ${parts[2]} → ${parts[3]}" ;;
      replace_supabase_homebrew)
        parts=(${(s/:/)action})
        print_info "• Remove non-Homebrew Supabase CLI ${parts[2]}, install via Homebrew" ;;
      install_supabase)
        print_info "• Install Supabase CLI via Homebrew" ;;
      upgrade_supabase)
        parts=(${(s/:/)action})
        print_info "• Upgrade Supabase CLI ${parts[2]} → ${parts[3]}" ;;
      install_macdown)
        print_info "• Install MacDown 3000 (Markdown viewer)" ;;
      replace_macdown)
        print_info "• Remove old MacDown, install MacDown 3000" ;;
      install_iterm2)
        print_info "• Install iTerm2 (terminal for Claude Code)" ;;
    esac
  done

  echo ""
  echo -n "${BOLD}Proceed with all of the above? [y/N] ${RESET}"
  read -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "\nAborted. Nothing was changed."
    exit 0
  fi

  echo ""

  for action in "${ACTIONS[@]}"; do
    case "${action%%:*}" in

      install_homebrew)
        print_header "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ -f /opt/homebrew/bin/brew ]]; then
          eval "$(/opt/homebrew/bin/brew shellenv)"
          echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        fi
        print_ok "Homebrew installed"
        ;;

      install_node | install_node_homebrew)
        print_header "Installing Node.js via Homebrew..."
        brew install node
        print_ok "Node.js installed"
        ;;

      upgrade_node)
        print_header "Upgrading Node.js..."
        brew upgrade node
        print_ok "Node.js upgraded"
        ;;

      replace_claude_homebrew)
        print_header "Replacing Homebrew Claude Code with native version..."
        brew uninstall --cask claude-code 2>/dev/null || true
        brew uninstall claude 2>/dev/null || true
        # Remove any stray binary left behind
        CLAUDE_PATH=$(which claude 2>/dev/null)
        if [[ "$CLAUDE_PATH" == /opt/homebrew/* || "$CLAUDE_PATH" == /usr/local/Cellar/* || "$CLAUDE_PATH" == /usr/local/Caskroom/* ]]; then
          rm -f "$CLAUDE_PATH"
        fi
        print_ok "Homebrew version removed"
        curl -fsSL https://claude.ai/install.sh | bash
        print_ok "Native Claude Code installed"
        ;;

      install_claude)
        print_header "Installing Claude Code..."
        curl -fsSL https://claude.ai/install.sh | bash
        print_ok "Claude Code installed"
        ;;

      install_netlify)
        print_header "Installing Netlify CLI..."
        npm install -g netlify-cli
        print_ok "Netlify CLI installed"
        ;;

      upgrade_netlify)
        print_header "Upgrading Netlify CLI..."
        npm install -g netlify-cli@latest
        print_ok "Netlify CLI upgraded"
        ;;

      replace_supabase_homebrew)
        print_header "Replacing Supabase CLI with Homebrew version..."
        npm uninstall -g supabase 2>/dev/null || true
        brew install supabase/tap/supabase
        print_ok "Supabase CLI installed via Homebrew"
        ;;

      install_supabase)
        print_header "Installing Supabase CLI..."
        brew install supabase/tap/supabase
        print_ok "Supabase CLI installed"
        ;;

      upgrade_supabase)
        print_header "Upgrading Supabase CLI..."
        brew upgrade supabase
        print_ok "Supabase CLI upgraded"
        ;;

      install_macdown)
        print_header "Installing MacDown 3000..."
        brew install --cask macdown-3000
        print_ok "MacDown 3000 installed"
        ;;

      replace_macdown)
        print_header "Replacing old MacDown with MacDown 3000..."
        brew uninstall --cask macdown
        print_ok "Old MacDown removed"
        brew install --cask macdown-3000
        print_ok "MacDown 3000 installed"
        ;;

      install_iterm2)
        print_header "Installing iTerm2..."
        brew install --cask iterm2
        print_ok "iTerm2 installed"
        ;;

    esac
  done

else
  print_header "All software is up to date"
  echo ""
fi

# ════════════════════════════════════════════════════════════
# PHASE 1.5 — iTerm2 font preference
# ════════════════════════════════════════════════════════════

if [[ -d "/Applications/iTerm.app" ]] || brew_cask_has iterm2; then
  CURRENT_FONT=$(defaults read com.googlecode.iterm2 2>/dev/null | \
    grep '"Normal Font"' | head -1 | sed 's/.*= "//;s/";//')
  TARGET_FONT="Monaco 14"

  if [[ -n "$CURRENT_FONT" && "$CURRENT_FONT" != "$TARGET_FONT" ]]; then
    print_header "iTerm2 font"
    echo ""
    print_info "Current setting: ${BOLD}${CURRENT_FONT}${RESET}"
    print_info "Recommended:     ${BOLD}${TARGET_FONT}${RESET}"
    print_info "A slightly larger font makes Claude Code easier to read."
    echo ""
    echo -n "${BOLD}Update iTerm2 font to Monaco 14? [y/N] ${RESET}"
    read -r FONT_CONFIRM
    if [[ "$FONT_CONFIRM" =~ ^[Yy]$ ]]; then
      PLIST="$HOME/Library/Preferences/com.googlecode.iterm2.plist"
      # Count profiles in New Bookmarks array
      PROFILE_COUNT=$(/usr/libexec/PlistBuddy -c "Print :New\ Bookmarks" "$PLIST" 2>/dev/null | grep -c "Dict {" || echo 0)
      for i in $(seq 0 $((PROFILE_COUNT - 1))); do
        /usr/libexec/PlistBuddy -c "Set :New\ Bookmarks:${i}:Normal\ Font Monaco 14" "$PLIST" 2>/dev/null || true
      done
      # Flush preferences cache so iTerm2 picks up the change
      killall cfprefsd 2>/dev/null || true
      print_ok "iTerm2 font set to Monaco 14"
    else
      print_info "Skipped — font unchanged."
    fi
    echo ""
  fi
fi

# ════════════════════════════════════════════════════════════
# PHASE 2 — Account logins
# ════════════════════════════════════════════════════════════

print_header "Checking account logins"
echo ""

LOGIN_ACTIONS=()

# Claude
if command -v claude &>/dev/null; then
  if claude auth status 2>/dev/null | grep -q '"loggedIn": true'; then
    CLAUDE_EMAIL=$(claude auth status 2>/dev/null | grep '"email"' | awk -F'"' '{print $4}')
    print_ok "Claude — logged in ($CLAUDE_EMAIL)"
  else
    print_missing "Claude — not logged in"
    LOGIN_ACTIONS+=("login_claude")
  fi
else
  print_warn "Claude — not available yet (open a new terminal and run this script again)"
fi

# Netlify
if command -v netlify &>/dev/null; then
  if netlify status 2>/dev/null | grep -q "Email:"; then
    NETLIFY_USER=$(netlify status 2>/dev/null | grep "Email:" | awk '{print $2}')
    print_ok "Netlify — logged in ($NETLIFY_USER)"
  else
    print_missing "Netlify — not logged in"
    LOGIN_ACTIONS+=("login_netlify")
  fi
else
  print_warn "Netlify — not available yet (open a new terminal and run this script again)"
fi

# Supabase
if command -v supabase &>/dev/null; then
  if SUPABASE_NO_UPDATE_CHECK=1 supabase projects list --output json 2>/dev/null | \
    node "$JSSCRIPT"; then
    print_ok "Supabase — logged in"
  else
    print_missing "Supabase — not logged in"
    LOGIN_ACTIONS+=("login_supabase")
  fi
else
  print_warn "Supabase — not available yet (open a new terminal and run this script again)"
fi

echo ""
if [[ ${#LOGIN_ACTIONS[@]} -eq 0 ]]; then
  print_header "All accounts are logged in"
  echo ""
else
  print_header "Logins needed"
  echo ""
  for action in "${LOGIN_ACTIONS[@]}"; do
    case "$action" in
      login_claude)   print_info "• Log in to Claude (opens your browser)" ;;
      login_netlify)  print_info "• Log in to Netlify (opens your browser)" ;;
      login_supabase) print_info "• Log in to Supabase (opens your browser)" ;;
    esac
  done

  echo ""
  echo -n "${BOLD}Proceed with logins? [y/N] ${RESET}"
  read -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "\nSkipped. Run this script again when you're ready to log in."
    echo ""
    exit 0
  fi

  for action in "${LOGIN_ACTIONS[@]}"; do
    case "$action" in
      login_claude)
        print_header "Logging in to Claude..."
        print_info "Your browser will open. Log in and come back here."
        echo ""
        claude /login
        print_ok "Claude login complete"
        ;;
      login_netlify)
        print_header "Logging in to Netlify..."
        print_info "Your browser will open. Click Authorize and come back here."
        echo ""
        netlify login
        print_ok "Netlify login complete"
        ;;
      login_supabase)
        print_header "Logging in to Supabase..."
        print_info "Your browser will open. Log in and come back here."
        echo ""
        supabase login
        print_ok "Supabase login complete"
        ;;
    esac
  done

  echo ""
fi

# ════════════════════════════════════════════════════════════
# PHASE 3 — Offer to run setup.sh
# ════════════════════════════════════════════════════════════

if [[ -f "$PROJECT_DIR/netlify.toml" && ! -f "$PROJECT_DIR/.netlify/state.json" ]]; then
  print_header "Ready to set up this project"
  echo ""
  print_info "The last step is running setup.sh to set up your project."
  echo ""
  echo -n "${BOLD}Run setup.sh now? [y/N] ${RESET}"
  read -r RUN_SETUP
  if [[ "$RUN_SETUP" =~ ^[Yy]$ ]]; then
    echo ""
    zsh "$PROJECT_DIR/bin/setup.sh"
  else
    echo ""
    print_info "When you're ready: run ${BOLD}zsh bin/setup.sh${RESET} from your project folder."
    echo ""
  fi
else
  print_info "Tip: See README.md for how to set MacDown 3000 as your default .md viewer."
  echo ""
fi
