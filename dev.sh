#!/usr/bin/env bash
# =============================================================================
# GeoCampo — Local Development Script
# =============================================================================
# Usage:
#   ./dev.sh               → start both servers (landing :3001, web :3002)
#   ./dev.sh --web         → start web dashboard only (:3002)
#   ./dev.sh --landing     → start landing only (:3001)
#   ./dev.sh --check       → typecheck + tests, no servers
#   ./dev.sh --build       → build both apps (verifies prod build works)
#   ./dev.sh --clean       → clear .next caches and node_modules, reinstall
#   ./dev.sh --commit "msg"→ typecheck + commit all changes
#   ./dev.sh --help        → show this message
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${BLUE}▸${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
error()   { echo -e "${RED}✗${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}── $* ──${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
LANDING_DIR="$REPO_ROOT/apps/landing"

# ── Parse flags ───────────────────────────────────────────────────────────────
MODE="dev-all"
COMMIT_MSG=""

for arg in "$@"; do
  case $arg in
    --web)        MODE="dev-web" ;;
    --landing)    MODE="dev-landing" ;;
    --check)      MODE="check" ;;
    --build)      MODE="build" ;;
    --clean)      MODE="clean" ;;
    --commit)     MODE="commit" ;;
    --help|-h)    sed -n '3,12p' "$0"; exit 0 ;;
    -*)           warn "Unknown flag: $arg" ;;
    *)
      # Positional arg — used as commit message
      COMMIT_MSG="$arg"
      ;;
  esac
done

echo -e "\n${BOLD}🌿 GeoCampo local${NC} — $MODE\n"

# ── Check pnpm ────────────────────────────────────────────────────────────────
command -v pnpm >/dev/null 2>&1 || error "pnpm not found. Run: npm i -g pnpm"

cd "$REPO_ROOT"

# ─────────────────────────────────────────────────────────────────────────────
case $MODE in

# ── dev-all: both servers in parallel ────────────────────────────────────────
dev-all)
  header "Starting servers"
  log "Landing  → http://localhost:3001"
  log "Web app  → http://localhost:3002/app/login"
  log "Press Ctrl+C to stop both"
  echo ""

  # Kill any processes already on those ports
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  lsof -ti:3002 | xargs kill -9 2>/dev/null || true

  # Run both in parallel; killing this script kills both children
  trap 'kill 0' SIGINT SIGTERM
  pnpm --filter @geocampo/landing dev &
  pnpm --filter @geocampo/web     dev &
  wait
  ;;

# ── dev-web: dashboard only ───────────────────────────────────────────────────
dev-web)
  header "Starting web dashboard"
  log "Web app → http://localhost:3002/app/login"
  lsof -ti:3002 | xargs kill -9 2>/dev/null || true
  pnpm --filter @geocampo/web dev
  ;;

# ── dev-landing: landing only ─────────────────────────────────────────────────
dev-landing)
  header "Starting landing"
  log "Landing → http://localhost:3001"
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  pnpm --filter @geocampo/landing dev
  ;;

# ── check: typecheck + tests ──────────────────────────────────────────────────
check)
  header "Install"
  pnpm install --frozen-lockfile
  success "Dependencies ok"

  header "Typecheck"
  pnpm --filter @geocampo/web     typecheck && success "apps/web clean" \
    || error "apps/web has type errors"
  pnpm --filter @geocampo/landing typecheck && success "apps/landing clean" \
    || error "apps/landing has type errors"

  header "Tests"
  pnpm test && success "All tests passed" \
    || error "Tests failed — check output above"
  ;;

# ── build: production builds ──────────────────────────────────────────────────
build)
  header "Install"
  pnpm install --frozen-lockfile

  header "Build landing"
  pnpm --filter @geocampo/landing build && success "landing build ok" \
    || error "landing build failed"

  header "Build web"
  pnpm --filter @geocampo/web build && success "web build ok" \
    || error "web build failed"

  success "Both builds succeeded"
  ;;

# ── clean: wipe caches and reinstall ─────────────────────────────────────────
clean)
  header "Clean"
  log "Removing .next caches..."
  rm -rf "$WEB_DIR/.next" "$LANDING_DIR/.next"

  log "Removing node_modules..."
  rm -rf "$REPO_ROOT/node_modules" "$WEB_DIR/node_modules" "$LANDING_DIR/node_modules"

  log "Reinstalling..."
  pnpm install
  success "Clean install complete"
  ;;

# ── commit: typecheck then git commit ────────────────────────────────────────
commit)
  if [ -z "$COMMIT_MSG" ]; then
    error "Provide a commit message: ./dev.sh --commit \"your message\""
  fi

  header "Typecheck before commit"
  pnpm --filter @geocampo/web     typecheck || error "Type errors in apps/web — fix before committing"
  pnpm --filter @geocampo/landing typecheck || error "Type errors in apps/landing — fix before committing"
  success "Typecheck clean"

  header "Commit"
  git add -A
  CHANGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
  if [ "$CHANGED" -eq 0 ]; then
    warn "Nothing to commit"
    exit 0
  fi
  log "$CHANGED file(s) staged"
  git commit -m "$COMMIT_MSG"
  success "Committed: $COMMIT_MSG"

  log "Pushing to $(git rev-parse --abbrev-ref HEAD)..."
  git push
  success "Pushed"
  ;;

esac
