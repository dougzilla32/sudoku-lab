#!/bin/bash
# Works with both zsh and bash

# ── Find project root ─────────────────────────────────────────

if [ -n "$ZSH_VERSION" ]; then
  SCRIPT_DIR="${0:A:h}"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

print_header() { echo "\n${BOLD}${BLUE}── $1 ${RESET}" }
print_ok()     { echo "  ${GREEN}✓${RESET}  $1" }
print_warn()   { echo "  ${YELLOW}!${RESET}  $1" }
print_info()   { echo "     $1" }
die()          { echo "\n  ${RED}Error:${RESET} $1\n"; exit 1 }

# ── Python helper ─────────────────────────────────────────────
# Extracts and parses a JSON array from noisy CLI output.
# Usage: supa_json <command> | supabase_json_query <field> <value>
# We write a temp helper script to avoid shell quoting issues.

# Node.js helper scripts are in bin/_json_check.js and bin/_json_helper.js
JSSCRIPT="$SCRIPT_DIR/_json_helper.js"

# ── Sanity checks ─────────────────────────────────────────────

if [[ ! -f "$PROJECT_DIR/netlify.toml" ]]; then
  die "Could not find netlify.toml in $PROJECT_DIR — is this the right project folder?"
fi

cd "$PROJECT_DIR" || die "Could not change to project directory: $PROJECT_DIR"

for cmd in netlify supabase node npm; do
  if ! command -v $cmd &>/dev/null; then
    die "$cmd is not installed. Run the install script first (mac/install.sh or windows/install-wsl.sh)."
  fi
done

# ── Check login status ────────────────────────────────────────

print_header "Checking account logins"
echo ""

NETLIFY_STATUS=$(netlify status 2>/dev/null)
if ! echo "$NETLIFY_STATUS" | grep -q "Email:"; then
  die "Not logged in to Netlify. Run: netlify login"
fi
NETLIFY_USER=$(echo "$NETLIFY_STATUS" | grep "Email:" | awk '{print $2}')
print_ok "Netlify ($NETLIFY_USER)"

if ! SUPABASE_NO_UPDATE_CHECK=1 supabase projects list --output json 2>/dev/null | \
  node "$JSSCRIPT" check; then
  die "Not logged in to Supabase. Run: supabase login"
fi
print_ok "Supabase"

# ── Check what's already done ─────────────────────────────────

NETLIFY_LINKED=false
SUPABASE_LINKED=false
ENV_EXISTS=false
APP_SCAFFOLDED=false

[[ -f "$PROJECT_DIR/.netlify/state.json" ]] && NETLIFY_LINKED=true
[[ -f "$PROJECT_DIR/.env" ]] && ENV_EXISTS=true
[[ -f "$PROJECT_DIR/package.json" ]] && APP_SCAFFOLDED=true

if SUPABASE_NO_UPDATE_CHECK=1 supabase projects list --output json 2>/dev/null | \
  node "$JSSCRIPT" has_name "$PROJECT_NAME"; then
  SUPABASE_LINKED=true
fi

if $NETLIFY_LINKED && $SUPABASE_LINKED && $ENV_EXISTS && $APP_SCAFFOLDED; then
  echo ""
  print_ok "This project is already fully set up!"
  print_info ""
  print_info "Setup complete. Run ${BOLD}zsh bin/mac/start.sh${RESET} to start building."
  echo ""
  exit 0
fi

# ── Show plan ─────────────────────────────────────────────────

print_header "Setting up project: ${PROJECT_NAME}"
print_info "Directory: ${PROJECT_DIR}"
echo ""

$APP_SCAFFOLDED    || print_info "• Scaffold React + Vite starter app"
$APP_SCAFFOLDED    || print_info "• Install app packages (npm install)"
$NETLIFY_LINKED    || print_info "• Create Netlify site: ${PROJECT_NAME}"
$SUPABASE_LINKED   || print_info "• Create Supabase project: ${PROJECT_NAME}"
$ENV_EXISTS        || print_info "• Write .env file with Supabase credentials"
print_info "• Push Supabase credentials to Netlify"

echo ""
echo -n "${BOLD}Proceed? [y/N] ${RESET}"
read -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "\nAborted. Nothing was changed."
  exit 0
fi

# ── Scaffold app ──────────────────────────────────────────────

if ! $APP_SCAFFOLDED; then
  print_header "Scaffolding React app..."

  TEMP_DIR="_vite_temp"
  rm -rf "$TEMP_DIR"
  npm_config_yes=true npm create vite@latest "$TEMP_DIR" -- --template react --no-interactive
  VITE_EXIT=$?

  if [[ $VITE_EXIT -ne 0 || ! -f "$TEMP_DIR/package.json" ]]; then
    rm -rf "$TEMP_DIR"
    die "Scaffolding was cancelled or failed. Run bin/setup.sh again to try again."
  fi

  rm -f "$TEMP_DIR/README.md"
  cp -r "$TEMP_DIR"/. .
  rm -rf "$TEMP_DIR"

  # Fix page title (vite names it after the temp dir)
  if [[ -f index.html ]]; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|<title>.*</title>|<title>${PROJECT_NAME}</title>|" index.html
    else
      sed -i "s|<title>.*</title>|<title>${PROJECT_NAME}</title>|" index.html
    fi
  fi

  cat > vite.config.js << 'VITEEOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})
