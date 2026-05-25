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
cp "$SOURCE_DIR/rathbones.html" "$STAGING_DIR/rathbones/index.html"
cp "$SOURCE_DIR/mercedes-amg-f1.html" "$STAGING_DIR/mercedes-amg-f1/index.html"
mkdir -p "$STAGING_DIR/big-green-egg"
cp "$SOURCE_DIR/big-green-egg.html" "$STAGING_DIR/big-green-egg/index.html"
mkdir -p "$STAGING_DIR/emma-sleep"
cp "$SOURCE_DIR/emma-sleep.html" "$STAGING_DIR/emma-sleep/index.html"
mkdir -p "$STAGING_DIR/gaming"
cp "$SOURCE_DIR/gaming.html" "$STAGING_DIR/gaming/index.html"

# Add base href and staging banner
for f in "$STAGING_DIR/index.html" "$STAGING_DIR/openpartners/index.html" "$STAGING_DIR/dentsu/index.html" "$STAGING_DIR/omnicom/index.html" "$STAGING_DIR/rathbones/index.html" "$STAGING_DIR/mercedes-amg-f1/index.html" "$STAGING_DIR/big-green-egg/index.html" "$STAGING_DIR/emma-sleep/index.html" "$STAGING_DIR/gaming/index.html"; do
  sed -i '' "s|<head>|<head>\\
  <base href=\"/signature-segments/\">|" "$f"
  sed -i '' "s|</body>|${BANNER}</body>|" "$f"
done

# Mercedes-AMG F1 specific post-processing:
# 1) Inject brand logo into "first-party data" card
# 2) Replace "CRM records" with "Klaviyo records"
MERCEDES_FILE="$STAGING_DIR/mercedes-amg-f1/index.html"
sed -i '' 's|<div class="csf-entry-heading">Your brand'"'"'s first-party data</div>|<img src="mercedes-amg-f1-logo.png" alt="Mercedes-AMG Petronas F1 Team" class="csf-entry-logo"><div class="csf-entry-heading">Mercedes F1 first party Klaviyo data</div>|' "$MERCEDES_FILE"
sed -i '' 's|CRM records, booking history|Klaviyo records, booking history|' "$MERCEDES_FILE"
sed -i '' 's|ticket sales and membership data|ecom sales and membership data|' "$MERCEDES_FILE"
sed -i '' 's|Name your company or describe your ideal customer...|What audience are you searching for? Who is your ideal customer?|' "$MERCEDES_FILE"
# Strip the "We sell mattresses" rotating placeholder lines (they don't fit Mercedes context)
sed -i '' '/e\.g\. "We sell mattresses"/d' "$MERCEDES_FILE"
sed -i '' '/Tell us about your business, e\.g\. "We sell mattresses"/d' "$MERCEDES_FILE"

# 3) Inject side-by-side Meta ads panel next to search bar
python3 "$(dirname "$0")/mercedes-postprocess.py" "$MERCEDES_FILE"

# Big Green Egg specific post-processing:
# 1) Inject brand logo into "first-party data" card
# 2) Replace "CRM records" wording with BGE ecom/Shopify context
BGE_FILE="$STAGING_DIR/big-green-egg/index.html"
sed -i '' 's|<div class="csf-entry-heading">Your brand'"'"'s first-party data</div>|<img src="big-green-egg-logo.png" alt="Big Green Egg" class="csf-entry-logo"><div class="csf-entry-heading">Big Green Egg first party Shopify data</div>|' "$BGE_FILE"
sed -i '' 's|CRM records, booking history|Shopify orders, CRM records|' "$BGE_FILE"
sed -i '' 's|ticket sales and membership data|EGG sales and accessory purchase data|' "$BGE_FILE"
sed -i '' 's|Name your company or describe your ideal customer...|What audience are you searching for? Who is your ideal customer?|' "$BGE_FILE"
# Strip the "We sell mattresses" rotating placeholder lines (they don't fit BGE context)
sed -i '' '/e\.g\. "We sell mattresses"/d' "$BGE_FILE"
sed -i '' '/Tell us about your business, e\.g\. "We sell mattresses"/d' "$BGE_FILE"

