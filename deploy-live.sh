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
cp "$SOURCE_DIR/rathbones.html" "$LIVE_DIR/rathbones/index.html"
cp "$SOURCE_DIR/mercedes-amg-f1.html" "$LIVE_DIR/mercedes-amg-f1/index.html"
# Case-variant alias for sharing in pitches (e.g. outra.vip/signature-segments/MercedesAMGf1)
mkdir -p "$LIVE_DIR/MercedesAMGf1"
cp "$SOURCE_DIR/mercedes-amg-f1.html" "$LIVE_DIR/MercedesAMGf1/index.html"
mkdir -p "$LIVE_DIR/big-green-egg"
cp "$SOURCE_DIR/big-green-egg.html" "$LIVE_DIR/big-green-egg/index.html"
mkdir -p "$LIVE_DIR/emma-sleep"
cp "$SOURCE_DIR/emma-sleep.html" "$LIVE_DIR/emma-sleep/index.html"
# Case-variant alias for sharing in pitches (e.g. outra.vip/signature-segments/EmmaSleep)
mkdir -p "$LIVE_DIR/EmmaSleep"
cp "$SOURCE_DIR/emma-sleep.html" "$LIVE_DIR/EmmaSleep/index.html"
mkdir -p "$LIVE_DIR/gaming"
cp "$SOURCE_DIR/gaming.html" "$LIVE_DIR/gaming/index.html"
# Case-variant alias
mkdir -p "$LIVE_DIR/Gaming"
cp "$SOURCE_DIR/gaming.html" "$LIVE_DIR/Gaming/index.html"

# Add base href (no staging banner)
for f in "$LIVE_DIR/index.html" "$LIVE_DIR/openpartners/index.html" "$LIVE_DIR/dentsu/index.html" "$LIVE_DIR/omnicom/index.html" "$LIVE_DIR/rathbones/index.html" "$LIVE_DIR/mercedes-amg-f1/index.html" "$LIVE_DIR/big-green-egg/index.html" "$LIVE_DIR/emma-sleep/index.html" "$LIVE_DIR/gaming/index.html"; do
  sed -i '' "s|<head>|<head>\\
  <base href=\"/signature-segments/\">|" "$f"
done

# Mercedes-AMG F1 specific post-processing:
# 1) Inject brand logo into "first-party data" card
# 2) Replace "CRM records" with "Klaviyo records"
MERCEDES_FILE="$LIVE_DIR/mercedes-amg-f1/index.html"
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
BGE_FILE="$LIVE_DIR/big-green-egg/index.html"
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
cp "$SOURCE_DIR/big-green-egg-logo.png" "$LIVE_DIR/big-green-egg-logo.png"
cp "$SOURCE_DIR/bge-ad-1.png" "$LIVE_DIR/bge-ad-1.png"
cp "$SOURCE_DIR/bge-ad-2.png" "$LIVE_DIR/bge-ad-2.png"

# Emma Sleep specific post-processing:
# 1) Replace "CRM records" wording with sleep/Klaviyo context
# 2) Inject ads panel + relabel "How to activate" section
EMMA_FILE="$LIVE_DIR/emma-sleep/index.html"
sed -i '' 's|<div class="csf-entry-heading">Your brand'"'"'s first-party data</div>|<div class="csf-entry-heading">Emma Sleep first party customer data</div>|' "$EMMA_FILE"
sed -i '' 's|CRM records, booking history|Klaviyo records, order history|' "$EMMA_FILE"
sed -i '' 's|ticket sales and membership data|mattress sales and customer reviews|' "$EMMA_FILE"
sed -i '' 's|Name your company or describe your ideal customer...|What audience are you searching for? Who is your ideal customer?|' "$EMMA_FILE"
# Strip the "We sell mattresses" rotating placeholder lines (Emma is a mattress brand — too on-the-nose)
sed -i '' '/e\.g\. "We sell mattresses"/d' "$EMMA_FILE"
sed -i '' '/Tell us about your business, e\.g\. "We sell mattresses"/d' "$EMMA_FILE"

# 3) Inject side-by-side ads panel + relabel activation section
python3 "$(dirname "$0")/emma-postprocess.py" "$EMMA_FILE"

# Copy Emma assets (ads) into the signature-segments root so base href resolves them
cp "$SOURCE_DIR/emma-ad-1.png" "$LIVE_DIR/emma-ad-1.png"
cp "$SOURCE_DIR/emma-ad-2.png" "$LIVE_DIR/emma-ad-2.png"

# Gaming specific post-processing:
# 1) Replace "first-party data" copy with gaming context
# 2) Inject 3-ad panel + relabel "How to activate" section
GAMING_FILE="$LIVE_DIR/gaming/index.html"
sed -i '' 's|<div class="csf-entry-heading">Your brand'"'"'s first-party data</div>|<div class="csf-entry-heading">Gaming first party customer data</div>|' "$GAMING_FILE"
sed -i '' 's|CRM records, booking history|CRM records, deposit & wagering history|' "$GAMING_FILE"
sed -i '' 's|ticket sales and membership data|player activity and lifetime value data|' "$GAMING_FILE"
sed -i '' 's|Name your company or describe your ideal customer...|What audience are you searching for? Who is your ideal customer?|' "$GAMING_FILE"
sed -i '' '/e\.g\. "We sell mattresses"/d' "$GAMING_FILE"
sed -i '' '/Tell us about your business, e\.g\. "We sell mattresses"/d' "$GAMING_FILE"

# 3) Inject side-by-side 3-ad panel + relabel activation section
python3 "$(dirname "$0")/gaming-postprocess.py" "$GAMING_FILE"

# Copy Gaming assets (3 ads) into the signature-segments root so base href resolves them
cp "$SOURCE_DIR/gaming-ad-1.png" "$LIVE_DIR/gaming-ad-1.png" 2>/dev/null || echo "  (gaming-ad-1.png not yet present — add it to outra-segments-site/public/ before deploying)"
cp "$SOURCE_DIR/gaming-ad-2.png" "$LIVE_DIR/gaming-ad-2.png" 2>/dev/null || echo "  (gaming-ad-2.png not yet present — add it to outra-segments-site/public/ before deploying)"
cp "$SOURCE_DIR/gaming-ad-3.png" "$LIVE_DIR/gaming-ad-3.png" 2>/dev/null || echo "  (gaming-ad-3.png not yet present — add it to outra-segments-site/public/ before deploying)"

echo "Live files ready. Now commit and push ecc-outra-event."