VITEEOF

  print_info "Installing packages (this takes a minute)..."
  npm install || die "Package installation failed. Run bin/setup.sh again to try again."
  npm install @supabase/supabase-js || die "Failed to install @supabase/supabase-js."

  mkdir -p src
  cat > src/supabaseClient.js << 'SUPA'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
SUPA

  print_ok "App scaffolded"
fi

# ── Netlify setup ─────────────────────────────────────────────

if ! $NETLIFY_LINKED; then
  print_header "Creating Netlify site..."

  SUFFIX=""

  if netlify sites:list --json 2>/dev/null | node "$JSSCRIPT" has_name "$PROJECT_NAME"; then
    print_warn "Site already exists — linking to it"
    netlify link --name "$PROJECT_NAME" 2>/dev/null
  elif ! netlify sites:create --name "$PROJECT_NAME"; then
    SUFFIX="-$(openssl rand -hex 3)"
    netlify sites:create --name "${PROJECT_NAME}${SUFFIX}"
    print_warn "Name taken — created as ${PROJECT_NAME}${SUFFIX}"
    netlify link --name "${PROJECT_NAME}${SUFFIX}" 2>/dev/null
  else
    netlify link --name "${PROJECT_NAME}" 2>/dev/null
  fi

  print_ok "Netlify site created and linked"
fi

# ── Supabase setup ────────────────────────────────────────────

if ! $SUPABASE_LINKED; then
  print_header "Creating Supabase project..."

  ORG_ID=$(SUPABASE_NO_UPDATE_CHECK=1 supabase orgs list --output json 2>/dev/null | \
    node "$JSSCRIPT" first_id)
  if [[ -z "$ORG_ID" ]]; then
    die "Could not get your Supabase organization ID. Try: supabase login"
  fi

  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
  print_info "Generating database password automatically..."

  SUPA_OUTPUT=$(SUPABASE_NO_UPDATE_CHECK=1 supabase projects create "$PROJECT_NAME" \
    --org-id "$ORG_ID" \
    --region us-east-1 \
    --db-password "$DB_PASSWORD" 2>&1)

  if [[ $? -ne 0 ]]; then
    if echo "$SUPA_OUTPUT" | grep -q "already exists"; then
      print_warn "Supabase project already exists — continuing"
    else
      die "Failed to create Supabase project:\n$SUPA_OUTPUT"
    fi
  else
    print_ok "Supabase project created"
    print_info "Waiting for project to be ready..."
    sleep 10
  fi
fi

# ── Get Supabase credentials ──────────────────────────────────

print_header "Fetching Supabase credentials..."

MAX_WAIT=60
WAITED=0
PROJECT_REF=""
while [[ -z "$PROJECT_REF" && $WAITED -lt $MAX_WAIT ]]; do
  PROJECT_REF=$(SUPABASE_NO_UPDATE_CHECK=1 supabase projects list --output json 2>/dev/null | \
    node "$JSSCRIPT" get_id_by_name "$PROJECT_NAME")
  if [[ -z "$PROJECT_REF" ]]; then
    print_info "Waiting for Supabase project to be ready... (${WAITED}s)"
    sleep 5
    WAITED=$((WAITED + 5))
  fi
done

if [[ -z "$PROJECT_REF" ]]; then
  die "Could not find Supabase project after ${MAX_WAIT}s. Run bin/setup.sh again."
fi

KEYS_JSON=$(SUPABASE_NO_UPDATE_CHECK=1 supabase projects api-keys \
  --project-ref "$PROJECT_REF" --output json 2>/dev/null)

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
ANON_KEY=$(echo "$KEYS_JSON" | node "$JSSCRIPT" anon_key)

if [[ -z "$ANON_KEY" ]]; then
  die "Could not fetch Supabase anon key. Try running bin/setup.sh again in 30 seconds."
fi

print_ok "Got credentials"

# ── Write .env ────────────────────────────────────────────────

if ! $ENV_EXISTS; then
  print_header "Writing .env file..."

  cat > "$PROJECT_DIR/.env" << ENVEOF
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${ANON_KEY}
ENVEOF

  print_ok ".env written"
fi

# ── Push env vars to Netlify ──────────────────────────────────

print_header "Pushing credentials to Netlify..."

netlify env:set VITE_SUPABASE_URL "$SUPABASE_URL" --context production --force 2>/dev/null
netlify env:set VITE_SUPABASE_ANON_KEY "$ANON_KEY" --context production --force 2>/dev/null

print_ok "Netlify environment variables set"

# ── Done ──────────────────────────────────────────────────────

echo ""
print_header "Project is ready"
echo ""
print_info "Project:   ${BOLD}${PROJECT_NAME}${RESET}"
print_info "Supabase:  ${BOLD}https://supabase.com/dashboard/project/${PROJECT_REF}${RESET}"
print_info "Live URL:  ${BOLD}https://${PROJECT_NAME}${SUFFIX}.netlify.app${RESET} (after first /deploy)"
print_info ""
print_info "Setup complete. Run ${BOLD}zsh bin/mac/start.sh${RESET} to start building."
echo ""
