#!/bin/sh
# Container entrypoint: inject runtime frontend config, run DB migrations,
# then start the server. Used by both docker-compose (VPS) and Render.
set -e

# 1) Runtime config for the web client (/config.js), so the same image works
#    with any Firebase project without rebuilding.
mkdir -p /app/dist/public
cat > /app/dist/public/config.js <<EOF
// Generated at container start - do not edit.
window.__APP_CONFIG__ = {
  VITE_FIREBASE_API_KEY: "${VITE_FIREBASE_API_KEY:-}",
  VITE_FIREBASE_APP_ID: "${VITE_FIREBASE_APP_ID:-}",
  VITE_FIREBASE_AUTH_DOMAIN: "${VITE_FIREBASE_AUTH_DOMAIN:-}",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "${VITE_FIREBASE_MESSAGING_SENDER_ID:-}",
  VITE_FIREBASE_PROJECT_ID: "${VITE_FIREBASE_PROJECT_ID:-}",
  VITE_FIREBASE_STORAGE_BUCKET: "${VITE_FIREBASE_STORAGE_BUCKET:-}"
};
EOF
echo "[entrypoint] wrote /config.js"

# 2) Apply pending DB migrations (idempotent - safe to run every boot).
if [ -n "$DATABASE_URL" ]; then
  node /app/dist/migrate.js || echo "[entrypoint] WARNING: migrations failed, starting server anyway"
else
  echo "[entrypoint] DATABASE_URL not set - skipping migrations"
fi

# 3) Start the app.
exec node /app/dist/index.js
