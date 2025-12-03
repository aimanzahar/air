#!/bin/sh

# Entrypoint for the production container.
# Deploys Convex functions (if a deploy key is provided) before starting Next.js.

set -u

echo "🔧 Bootstrapping Convex deployment..."

DEPLOY_TARGET="${CONVEX_PRODUCTION_URL:-${CONVEX_SELF_HOSTED_URL:-${NEXT_PUBLIC_CONVEX_URL:-""}}}"

if [ -z "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "⚠️  CONVEX_DEPLOY_KEY is not set. Skipping Convex deploy; backend functions may be missing."
else
  echo "📡 Deploying Convex functions to ${DEPLOY_TARGET:-"(unknown target)"}"
  if npx convex deploy; then
    echo "✅ Convex deploy completed."
  else
    echo "❌ Convex deploy failed. Starting app anyway; check logs and your Convex credentials."
  fi
fi

echo "🚀 Starting Next.js..."
exec npm start
