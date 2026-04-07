#!/bin/bash

# ============================================================
# install-wsl.sh — Run once ever inside WSL2/Ubuntu
# Linux equivalent of install.sh for Windows users.
# Run from inside Ubuntu after install-wsl.ps1 has completed.
# ============================================================

# ── Load user PATH (nvm, Claude, etc.) ───────────────────────

export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
export PATH="$HOME/.claude/local:$HOME/.local/bin:$PATH"

# ── Find project root ─────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

print_header() { echo -e "\n${BOLD}${BLUE}── $1${RESET}"; }
print_ok()     { echo -e "  ${GREEN}✓${RESET}  $1"; }
print_warn()   { echo -e "  ${YELLOW}!${RESET}  $1"; }
print_missing(){ echo -e "  ${RED}✗${RESET}  $1"; }
print_info()   { echo -e "     $1"; }
print_problem(){ echo -e "  ${RED}⚠${RESET}  $1"; }
die()          { echo -e "\n  ${RED}Error:${RESET} $1\n"; exit 1; }

# ════════════════════════════════════════════════════════════
# PHASE 1 — Software checks
# ════════════════════════════════════════════════════════════

print_header "Checking your system"
echo ""

ACTIONS=()

# ── Windows interop + browser bridge ─────────────────────────

# Ensure WSLInterop is registered (may be missing on Cloud PCs)
if [[ ! -f /proc/sys/fs/binfmt_misc/WSLInterop ]]; then
    echo ':WSLInterop:M::MZ::/init:PF' | sudo tee /proc/sys/fs/binfmt_misc/register > /dev/null
    # Persist across reboots via systemd-binfmt
    echo ':WSLInterop:M::MZ::/init:PF' | sudo tee /etc/binfmt.d/WSLInterop.conf > /dev/null
fi

# Create wslview wrapper so CLI tools can open the Windows browser
if ! command -v wslview &>/dev/null; then
    printf '#!/bin/bash\npowershell.exe -NoProfile -Command "Start-Process '"'"'$*'"'"'"\n' | sudo tee /usr/local/bin/wslview > /dev/null
    sudo chmod +x /usr/local/bin/wslview
fi

# ── Node.js ───────────────────────────────────────────────────

if command -v node &>/dev/null; then
    CURRENT_NODE=$(node --version | sed 's/v//')
    print_ok "Node.js $CURRENT_NODE"
else
    print_missing "Node.js — not installed"
    ACTIONS+=("install_node")
fi

# ── Claude Code ───────────────────────────────────────────────

if command -v claude &>/dev/null; then
    CLAUDE_PATH=$(which claude)
    if [[ "$CLAUDE_PATH" == */npm/* || "$CLAUDE_PATH" == */node_modules/* ]]; then
        print_problem "Claude Code — installed via npm (needs to be replaced)"
        print_info "    The npm version is deprecated. The native installer is faster and auto-updates."
        print_info "    Path: $CLAUDE_PATH"
        ACTIONS+=("replace_claude_npm")
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
    print_ok "Netlify CLI $CURRENT_NETLIFY"
else
    print_missing "Netlify CLI — not installed"
    ACTIONS+=("install_netlify")
fi

# ── Supabase CLI ──────────────────────────────────────────────

if command -v supabase &>/dev/null; then
    CURRENT_SUPA=$(SUPABASE_NO_UPDATE_CHECK=1 supabase --version 2>/dev/null | awk '{print $NF}')
    print_ok "Supabase CLI $CURRENT_SUPA"
else
    print_missing "Supabase CLI — not installed"
    ACTIONS+=("install_supabase")
fi

# ── Run installs if needed ────────────────────────────────────

echo ""
if [[ ${#ACTIONS[@]} -gt 0 ]]; then

    print_header "Here's what needs to happen"
    echo ""

    for action in "${ACTIONS[@]}"; do
        case "$action" in
            install_node)        print_info "• Install Node.js via nvm" ;;
            install_claude)      print_info "• Install Claude Code (native installer)" ;;
            replace_claude_npm)  print_info "• Remove npm Claude Code and install native version" ;;
            install_netlify)     print_info "• Install Netlify CLI via npm" ;;
            install_supabase)    print_info "• Install Supabase CLI" ;;
        esac
    done

    echo ""
    read -p "$(echo -e "${BOLD}Proceed with all of the above? [y/N] ${RESET}")" CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "\nAborted. Nothing was changed."
        exit 0
    fi

    echo ""

    for action in "${ACTIONS[@]}"; do
        case "$action" in

            install_node)
                print_header "Installing Node.js..."
                curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/HEAD/install.sh | bash
                export NVM_DIR="$HOME/.nvm"
                source "$NVM_DIR/nvm.sh"
                nvm install --lts
                nvm use --lts
                print_ok "Node.js installed"
                ;;

            install_claude)
                print_header "Installing Claude Code..."
                curl -fsSL https://claude.ai/install.sh | bash
                print_ok "Claude Code installed"
                ;;

            replace_claude_npm)
                print_header "Replacing npm Claude Code with native version..."
                npm uninstall -g @anthropic-ai/claude-code 2>/dev/null || true
                CLAUDE_PATH=$(which claude 2>/dev/null)
                if [[ "$CLAUDE_PATH" == */npm/* || "$CLAUDE_PATH" == */node_modules/* ]]; then
                    rm -f "$CLAUDE_PATH"
                fi
                print_ok "npm version removed"
                curl -fsSL https://claude.ai/install.sh | bash
                print_ok "Native Claude Code installed"
                ;;

            install_netlify)
                print_header "Installing Netlify CLI..."
                npm install -g netlify-cli
                print_ok "Netlify CLI installed"
                ;;

            install_supabase)
                print_header "Installing Supabase CLI..."
                SUPA_URL=$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest \
                  | python3 -c "
import sys, json
assets = json.load(sys.stdin)['assets']
print([a['browser_download_url'] for a in assets if 'linux_amd64.deb' in a['name']][0])
")
                curl -fsSL -o /tmp/supabase.deb "$SUPA_URL"
                sudo dpkg -i /tmp/supabase.deb
                rm -f /tmp/supabase.deb
                print_ok "Supabase CLI installed"
                ;;

        esac
    done

else
    print_header "All software is up to date"
    echo ""
fi

# ════════════════════════════════════════════════════════════
# PHASE 2 — Account logins
# ════════════════════════════════════════════════════════════

JSSCRIPT="$SCRIPT_DIR/../_json_check.js"

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
    read -p "$(echo -e "${BOLD}Proceed with logins? [y/N] ${RESET}")" CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "\nSkipped. Run this script again when you're ready to log in."
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
    read -p "$(echo -e "${BOLD}Run setup.sh now? [y/N] ${RESET}")" RUN_SETUP
    if [[ "$RUN_SETUP" =~ ^[Yy]$ ]]; then
        echo ""
        bash "$PROJECT_DIR/bin/setup.sh"
    else
        echo ""
        print_info "When you're ready: run ${BOLD}bash bin/setup.sh${RESET} from your project folder."
        echo ""
    fi
else
    echo ""
fi
