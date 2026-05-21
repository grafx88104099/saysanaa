#!/usr/bin/env bash
# Vercel-руу env variables нэмэх script
# Хэрэглэх: bash scripts/setup-vercel-env.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# npm cache permission асуудлаас зайлсхийхийн тулд temp cache
export NPM_CONFIG_CACHE=/tmp/npm-cache
mkdir -p /tmp/npm-cache

# ── 0. Vercel CLI бэлдэх ───────────────────────────────────────
if command -v vercel >/dev/null 2>&1; then
  VERCEL=$(command -v vercel)
else
  echo "→ Vercel CLI түр зайны directory-д суулгаж байна..."
  TMPVDIR=/tmp/vercel-cli
  mkdir -p "$TMPVDIR"
  (cd "$TMPVDIR" && npm install vercel@latest --cache /tmp/npm-cache --no-save --no-audit --no-fund 2>&1 | tail -3)
  VERCEL="$TMPVDIR/node_modules/.bin/vercel"
  if [ ! -x "$VERCEL" ]; then
    echo "❌ Vercel CLI суулгахад алдаа гарлаа"
    exit 1
  fi
fi
echo "✓ Vercel CLI: $VERCEL"

# ── 1. Login + link ────────────────────────────────────────────
if [ ! -f .vercel/project.json ]; then
  echo "→ Vercel-д login (browser нээгдэнэ)..."
  "$VERCEL" login
  echo "→ Project-той холбох (saysanaa сонгох)..."
  "$VERCEL" link
fi

# ── 2. AUTH_SECRET үүсгэх ──────────────────────────────────────
AUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo "✓ AUTH_SECRET үүсгэлээ"

# ── 3. Утгуудыг тодорхойлох ────────────────────────────────────
DATABASE_URL='postgresql://postgres.tsyeeykxmlaxuprtsltj:SaysanaaOS2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
DIRECT_URL='postgresql://postgres.tsyeeykxmlaxuprtsltj:SaysanaaOS2026@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
SUPABASE_URL='https://tsyeeykxmlaxuprtsltj.supabase.co'
APP_NAME='SayaSanaa OS'

# SUPABASE_SERVICE_ROLE_KEY-г Supabase Dashboard-аас ШИНЭЭР хуулна
echo ""
echo "📋 Supabase service_role token аваарай (rotate хийгээгүй бол rotate хийгээд):"
echo "   https://supabase.com/dashboard/project/tsyeeykxmlaxuprtsltj/settings/api"
echo ""
read -r -s -p "→ SUPABASE_SERVICE_ROLE_KEY-г paste хийгээрэй: " SUPABASE_SERVICE_ROLE_KEY
echo ""
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Token хоосон. Зогсоов."
  exit 1
fi

# ── 4. Add env vars to Vercel ──────────────────────────────────
push_env() {
  local key="$1"
  local value="$2"
  for env in production preview development; do
    # Хэрэв байгаа бол устгаад дахин нэмнэ (upsert)
    echo "$value" | "$VERCEL" env add "$key" "$env" --force 2>&1 | grep -v "^>" || true
  done
  echo "  ✓ $key"
}

echo ""
echo "→ Vercel-руу 6 env variable нэмж байна..."
push_env DATABASE_URL "$DATABASE_URL"
push_env DIRECT_URL "$DIRECT_URL"
push_env SUPABASE_URL "$SUPABASE_URL"
push_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
push_env AUTH_SECRET "$AUTH_SECRET"
push_env APP_NAME "$APP_NAME"

# ── 5. Redeploy ────────────────────────────────────────────────
echo ""
echo "→ Production-руу redeploy хийж байна..."
"$VERCEL" --prod

echo ""
echo "🎉 Дууссан. URL дээр /login → admin@saysanaa.mn / Admin@123"
