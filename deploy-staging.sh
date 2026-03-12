#!/bin/bash
# Deploy built pages to STAGING (outra.vip/signature-segments/staging/)
# Live pages remain untouched.

set -e

DEPLOY_REPO="/Users/OBello/Claude/Projects/ecc-outra-event"
STAGING_DIR="$DEPLOY_REPO/public/signature-segments/staging"
SOURCE_DIR="/Users/OBello/Claude/Projects/outra-segments-site/public"
BANNER='<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#ff6b35,#f7c948);color:#000;text-align:center;font-size:12px;font-weight:800;letter-spacing:1.5px;padding:4px 0;font-family:system-ui,sans-serif;pointer-events:none;">STAGING PREVIEW</div>'

echo "Deploying to STAGING..."

# Copy built files
cp "$SOURCE_DIR/index.html" "$STAGING_DIR/index.html"
cp "$SOURCE_DIR/open-partners.html" "$STAGING_DIR/openpartners/index.html"
cp "$SOURCE_DIR/dentsu.html" "$STAGING_DIR/dentsu/index.html"
cp "$SOURCE_DIR/omnicom.html" "$STAGING_DIR/omnicom/index.html"

# Add base href and staging banner
for f in "$STAGING_DIR/index.html" "$STAGING_DIR/openpartners/index.html" "$STAGING_DIR/dentsu/index.html" "$STAGING_DIR/omnicom/index.html"; do
  sed -i '' "s|<head>|<head>\\
  <base href=\"/signature-segments/\">|" "$f"
  sed -i '' "s|</body>|${BANNER}</body>|" "$f"
done

echo "Staging files ready. Now commit and push ecc-outra-event."