# 3) Inject side-by-side Meta ads panel next to search bar
python3 "$(dirname "$0")/big-green-egg-postprocess.py" "$BGE_FILE"

# Copy BGE assets (logo + ads) into the signature-segments root so base href resolves them
cp "$SOURCE_DIR/big-green-egg-logo.png" "$STAGING_DIR/big-green-egg-logo.png"
cp "$SOURCE_DIR/bge-ad-1.png" "$STAGING_DIR/bge-ad-1.png"
cp "$SOURCE_DIR/bge-ad-2.png" "$STAGING_DIR/bge-ad-2.png"

# Emma Sleep specific post-processing:
EMMA_FILE="$STAGING_DIR/emma-sleep/index.html"
sed -i '' 's|<div class="csf-entry-heading">Your brand'"'"'s first-party data</div>|<div class="csf-entry-heading">Emma Sleep first party customer data</div>|' "$EMMA_FILE"
sed -i '' 's|CRM records, booking history|Klaviyo records, order history|' "$EMMA_FILE"
sed -i '' 's|ticket sales and membership data|mattress sales and customer reviews|' "$EMMA_FILE"
sed -i '' 's|Name your company or describe your ideal customer...|What audience are you searching for? Who is your ideal customer?|' "$EMMA_FILE"
sed -i '' '/e\.g\. "We sell mattresses"/d' "$EMMA_FILE"
sed -i '' '/Tell us about your business, e\.g\. "We sell mattresses"/d' "$EMMA_FILE"

# Inject ads panel + relabel activation section
python3 "$(dirname "$0")/emma-postprocess.py" "$EMMA_FILE"

# Copy Emma assets (ads) into the signature-segments root
cp "$SOURCE_DIR/emma-ad-1.png" "$STAGING_DIR/emma-ad-1.png"
cp "$SOURCE_DIR/emma-ad-2.png" "$STAGING_DIR/emma-ad-2.png"

# Gaming specific post-processing:
GAMING_FILE="$STAGING_DIR/gaming/index.html"
sed -i '' 's|<div class="csf-entry-heading">Your brand'"'"'s first-party data</div>|<div class="csf-entry-heading">Gaming first party customer data</div>|' "$GAMING_FILE"
sed -i '' 's|CRM records, booking history|CRM records, deposit & wagering history|' "$GAMING_FILE"
sed -i '' 's|ticket sales and membership data|player activity and lifetime value data|' "$GAMING_FILE"
sed -i '' 's|Name your company or describe your ideal customer...|What audience are you searching for? Who is your ideal customer?|' "$GAMING_FILE"
sed -i '' '/e\.g\. "We sell mattresses"/d' "$GAMING_FILE"
sed -i '' '/Tell us about your business, e\.g\. "We sell mattresses"/d' "$GAMING_FILE"

# Inject 3-ad panel + relabel activation section
python3 "$(dirname "$0")/gaming-postprocess.py" "$GAMING_FILE"

# Copy Gaming assets (3 ads) into the signature-segments root
cp "$SOURCE_DIR/gaming-ad-1.png" "$STAGING_DIR/gaming-ad-1.png" 2>/dev/null || echo "  (gaming-ad-1.png not yet present — add it to outra-segments-site/public/ before deploying)"
cp "$SOURCE_DIR/gaming-ad-2.png" "$STAGING_DIR/gaming-ad-2.png" 2>/dev/null || echo "  (gaming-ad-2.png not yet present — add it to outra-segments-site/public/ before deploying)"
cp "$SOURCE_DIR/gaming-ad-3.png" "$STAGING_DIR/gaming-ad-3.png" 2>/dev/null || echo "  (gaming-ad-3.png not yet present — add it to outra-segments-site/public/ before deploying)"

echo "Staging files ready. Now commit and push ecc-outra-event."
