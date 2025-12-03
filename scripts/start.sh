#!/bin/sh

# Entrypoint for the production container.
# Deploys Convex functions (if a deploy key is provided) before starting Next.js.

set -u

echo "🔧 Bootstrapping Convex deployment..."

DEPLOY_TARGET="${CONVEX_PRODUCTION_URL:-${CONVEX_SELF_HOSTED_URL:-${NEXT_PUBLIC_CONVEX_URL:-""}}}"
ADMIN_KEY="${CONVEX_SELF_HOSTED_ADMIN_KEY:-}"
DEPLOY_KEY="${CONVEX_DEPLOY_KEY:-}"

if [ -n "$ADMIN_KEY" ]; then
  echo "📡 Deploying Convex functions (self-hosted) to ${DEPLOY_TARGET:-"(unknown target)"}"
  if npx convex deploy --admin-key "$ADMIN_KEY" --url "$DEPLOY_TARGET"; then
    echo "✅ Convex deploy completed (self-hosted)."
  else
    echo "❌ Convex deploy failed with CONVEX_SELF_HOSTED_ADMIN_KEY. Check the key and URL, then redeploy the stack."
    exit 1
  fi
elif [ -n "$DEPLOY_KEY" ]; then
  echo "📡 Deploying Convex functions (cloud) to ${DEPLOY_TARGET:-"(unknown target)"}"
  if npx convex deploy; then
    echo "✅ Convex deploy completed."
  else
    echo "❌ Convex deploy failed with CONVEX_DEPLOY_KEY. Check the key and URL, then redeploy the stack."
    exit 1
  fi
else
  echo "❌ No Convex key provided. Set CONVEX_SELF_HOSTED_ADMIN_KEY (self-hosted) or CONVEX_DEPLOY_KEY (cloud) in your Portainer stack."
  exit 1
fi

echo "🚀 Starting Next.js..."
exec npm start
