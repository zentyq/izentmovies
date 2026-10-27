#!/bin/sh
set -e

# Generate dynamic env-config.js for client-side JavaScript
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  YOUTUBE_API_KEY: "${YOUTUBE_API_KEY:-}",
  COHERE_API_KEY: "${COHERE_API_KEY:-}",
  ADSENSE_CLIENT_ID: "${ADSENSE_CLIENT_ID:-ca-pub-9444948713845341}",
  ADSENSE_SLOT_SIDEBAR: "${ADSENSE_SLOT_SIDEBAR:-4825913350}",
  ADSENSE_SLOT_SOLO: "${ADSENSE_SLOT_SOLO:-5680876206}",
  ADSENSE_SLOT_SOLOG: "${ADSENSE_SLOT_SOLOG:-8757963709}",
  DEFAULT_REGION: "${DEFAULT_REGION:-US}",
  APP_NAME: "${APP_NAME:-iZent Cinema}"
};
EOF

echo "[iZent Cinema] Dynamic env-config.js generated from container environment."
