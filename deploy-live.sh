#!/bin/bash
# Deploy built pages to LIVE (outra.vip/signature-segments/)
# Only run this after reviewing staging.

set -e

DEPLOY_REPO="/Users/OBello/Claude/Projects/ecc-outra-event"
LIVE_DIR="$DEPLOY_REPO/public/signature-segments"
SOURCE_DIR="/Users/OBello/Claude/Projects/outra-segments-site/public"

echo "Deploying to LIVE..."

# Copy built files
cp "$SOURCE_DIR/index.html" "$LIVE_DIR/index.html"
cp "$SOURCE_DIR/open-partners.html" "$LIVE_DIR/openpartners/index.html"
cp "$SOURCE_DIR/dentsu.html" "$LIVE_DIR/dentsu/index.html"
cp "$SOURCE_DIR/omnicom.html" "$LIVE_DIR/omnicom/index.html"

# Add base href (no staging banner)
for f in "$LIVE_DIR/index.html" "$LIVE_DIR/openpartners/index.html" "$LIVE_DIR/dentsu/index.html" "$LIVE_DIR/omnicom/index.html"; do
  sed -i '' "s|<head>|<head>\\
  <base href=\"/signature-segments/\">|" "$f"
done

echo "Live files ready. Now commit and push ecc-outra-event."
