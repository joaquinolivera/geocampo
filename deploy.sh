#!/usr/bin/env bash
# =============================================================================
# GeoCampo — Deployment Script
# =============================================================================
# Usage:
#   ./deploy.sh                  → deploy both apps to preview
#   ./deploy.sh --web            → deploy web dashboard only
#   ./deploy.sh --landing        → deploy landing only
#   ./deploy.sh --prod           → promote to production
#   ./deploy.sh --web --prod     → web to production
#   ./deploy.sh --skip-checks    → skip typecheck + tests (faster)
#   ./deploy.sh --help           → show this message
#
# Requirements:
#   pnpm, vercel CLI (npm i -g vercel)
#   Run `vercel link` in apps/web and apps/landing before first deploy
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ───────────────────────────────────────────────────────────────────
log()     { echo -e "${BLUE}▸${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
error()   { echo -e "${RED}✗ ERROR:${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${NC}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
DEPLOY_WEB=false
DEPLOY_LANDING=false
PROD=false
SKIP_CHECKS=false

for arg in "$@"; do
  case $arg in
    --web)          DEPLOY_WEB=true ;;
    --landing)      DEPLOY_LANDING=true ;;
    --prod)         PROD=true ;;
    --skip-checks)  SKIP_CHECKS=true ;;
    --help|-h)
      head -20 "$0" | tail -16
      exit 0
      ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# Default: deploy both
if ! $DEPLOY_WEB && ! $DEPLOY_LANDING; then
  DEPLOY_WEB=true
  DEPLOY_LANDING=true
fi

# ── Env ───────────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
LANDING_DIR="$REPO_ROOT/apps/landing"

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}🌿 GeoCampo Deploy${NC}"
echo -e "   Apps:  $([ $DEPLOY_LANDING = true ] && echo 'landing ' || true)$([ $DEPLOY_WEB = true ] && echo 'web' || true)"
echo -e "   Mode:  $([ $PROD = true ] && echo "${RED}PRODUCTION${NC}" || echo "${YELLOW}preview${NC}")"
echo -e "   Checks: $([ $SKIP_CHECKS = true ] && echo 'skipped' || echo 'enabled')"

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
header "Checking prerequisites"

command -v pnpm  >/dev/null 2>&1 || error "pnpm not found. Install: npm i -g pnpm"
command -v vercel >/dev/null 2>&1 || error "Vercel CLI not found. Install: npm i -g vercel"
command -v git   >/dev/null 2>&1 || error "git not found"

success "pnpm $(pnpm --version)"
success "vercel $(vercel --version 2>/dev/null | head -1)"
success "git $(git --version | awk '{print $3}')"

# ── 2. Git status ─────────────────────────────────────────────────────────────
header "Git status"

cd "$REPO_ROOT"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Branch: ${BOLD}$BRANCH${NC}"

UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  warn "$UNCOMMITTED uncommitted file(s) — consider committing before deploying"
  git status --short
  echo ""
  read -rp "  Continue anyway? [y/N] " CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }
else
  success "Working tree clean"
fi

LATEST=$(git log --oneline -1)
log "Latest commit: $LATEST"

# ── 3. Install dependencies ───────────────────────────────────────────────────
header "Installing dependencies"

pnpm install --frozen-lockfile
success "Dependencies up to date"

# ── 4. Typecheck + Tests ──────────────────────────────────────────────────────
if ! $SKIP_CHECKS; then
  header "Typecheck"

  if $DEPLOY_WEB; then
    log "Typechecking apps/web..."
    pnpm --filter @geocampo/web typecheck && success "apps/web typecheck passed" \
      || error "apps/web typecheck failed — fix errors before deploying"
  fi

  if $DEPLOY_LANDING; then
    log "Typechecking apps/landing..."
    pnpm --filter @geocampo/landing typecheck && success "apps/landing typecheck passed" \
      || error "apps/landing typecheck failed — fix errors before deploying"
  fi

  header "Tests"
  log "Running shared package tests..."
  pnpm test 2>/dev/null && success "Tests passed" \
    || warn "Some tests failed — check output above"
else
  warn "Skipping typecheck and tests (--skip-checks)"
fi

# ── 5. Build ──────────────────────────────────────────────────────────────────
header "Build"

if $DEPLOY_LANDING; then
  log "Building apps/landing..."
  pnpm --filter @geocampo/landing build \
    && success "apps/landing built successfully" \
    || error "apps/landing build failed"
fi

if $DEPLOY_WEB; then
  log "Building apps/web..."
  pnpm --filter @geocampo/web build \
    && success "apps/web built successfully" \
    || error "apps/web build failed"
fi

# ── 6. Deploy ─────────────────────────────────────────────────────────────────
header "Deploy"

VERCEL_FLAGS="--yes"
if $PROD; then
  VERCEL_FLAGS="$VERCEL_FLAGS --prod"
fi

deploy_app() {
  local APP_NAME="$1"
  local APP_DIR="$2"

  log "Deploying ${BOLD}$APP_NAME${NC}..."

  if [ ! -f "$APP_DIR/.vercel/project.json" ]; then
    warn "$APP_NAME has no .vercel/project.json — run 'vercel link' in $APP_DIR first"
    warn "Running 'vercel link' now (interactive)..."
    cd "$APP_DIR" && vercel link
    cd "$REPO_ROOT"
  fi

  cd "$APP_DIR"
  # shellcheck disable=SC2086
  DEPLOY_URL=$(vercel $VERCEL_FLAGS 2>&1 | tee /dev/stderr | grep -E "^https://" | tail -1)
  cd "$REPO_ROOT"

  if [ -n "$DEPLOY_URL" ]; then
    success "$APP_NAME deployed → ${BOLD}$DEPLOY_URL${NC}"
  else
    warn "$APP_NAME deploy completed (check output above for URL)"
  fi
}

if $DEPLOY_LANDING; then
  deploy_app "landing" "$LANDING_DIR"
fi

if $DEPLOY_WEB; then
  deploy_app "web" "$WEB_DIR"
fi

# ── 7. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}══ Deploy complete ══${NC}"
echo ""

if $PROD; then
  echo -e "  Production URLs:"
  $DEPLOY_LANDING && echo -e "    Landing  → check Vercel dashboard"
  $DEPLOY_WEB     && echo -e "    Web app  → check Vercel dashboard"
else
  echo -e "  Preview URLs printed above. To promote to production:"
  echo -e "    ${CYAN}./deploy.sh --prod${NC}"
fi

echo ""
