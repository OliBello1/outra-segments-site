/**
 * Shared rendering helper for the Microsite Builder.
 * Used by both /api/render (Airtable-backed) and /api/render-preview (form-state-backed).
 *
 * Takes a "record" object whose shape matches an Airtable Branded Pages row
 * (field names verbatim) and returns the fully-rendered HTML string for the
 * builder-template.html shell with all 9 placeholders filled.
 */

const fs = require('fs');
const path = require('path');

let _templateCache = null;
function loadTemplate() {
  if (_templateCache) return _templateCache;
  const tplPath = path.join(__dirname, '..', 'builder-template.html');
  _templateCache = fs.readFileSync(tplPath, 'utf-8');
  return _templateCache;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }

/**
 * Inline markdown helper for editable copy.
 *
 * Users type **word** in the dashboard to highlight a word in the brand's
 * gradient/accent colour on the live page. We escape first (safe), then
 * unescape ONLY the **…** wrappers, replacing them with a `.gradient` span
 * (already styled in the template's hero CSS). No other markdown syntax
 * is supported — keep it ruthlessly simple.
 */
function renderInlineMarkdown(s) {
  const escaped = escapeHtml(s);
  // Match **non-greedy** spans across the whole string. Bold markers must
  // come in pairs; orphan ** is left as-is so accidental typos don't
  // mangle the output.
  return escaped.replace(/\*\*([^*][^*]*?)\*\*/g, function(_m, inner) {
    return '<span class="gradient">' + inner + '</span>';
  });
}

const GENERIC_CHIPS = [
  { label: 'Mattresses',          emoji: '\u{1F6CF}\u{FE0F}', query: 'We sell mattresses' },
  { label: 'Solar panels',        emoji: '\u{2600}\u{FE0F}',  query: 'Solar panel installation' },
  { label: 'Car insurance',       emoji: '\u{1F697}',         query: 'Car insurance' },
  { label: "Children's clothing", emoji: '\u{1F476}',         query: "Children's clothing brand" },
  { label: 'Estate agents',       emoji: '\u{1F3E0}',         query: 'Estate agent' },
  { label: 'Luxury retail',       emoji: '\u{1F48E}',         query: 'Luxury fashion retailer' },
  { label: 'Broadband',           emoji: '\u{1F4E1}',         query: 'Broadband provider' },
  { label: 'Garden & outdoor',    emoji: '\u{1F33F}',         query: 'Garden furniture store' },
];

function buildHeaderLogoHtml(brandName, logoUrl) {
  if (!logoUrl) {
    return '<span class="logo-partner-text">x</span><span class="logo-partner-wordmark" style="font-weight:800;font-size:22px;letter-spacing:-0.5px;color:var(--outra-navy);align-self:flex-end;line-height:1;margin-bottom:-1px;">' + escapeHtml(brandName || 'Brand') + '</span>';
  }
  // Logos are auto-trimmed + re-padded server-side at upload time
  // (branded-pages-process-logo.js → trimAndNormalisePadding), so by the time
  // we render here we can trust the bounding box hugs the artwork and a
  // fixed height matches the Outra wordmark optically.
  return '<span class="logo-partner-text">x</span><img src="' + escapeAttr(logoUrl) + '" alt="' + escapeAttr(brandName) + '" class="logo-partner-img" style="height:36px;width:auto;object-fit:contain;vertical-align:middle;">';
}

function buildFirstPartyLogoHtml(brandName, logoUrl) {
  if (!logoUrl) return '';
  // Constrain logo to a sensible bounding box. height:48px alone with
  // width:auto lets a wide-aspect-ratio brand logo (e.g. a wordmark
  // 800x200) render at ~192px wide which dominates the entry card and
  // visually squashes the rest of the diagram. max-width caps it so
  // tall logos render at full 48px height while wide logos shrink to
  // fit the column. object-fit:contain preserves aspect ratio inside
  // that bounding box.
  return '<img src="' + escapeAttr(logoUrl) + '" alt="' + escapeAttr(brandName) + '" style="display:block;height:auto;max-height:40px;width:auto;max-width:110px;margin:0 auto 14px;object-fit:contain;background:transparent;">';
}

function buildChipsBlock(chips) {
  const inner = chips.map(c => {
    const emoji = c.emoji || '';
    const sep = emoji ? '&ensp;' : '';
    let dataSegments = '';
    if (Array.isArray(c.segments) && c.segments.length) {
      const segs = c.segments.map(s => ({
        name: s.name,
        cat: s.cat,
        reason: s.reason || 'Hand-picked match',
      }));
      dataSegments = " data-segments='" + JSON.stringify(segs).replace(/'/g, '&#39;') + "'";
    }
    return '<button type="button" class="maxi-chip" data-query="' + escapeAttr(c.query || '') + '"' + dataSegments + '>' + emoji + sep + escapeHtml(c.label || '') + '</button>';
  }).join('\n      ');
  return '<div class="maxi-search-chips" id="maxiChips">\n      ' + inner + '\n    </div>';
}

function buildSearchSectionInner(record, chips, isCustom) {
  const brandName = record['Brand Name'] || '';
  const titleText = isCustom
    ? 'Find your highest-converting ' + brandName + ' audience'
    : 'Find your highest converting audience';

  const searchInner =
    '<div class="maxi-search-inner">\n' +
    '    <div class="maxi-search-label">Powered by <span class="maxi-logo-pill">&#10022; Maxi</span></div>\n' +
    '    <h2 class="maxi-search-title">' + escapeHtml(titleText) + '</h2>\n' +
    '    <form class="maxi-search-bar" id="maxiSearchForm" autocomplete="off">\n' +
    '      <input type="text" class="maxi-search-input" id="maxiSearchInput" placeholder="What audience are you searching for?" maxlength="300">\n' +
    '      <button type="button" class="maxi-search-clear" id="maxiClearBtn" aria-label="Clear search" style="display:none;">\n' +
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\n' +
    '      </button>\n' +
    '      <button type="submit" class="maxi-search-submit" aria-label="Find segments">\n' +
    '        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\n' +
    '      </button>\n' +
    '    </form>\n' +
    '    ' + buildChipsBlock(chips) + '\n' +
    '  </div>';

  if (!isCustom) {
    return '  ' + searchInner;
  }

  const ad1 = record['Ad Screenshot 1 URL'] || '';
  const ad2 = record['Ad Screenshot 2 URL'] || '';
  let adsPanel = '';
  if (ad1 || ad2) {
    adsPanel =
      '  <aside class="sig-ads-panel">\n' +
      '    <div class="sig-ads-panel-grid">\n' +
      (ad1 ? '      <img src="' + escapeAttr(ad1) + '" alt="' + escapeAttr((record['Brand Name'] || '') + ' ad') + '" class="sig-ad-img">\n' : '') +
      (ad2 ? '      <img src="' + escapeAttr(ad2) + '" alt="' + escapeAttr((record['Brand Name'] || '') + ' ad') + '" class="sig-ad-img">\n' : '') +
      '    </div>\n' +
      '  </aside>';
  }

  return '<div class="sig-search-flex">\n  ' + searchInner + '\n' + adsPanel + '\n</div>';
}

// ── Trusted-brands carousel ─────────────────────────────────────────────
// The full available roster. Each entry has a stable key (used as the
// toggle ID by the dashboard checkbox grid), the alt text shown to AT,
// and the absolute URL of the logo image (must be absolute so the iframe
// preview at outra-segments-site doesn't 404 on relative paths).
const TRUSTED_BRANDS = [
  { key: 'knight-frank',  alt: 'Knight Frank',         file: 'Knight Frank Logo.png' },
  { key: 'zoopla',        alt: 'Zoopla',               file: 'Zoopla Logo.jpg' },
  { key: 'savills',       alt: 'Savills',              file: 'Savills Logo.jpg' },
  { key: 'bt',            alt: 'BT',                   file: 'BT Logo.svg' },
  { key: 'sky',           alt: 'Sky',                  file: 'Sky Logo.png' },
  { key: 'amazon',        alt: 'Amazon',               file: 'Amazon Logo.png' },
  { key: 'sainsburys',    alt: "Sainsbury's",          file: 'Sainsburys Logo.png' },
  { key: 'dyson',         alt: 'Dyson',                file: 'Dyson Logo.png' },
  { key: 'bentley',       alt: 'Bentley',              file: 'Bentley Logo.jpg' },
  { key: 'currys',        alt: 'Currys',               file: 'Currys Logo.png' },
  { key: 'admiral',       alt: 'Admiral',              file: 'Admiral Logo.png' },
  { key: 'lbg',           alt: 'Lloyds Banking Group', file: 'LBG Logo.png' },
  { key: 'post-office',   alt: 'Post Office',          file: 'Post Office Logo.png' },
  { key: 'bando',         alt: 'Bang & Olufsen',       file: 'BandO Logo.png' },
  { key: 'purplebricks',  alt: 'Purplebricks',         file: 'Purple Bricks.png' },
  { key: 'fa',            alt: 'The FA',               file: 'FA Logo.png' },
  { key: 'volkswagen',    alt: 'Volkswagen',           file: 'VW.jpg' },
  { key: 'dayinsure',     alt: 'Dayinsure',            file: 'Dayinsure Logo.png' },
  { key: 'aviva',         alt: 'Aviva',                file: 'Aviva.png' },
];
const TRUSTED_BRANDS_BASE = 'https://outra.vip/signature-segments/Company%20Logos/';

function buildTrustedBrandsHtml(enabledKeys) {
  // Default = all enabled when caller hasn't customised the selection.
  const all = TRUSTED_BRANDS.map(b => b.key);
  const selected = (Array.isArray(enabledKeys) && enabledKeys.length > 0) ? enabledKeys : all;
  const set = new Set(selected);
  const visible = TRUSTED_BRANDS.filter(b => set.has(b.key));
  if (visible.length === 0) return ''; // empty selection hides the section entirely
  const buildSet = (ariaHidden) => {
    const attr = ariaHidden ? ' aria-hidden="true"' : '';
    const imgs = visible.map(b => {
      const url = TRUSTED_BRANDS_BASE + encodeURIComponent(b.file).replace(/%20/g, '%20');
      return '      <img src="' + escapeAttr(url) + '" alt="' + escapeAttr(b.alt) + '">';
    }).join('\n');
    return '    <div class="social-proof-set"' + attr + '>\n' + imgs + '\n    </div>';
  };
  return buildSet(false) + '\n' + buildSet(true);
}

// ── Activation channels grid ────────────────────────────────────────────
// Same pattern as TRUSTED_BRANDS: stable key per tile so the dashboard
// can toggle individual channels in/out. URLs are absolute so the
// preview iframe at outra-segments-site.vercel.app doesn't 404 on the
// old root-relative `/signature-segments/...` paths.
const CHANNEL_TILES_BASE = 'https://outra.vip/signature-segments/Channel%20Logos/tiles/';
const CHANNEL_TILES = [
  { key: 'meta',          alt: 'Meta',           file: 'meta-available.gif' },
  { key: 'google',        alt: 'Google',         file: 'google-available.gif' },
  { key: 'dv360',         alt: 'DV360',          file: 'dv360-available.gif' },
  { key: 'amazon',        alt: 'Amazon',         file: 'amazon-available.gif' },
  { key: 'tiktok',        alt: 'TikTok',         file: 'tiktok-available.gif' },
  { key: 'pinterest',     alt: 'Pinterest',      file: 'pinterest-available.gif' },
  { key: 'disney',        alt: 'Disney+',        file: 'disney-available.gif' },
  { key: 'adsmart',       alt: 'Sky AdSmart',    file: 'adsmart-available.gif' },
  { key: 'itvx',          alt: 'ITVx',           file: 'itvx-available.gif' },
  { key: 'netflix',       alt: 'Netflix',        file: 'netflix-available.gif' },
  { key: 'snap',          alt: 'Snapchat',       file: 'snap-available.gif' },
  // WhatsApp asset isn't hosted on the outra.vip Channel Logos CDN — the
  // tile was built for the Purplebricks proposal and lives at
  // proposals.outra.vip. Explicit `url` override bypasses CHANNEL_TILES_BASE.
  { key: 'whatsapp',      alt: 'WhatsApp',       file: 'whatsapp-available.gif',
    url: 'https://proposals.outra.vip/channels/whatsapp-available.gif' },
  { key: 'thetradedesk',  alt: 'The Trade Desk', file: 'thetradedesk-available.gif' },
  { key: 'lightbox',      alt: 'LightboxTV',     file: 'lightbox-available.gif' },
  { key: 'prime-video',   alt: 'Prime Video',    file: 'prime-video-available.gif' },
  { key: 'channel4',      alt: 'Channel 4',      file: 'channel4-available.gif' },
  { key: 'index-exchange',alt: 'Index Exchange', file: 'index-exchange-available.gif' },
  { key: 'magnite',       alt: 'Magnite',        file: 'magnite-coming-soon.gif' },
  { key: 'infosum',       alt: 'InfoSum',        file: 'infosum-available.gif' },
  { key: 'klaviyo',       alt: 'Klaviyo',        file: 'klaviyo-available.gif' },
  { key: 'direct-mail',   alt: 'Direct Mail',    file: 'direct-mail-available.gif' },
  { key: 'global',        alt: 'Global',         file: 'global-available.gif' },
  { key: 'openx',         alt: 'OpenX',          file: 'openx-coming-soon.gif' },
  { key: 'pubmatic',      alt: 'PubMatic',       file: 'pubmatic-coming-soon.gif' },
  { key: 'shopify',       alt: 'Shopify',        file: 'shopify-coming-soon.gif' },
];

function buildChannelTilesHtml(enabledKeys) {
  const all = CHANNEL_TILES.map(b => b.key);
  const selected = (Array.isArray(enabledKeys) && enabledKeys.length > 0) ? enabledKeys : all;
  const set = new Set(selected);
  const visible = CHANNEL_TILES.filter(b => set.has(b.key));
  if (visible.length === 0) return '';
  // Centre the trailing row when the count doesn't divide evenly into 5.
  // The template already supports `last-row-3-1/2/3` and `last-row-4-1/2/3/4`
  // helper classes — apply them to the final 3 or 4 tiles when needed.
  const remainder = visible.length % 5;
  const extraClasses = (idx) => {
    if (remainder === 0) return '';
    const tailStart = visible.length - remainder;
    if (idx < tailStart) return '';
    const offset = idx - tailStart + 1; // 1-indexed within the trailing row
    if (remainder === 3) return ' last-row-3-' + offset;
    if (remainder === 4) return ' last-row-4-' + offset;
    return '';
  };
  return visible.map((b, i) => {
    // Tile may pin an explicit `url` (used when an asset isn't on the
    // canonical Channel Logos CDN). Otherwise resolve against CHANNEL_TILES_BASE.
    const url = b.url || (CHANNEL_TILES_BASE + encodeURIComponent(b.file).replace(/%20/g, '%20'));
    const cls = 'channel-tile' + extraClasses(i);
    return '      <img src="' + escapeAttr(url) + '" alt="' + escapeAttr(b.alt) + '" class="' + cls + '">';
  }).join('\n');
}

// ── Hero "Ready to activate on" strip ──────────────────────────────────
// Two render styles, chosen via dashboard:
//   'wordmarks' — slim row of white wordmark logos (legacy hero strip)
//   'tiles'     — animated channel tile cards (max 8, 2-row grid when >4)
// We reuse CHANNEL_TILES (defined above) as the canonical channel list so
// the hero strip and the activation grid share the same set of options.
const HERO_WORDMARK_BASE = 'https://outra.vip/signature-segments/';
const HERO_WORDMARKS = [
  // Each entry maps a channel-tile key → its white-wordmark counterpart.
  // Heights tuned per logo because intrinsic dimensions vary widely.
  { key: 'index-exchange',alt: 'Index Exchange',  file: 'Index Logo.png',                       height: 20 },
  { key: 'thetradedesk',  alt: 'The Trade Desk',  file: 'The-Trade-Desk-Logo-Vector.svg-.png',  height: 20 },
  { key: 'dv360',         alt: 'DV360',           file: 'DV360 Logo.png',                       height: 20 },
  { key: 'meta',          alt: 'Meta',            file: 'Meta logo.png',                        height: 28 },
  { key: 'tiktok',        alt: 'TikTok',          file: 'TikTok Logo.png',                      height: 20 },
  { key: 'google',        alt: 'Google',          file: 'Google Logo.png',                      height: 20 },
  { key: 'amazon',        alt: 'Amazon',          file: 'Amazon_logo.svg.png',                  height: 20 },
  { key: 'adsmart',       alt: 'Sky AdSmart',     file: 'logo_adsmart_from_sky.png',            height: 20 },
];

function buildHeroAvailableHtml(style, selectedKeys) {
  const labelHtml = '<span class="hero-available-label">Ready to activate on 100<span class="hero-available-suffix">s</span> of channels including:</span>';

  if (style === 'tiles') {
    // Cala-style activation cards. The CHANNEL_TILES_BASE images are
    // pre-rendered tiles that already contain the channel logo + green
    // "Available" label built into the artwork. We just lay them out
    // in the responsive grid. 1-4 selected = single centred row,
    // 5-8 = two rows of 4. Selection order is preserved (user-draggable).
    const defaultKeys = ['meta', 'google', 'tiktok', 'thetradedesk'];
    const keysOrdered = (Array.isArray(selectedKeys) && selectedKeys.length > 0)
      ? selectedKeys.slice(0, 8)
      : defaultKeys;
    // Build a key→channel map so we can iterate in user order
    const tileMap = {};
    CHANNEL_TILES.forEach(c => { tileMap[c.key] = c; });
    const visible = keysOrdered.map(k => tileMap[k]).filter(Boolean).slice(0, 8);
    if (!visible.length) return '';
    const rowsClass = visible.length > 4 ? ' rows-2' : '';
    const tilesHtml = visible.map(c => {
      const url = CHANNEL_TILES_BASE + encodeURIComponent(c.file);
      return '<img src="' + escapeAttr(url) + '" alt="' + escapeAttr(c.alt) + '" class="hero-platform-tile">';
    }).join('\n          ');
    return '<div class="hero-available">\n        ' + labelHtml + '\n        '
      + '<div class="hero-platform-tiles' + rowsClass + '" data-count="' + visible.length + '">\n          '
      + tilesHtml
      + '\n        </div>\n      </div>';
  }

  // Default — wordmark style. Selection picks WHICH wordmarks appear and
  // in what ORDER (user-draggable). If no explicit selection, show all 8.
  const allWmKeys = HERO_WORDMARKS.map(w => w.key);
  const wmKeysOrdered = (Array.isArray(selectedKeys) && selectedKeys.length > 0)
    ? selectedKeys
    : allWmKeys;
  const wmMap = {};
  HERO_WORDMARKS.forEach(w => { wmMap[w.key] = w; });
  const visibleWm = wmKeysOrdered.map(k => wmMap[k]).filter(Boolean);
  if (!visibleWm.length) return '';
  const wmHtml = visibleWm.map(w => {
    const url = HERO_WORDMARK_BASE + encodeURIComponent(w.file);
    const styleAttr = w.height && w.height !== 20 ? ' style="height:' + w.height + 'px;"' : '';
    return '<img src="' + escapeAttr(url) + '" alt="' + escapeAttr(w.alt) + '" class="hero-platform-logo"' + styleAttr + '>';
  }).join('\n          ');
  return '<div class="hero-available">\n        ' + labelHtml + '\n        '
    + '<div class="hero-platform-logos">\n          '
    + wmHtml
    + '\n        </div>\n      </div>';
}

// ── Propensity to Buy section ─────────────────────────────────────────
// Hardcoded HTML block injected only on the MatchesFashion microsite.
// Assets live under /signature-segments/ (signal-*.png + p2b-recording.mp4).
// If/when this needs to go to other microsites, promote the values to
// Airtable fields and add per-microsite editor controls.
function buildPropensitySectionHtml(record) {
  // Relative path so assets resolve correctly whether the microsite is
  // served via outra-segments-site.vercel.app or any future custom domain.
  const ASSET_BASE = '/signature-segments/';
  const brandLogoUrl = (record && record['Logo URL']) || '';
  const brandName = (record && record['Brand Name']) || '';
  const slug = (record && record['Slug']) || '';
  // Field reader with renderer-default fallback. Existing records render
  // unchanged because every Airtable field is optional here.
  function field(key, fallback) {
    const v = record && record[key];
    return (v && String(v).trim() !== '') ? String(v) : fallback;
  }
  // Per-page overlay logo: prefer the brand's uploaded logo so every
  // page (Emma, Matches, future brands) shows its own mark. Falls back
  // to the MatchesFashion hand-tuned overlay only when no brand logo
  // is uploaded yet, so the panel never renders blank.
  const logoSrc = brandLogoUrl || (ASSET_BASE + 'matches-fashion-overlay.jpeg');
  const logoAlt = brandName || 'Brand';
  // Editable copy with sensible defaults so non-customised pages still
  // look right out of the box.
  const propensityHeadline = field('Propensity Headline',
    'Introducing Outra\u2019s <span class="gradient">household level precision targeting</span>');
  const challengesCategory = field('Propensity Category',
    (slug === 'Bacardi') ? 'premium spirits' : 'high-end fashion');
  const quote1 = field('Propensity Quote 1',
    'I suspect most of those who land on our store aren\u2019t in a position to purchase at our price point.');
  const quote2 = field('Propensity Quote 2',
    'How do we know if we are putting the right creative in front of the right audience?');
  const quote3 = field('Propensity Quote 3',
    'Our CRM segmentation is based purely on what people have done, not who they actually are.');
  const stat1Value = field('Propensity Stat 1 Value', '42\u201353%');
  const stat1Label = field('Propensity Stat 1 Label', 'reduction in wasted targeting');
  const stat2Value = field('Propensity Stat 2 Value', '22\u201328%');
  const stat2Label = field('Propensity Stat 2 Label', 'ROAS uplift');
  const caveat = field('Propensity Caveat',
    '* Based on Outra testing across leading retailers against broad and lookalike audiences.|Best results when creative and messaging is matched to the specific signature segment.');
  // Caveat is two sentences split by a pipe so each renders in its own span.
  const caveatParts = caveat.split('|');
  const caveatPart1 = (caveatParts[0] || '').trim();
  const caveatPart2 = (caveatParts[1] || '').trim();
  // Inline CSS override that's only emitted on MatchesFashion. Tightens the
  // hero headline so "Supercharging the relaunch" stays on line 1, forcing
  // the headline into a clean 3-line layout instead of 4. Scoped by being
  // emitted only for this slug \u2014 no global side effects.
  // Forces the desktop hero headline into a clean 3-line layout for the
  // current MatchesFashion copy. Tightens max-width to ~22ch so wraps fall
  // after "the relaunch", "Matches Fashion with", "high affluence audiences"
  // instead of breaking after "Supercharging" alone. Mobile rules untouched.
  // CSS-only overrides scoped to the MatchesFashion microsite.
  //  1) Hero h1 max-width tightens to force "Supercharging the relaunch"
  //     on line 1 and produce a clean 3-line hero on desktop.
  //  2) Header partner logo: the auto-trimmed wordmark renders shorter
  //     than the Outra logo because remove.bg cropped the green padding.
  //     We bump the height + paint back a green pill background (matches
  //     the original Matches Fashion identity green) so it sits at the
  //     same optical size as the outra. wordmark.
  // Header-logo pill is mint-green for MatchesFashion (matches the brand's
  // identity). Bacardi's logo is red-on-white and doesn't need a coloured
  // pill, so we leave its lockup untouched. Add other slugs to the
  // MatchesFashion branch if they need a similar pill treatment.
  const headerLogoPillCss = (slug === 'MatchesFashion')
    ? ''
      + '  .logo .logo-partner-img {\n'
      + '    height: 28px !important;\n'
      + '    padding: 6px 14px;\n'
      + '    background: #A7DCBA;\n'
      + '    border-radius: 4px;\n'
      + '    box-sizing: content-box;\n'
      + '  }\n'
    : '';
  // Propensity-section overlay tile.
  // - MatchesFashion has a hand-tuned square mint-green tile that's
  //   designed to fill the masking box edge-to-edge with object-fit:cover.
  // - Every other brand uses its uploaded Logo URL, which is usually a
  //   transparent wordmark of arbitrary aspect ratio. Cover would crop +
  //   stretch it badly (e.g. Emma's orange "mm" rendered ~3x too wide and
  //   overlapped the dashboard mock beneath). Paint a white plaque behind
  //   the logo, contain-fit it inside the tile so the aspect ratio is
  //   preserved, and shrink the box to sit cleanly in the corner.
  // For brand-uploaded logos (everything except the dedicated Matches
  // mint-green overlay), render a visible white card in the top-left
  // corner of the dashboard mock with the logo contain-fit inside. The
  // card itself is a UI tile (white background + subtle border + drop
  // shadow + ~1.6% interior padding) sized to sit cleanly over the
  // first dashboard cell without crashing into the data beneath.
  const usingDedicatedMatchesOverlay = (logoSrc.indexOf('matches-fashion-overlay') !== -1);
  // Brand-uploaded logos render inside a visible white card element that
  // sits in the top-left corner of the dashboard mock. The card itself is
  // the box (white background, border, drop shadow); the logo is contained
  // inside with padding so any logo aspect ratio renders cleanly. This
  // mirrors the Bacardi/Matches treatment from earlier proposals where the
  // logo is a UI tile rather than a bleed image.
  const propensityLogoCss = usingDedicatedMatchesOverlay
    ? ''
    : ''
      + '  .propensity-video-logo-card {\n'
      + '    position: absolute;\n'
      + '    top: 1.6%;\n'
      + '    left: 1.2%;\n'
      + '    width: 22%;\n'
      + '    height: 14%;\n'
      + '    background: #ffffff;\n'
      + '    border: 1px solid rgba(20, 24, 60, 0.08);\n'
      + '    border-radius: 6px;\n'
      + '    box-shadow: 0 4px 12px rgba(10, 19, 91, 0.10), 0 1px 2px rgba(10, 19, 91, 0.06);\n'
      + '    box-sizing: border-box;\n'
      + '    z-index: 2;\n'
      + '    display: flex;\n'
      + '    align-items: center;\n'
      + '    justify-content: center;\n'
      + '    padding: 2% 4%;\n'
      + '  }\n'
      + '  .propensity-video-logo-img {\n'
      + '    max-width: 100%;\n'
      + '    max-height: 100%;\n'
      + '    width: auto;\n'
      + '    height: 100%;\n'
      + '    object-fit: contain;\n'
      + '    display: block;\n'
      + '  }\n';
  const headlineOverride = ''
    + '<style>\n'
    + '  @media (min-width: 980px) {\n'
    /* Wider char limit lets the headline land on 2 lines at desktop
       widths now that the hero text column has been widened. The old
       22ch forced a 3-line break. */
    + '    .hero h1 { max-width: 32ch; }\n'
    + '  }\n'
    + headerLogoPillCss
    + propensityLogoCss
    + '</style>\n';
  return ''
+ headlineOverride
+ '<section class="propensity-section">\n'
+ '  <div class="propensity-inner">\n'
+ '    <div class="propensity-header">\n'
+ '      <p class="propensity-eyebrow">Every purchase has an ideal customer</p>\n'
+ '      <h2 class="propensity-headline">' + propensityHeadline + '</h2>\n'
+ '      <p class="propensity-desc">Outra signature segments are built household by household, fusing billions of verified property, financial and behavioural signals so you reach the buyers most likely to convert, not just the ones most likely to see your ad.</p>\n'
+ '    </div>\n'
+ '    <div class="propensity-body">\n'
+ '      <div class="propensity-left">\n'
+ '        <p class="propensity-aud-label">Challenges we solve for ' + escapeHtml(challengesCategory) + '</p>\n'
+ '        <div class="propensity-quotes">\n'
+ '          <blockquote class="propensity-quote">' + escapeHtml(quote1) + '</blockquote>\n'
+ '          <blockquote class="propensity-quote">' + escapeHtml(quote2) + '</blockquote>\n'
+ '          <blockquote class="propensity-quote">' + escapeHtml(quote3) + '</blockquote>\n'
+ '        </div>\n'
+ '        <p class="propensity-aud-label propensity-aud-label-stats">Retail Brands using Outra</p>\n'
+ '        <div class="propensity-stats">\n'
+ '          <div class="propensity-stat">\n'
+ '            <span class="propensity-stat-value"><span class="propensity-stat-arrow">\u2193</span>' + escapeHtml(stat1Value) + '<span class="propensity-stat-asterisk">*</span></span>\n'
+ '            <span class="propensity-stat-label">' + escapeHtml(stat1Label) + '</span>\n'
+ '          </div>\n'
+ '          <div class="propensity-stat">\n'
+ '            <span class="propensity-stat-value"><span class="propensity-stat-arrow">\u2191</span>' + escapeHtml(stat2Value) + '<span class="propensity-stat-asterisk">*</span></span>\n'
+ '            <span class="propensity-stat-label">' + escapeHtml(stat2Label) + '</span>\n'
+ '          </div>\n'
+ '        </div>\n'
+ '        <p class="propensity-caveat propensity-caveat-inline"><span>' + escapeHtml(caveatPart1) + '</span><span>' + escapeHtml(caveatPart2) + '</span></p>\n'
+ '      </div>\n'
+ '      <div class="propensity-visual">\n'
+ '        <div class="propensity-video-frame">\n'
+ '          <video autoplay muted loop playsinline preload="metadata" poster="">\n'
+ '            <source src="https://proposals.outra.vip/cala/p2b-recording.mp4#t=3" type="video/mp4">\n'
+ '          </video>\n'
+ (usingDedicatedMatchesOverlay
    ? '          <img class="propensity-video-logo" src="' + escapeAttr(logoSrc) + '" alt="' + escapeAttr(logoAlt) + '" />\n'
    : '          <div class="propensity-video-logo-card"><img class="propensity-video-logo-img" src="' + escapeAttr(logoSrc) + '" alt="' + escapeAttr(logoAlt) + '" /></div>\n')
+ '        </div>\n'
+ '      </div>\n'
+ '    </div>\n'
+ '  </div>\n'
+ '</section>';
}

// ── Team section ─────────────────────────────────────────────────────
// Polaroid-style cards on a beige background, up to 5 across at desktop.
// Per-member visibility + CTA recipient are driven by Airtable so any
// brand page can opt in. Curated copy (names, roles, emails) is fixed
// in the TEAM_MEMBERS list below.
const TEAM_MEMBERS = [
  { id: 'graham', photo: 'team-graham.jpeg', name: 'Graham Field',  role: 'CRO',                  email: 'GField@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/graham-field-1532323/' },
  { id: 'kim',    photo: 'team-kim.jpeg',    name: 'Kim Joyce',     role: 'Head of Agency Sales', email: 'KJoyce@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/kimberley-joyce-8125708b/' },
  { id: 'leo',    photo: 'team-leo.jpeg',    name: 'Leo Xiong',     role: 'Chief Data Scientist', email: 'QXiong@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/qizhou-leo-xiong-ph-d-59a08818/' },
  { id: 'jack',   photo: 'team-jack.jpeg',   name: 'Jack Edwards',  role: 'Director of Growth',   email: 'JEdwards@outra.co.uk', linkedin: 'https://www.linkedin.com/in/jack-edwards-68780916b/' },
  { id: 'oli',    photo: 'team-oli.png',     name: 'Oli Bello',     role: 'Head of Go to Market', email: 'OBello@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/olibello/' },
];

function buildTeamSectionHtml(record) {
  const ASSET_BASE = '/signature-segments/';
  const brandName = (record && record['Brand Name']) || '';
  // Per-member selection: array of member IDs to show. If unset, show all 5.
  let selection = null;
  try {
    const raw = record && record['Team Selection JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) selection = parsed.map(String);
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Team Selection JSON', e.message);
  }
  const visibleTeam = selection === null
    ? TEAM_MEMBERS
    : TEAM_MEMBERS.filter(m => selection.indexOf(m.id) !== -1);
  if (!visibleTeam.length) return '';
  // CTA recipient: dashboard picks one of the visible team members' IDs.
  // Falls back to the first visible member if unset or invalid.
  const ctaRecipientId = (record && record['Team CTA Recipient']) || '';
  const ctaMember = visibleTeam.find(m => m.id === ctaRecipientId) || visibleTeam[0];
  const cardsHtml = visibleTeam.map(m =>
    '      <div class="mf-team-card">\n'
    + '        <div class="mf-team-photo"><img src="' + escapeAttr(ASSET_BASE + m.photo) + '" alt="' + escapeAttr(m.name) + '"></div>\n'
    + '        <div class="mf-team-name">' + escapeHtml(m.name) + '</div>\n'
    + '        <div class="mf-team-role">' + escapeHtml(m.role) + '</div>\n'
    + '        <div class="mf-team-pills">\n'
    + '          <a class="mf-team-email" href="mailto:' + escapeAttr(m.email) + '" title="Email ' + escapeAttr(m.name) + '">' + escapeHtml(m.email) + '</a>\n'
    + '          <a class="mf-team-li" href="' + escapeAttr(m.linkedin) + '" target="_blank" rel="noopener" aria-label="' + escapeAttr(m.name) + ' on LinkedIn"><span class="mf-team-li-icon" aria-hidden="true"></span>LinkedIn</a>\n'
    + '        </div>\n'
    + '      </div>'
  ).join('\n');

  return ''
+ '<section class="mf-team">\n'
+ '  <div class="mf-team-inner">\n'
+ '    <h2 class="mf-team-title">Your team at Outra</h2>\n'
+ '    <p class="mf-team-sub">A senior team supporting ' + escapeHtml(brandName || 'your brand') + ' across Marketing, Retail, Ecom and data science ensuring you get the most value out of your signature audiences.</p>\n'
+ '    <div class="mf-team-grid">\n'
+ cardsHtml + '\n'
+ '    </div>\n'
+ '    <div class="mf-team-cta-wrap">\n'
+ '      <a class="mf-team-cta" href="mailto:' + escapeAttr(ctaMember.email) + '">Talk to the team</a>\n'
+ '    </div>\n'
+ '  </div>\n'
+ '</section>';
}

// ── Case studies section (hardcoded for MatchesFashion only) ─────────
// Mirrors slide 7 of the master Outra Case Studies deck: 5 cards
// (sky / currys / AJI / Lloyds / dayinsure) with brand logo + headline
// stat + supporting line + a baked illustration at the bottom. The
// illustrations are extracted from the deck verbatim (see /signature-
// segments/cs-*.png). Promoted to a standalone function so a future
// builder toggle can switch it on for other brands.
// Curated case-study cards. Reps pick which ones appear per page via
// the dashboard's Case Studies section toggles; they can't edit the copy.
const CASE_STUDY_CARDS = [
  { id: 'sky',       file: 'cs-sky.png',       stat: '10x',                  headline: 'household level understanding',     body: 'by partnering with Outra.' },
  { id: 'currys',    file: 'cs-currys.png',    stat: 'Reached 95%',          headline: 'of all recent UK home movers',      body: 'in their 3-month campaign.' },
  { id: 'aji',       file: 'cs-aji.png',       stat: '488%',                 headline: 'performance uplift',                body: 'using Outra\u2019s U/HNW segmentation for Meta campaigns.' },
  { id: 'lloyds',    file: 'cs-lloyds.png',    stat: 'Improved efficiency',  headline: 'by re-engaging households',         body: 'likely to remortgage or release equity in the next 6 months.' },
  { id: 'dayinsure', file: 'cs-dayinsure.png', stat: '25% lower CPA',        headline: '& 41% higher ROAS',                 body: 'with Outra UPRN-based modelling.' },
];

function buildCaseStudiesHtml(record) {
  const ASSET_BASE = '/signature-segments/';
  // Per-card selection from Airtable. If unset, render all 5.
  let selection = null;
  try {
    const raw = record && record['Case Studies Selection JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) selection = parsed.map(String);
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Case Studies Selection JSON', e.message);
  }
  const cards = selection === null
    ? CASE_STUDY_CARDS
    : CASE_STUDY_CARDS.filter(c => selection.indexOf(c.id) !== -1);
  if (!cards.length) return '';
  let html = '';
  html += '<section class="mf-cs">\n';
  html += '  <div class="mf-cs-inner">\n';
  html += '    <h2 class="mf-cs-title">Outra delivering for <span class="gradient">household brands</span></h2>\n';
  html += '    <div class="mf-cs-grid">\n';
  cards.forEach(c => {
    html += '      <article class="mf-cs-card" style="background-image:url(\'' + ASSET_BASE + c.file + '\')">\n';
    html += '        <div class="mf-cs-card-text">\n';
    html += '          <div class="mf-cs-card-stat">' + escapeHtml(c.stat) + '</div>\n';
    html += '          <div class="mf-cs-card-headline">' + escapeHtml(c.headline) + '</div>\n';
    html += '          <div class="mf-cs-card-body">' + escapeHtml(c.body) + '</div>\n';
    html += '        </div>\n';
    html += '      </article>\n';
  });
  html += '    </div>\n';
  html += '  </div>\n';
  html += '</section>';
  return html;
}

function buildChannelsCopy(record) {
  const brandName = record['Brand Name'] || '';
  const isAgency = record['Audience Type'] === 'Agency';
  // Default heading depends on audience type, but the user can override
  // it via the dashboard ("Channels Heading" field). Override wins when set.
  const headingOverride = record['Channels Heading'];
  const heading = (headingOverride && String(headingOverride).trim() !== '')
    ? String(headingOverride)
    : (isAgency ? "Activate where your clients' audiences are" : 'Activate wherever your audience is');
  return {
    heading,
    subcopy: isAgency
      ? "Your clients' audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, and CRM platforms."
      : (brandName || 'Brand') + ' audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, and CRM platforms.',
  };
}

/**
 * Closed-loop attribution section copy.
 *
 * Every field is editable via Airtable (Closed Loop Title, Closed Loop Sub,
 * Closed Loop Eyebrow, Closed Loop Caption, plus per-card Num/Title/Body
 * fields). Falls back to the canonical copy when a field is blank so
 * existing records don't have to be backfilled to keep rendering.
 *
 * Card ordering on the page (matching the orbiting house flow):
 *   left col   = 01 UNDERSTAND (top)  /  04 TRACK (bottom)
 *   right col  = 03 ACTIVATE (top)    /  02 TARGET (bottom)
 */
function buildClosedLoopCopy(record) {
  function field(key, fallback) {
    const v = record[key];
    return (v && String(v).trim() !== '') ? String(v) : fallback;
  }
  return {
    eyebrow: field('Closed Loop Eyebrow', 'One identifier. Every channel.'),
    title:   field('Closed Loop Title',   'Reach the same audience again and again with one persistent identifier.'),
    sub:     field('Closed Loop Sub',     'A single persistent identifier lets you target the same audience consistently across platforms, then return to them with the next message, the next offer, the next campaign. The same person isn\u2019t a stranger every time you re-engage.'),
    caption: field('Closed Loop Caption', 'Each household is a persistent identifier'),
    card1: {
      num:   field('Closed Loop Card 1 Num',   '01. UNDERSTAND'),
      title: field('Closed Loop Card 1 Title', 'Resolve to a single identifier'),
      body:  field('Closed Loop Card 1 Body',  'Connect & enrich your data into one persistent identifier, with 25+ verified attributes per profile.'),
    },
    card2: {
      num:   field('Closed Loop Card 2 Num',   '02. TARGET'),
      title: field('Closed Loop Card 2 Title', 'Build smarter audiences'),
      body:  field('Closed Loop Card 2 Body',  'Define audiences once against the identifier, then reuse them everywhere without re-identification or audience leakage.'),
    },
    card3: {
      num:   field('Closed Loop Card 3 Num',   '03. ACTIVATE'),
      title: field('Closed Loop Card 3 Title', 'Reach them across every channel'),
      body:  field('Closed Loop Card 3 Body',  'Push the same audience to Meta, Google, TikTok, CTV and 25+ platforms, then come back to the same identifier next campaign.'),
    },
    card4: {
      num:   field('Closed Loop Card 4 Num',   '04. TRACK'),
      title: field('Closed Loop Card 4 Title', 'Match outcomes back to the same identifier'),
      body:  field('Closed Loop Card 4 Body',  'Every impression, click and conversion ties back to the same identifier that saw the ad. Measurable end-to-end.'),
    },
  };
}

// ── First-party 4-column flow copy + HTML builders (added 2026-05-15) ──
// Every field is editable via Airtable. Falls back to canonical defaults
// when blank so existing records render unchanged.
// New rich format (added 2026-05-15 v2): each item is {key, value, enriched}.
// String items are still accepted for backward-compat — they render as a
// flat label with no value (matches the original 2026-05-15 v1 design).
// Default CRM properties for the Klaviyo profile card.
// - Non-enriched rows (Email, Address) render in the "Klaviyo only" state.
// - Enriched rows render when the card toggles to "Enriched by Outra" and
//   match the generic 6-attribute set used across all branded pages:
//   Purchasing power / Life Stage / Move stage / Household Type /
//   Household Build / Garden.
// All rows are editable per-page from the dashboard (Section 7 →
// Custom properties).
const DEFAULT_CRM_PROPERTIES = [
  { key: 'Email',            value: 'sarah.jones@email.com',     enriched: false },
  { key: 'Address',          value: '40 Kingwood Rd, London SW6 6SR', enriched: false },
  { key: 'Purchasing power', value: 'Very high',                 enriched: true  },
  { key: 'Life Stage',       value: 'Family with Teenagers',     enriched: true  },
  { key: 'Move stage',       value: 'Just moving',               enriched: true  },
  { key: 'Household Type',   value: 'Detached',                  enriched: true  },
  { key: 'Household Build',  value: 'New Build',                 enriched: true  },
  { key: 'Garden',           value: 'Yes',                       enriched: true  },
];
const DEFAULT_SCORE_BARS = [
  { label: 'Seg 1.1', pct: '10.2%', color: '#09AFCF', width: '41%' },
  { label: 'Seg 1.3', pct: '14.0%', color: '#00B050', width: '56%' },
  { label: 'Seg 2.3', pct: '25.0%', color: '#FF0000', width: '100%' },
  { label: 'Seg 3.2', pct: '5.2%',  color: '#C571CB', width: '21%' },
  { label: 'Seg 3.3', pct: '22.9%', color: '#5A87C4', width: '92%' },
];
// 6 generic insight cards by default — fills the 3x2 Actionable Insight
// grid so the column doesn't have white space at the bottom. Brand-
// specific copy is editable per-page from the dashboard (Section 7
// "First-party data" → Insight cards).
const DEFAULT_INSIGHT_CARDS = [
  { count: '667',   title: 'High churn risk',     tone: 'retain' },
  { count: '1,712', title: 'High value VIPs',     tone: 'retain' },
  { count: '942',   title: 'Lapsed customers',    tone: 'retain' },
  { count: '1,284', title: 'Lookalike prospects', tone: 'grow'   },
  { count: '823',   title: 'Premium upgraders',   tone: 'grow'   },
  { count: '3,494', title: 'Family campaigns',    tone: 'grow'   },
];

function buildCrmBadgeHtml(text, enabled) {
  if (!enabled) return '';
  const t = (text == null ? '' : String(text)).trim();
  if (!t) return '';
  return '<span class="csf-col-tag tag-crm">' + escapeHtml(t) + '</span>';
}

function buildCrmPropertiesHtml(jsonStr) {
  let items = DEFAULT_CRM_PROPERTIES;
  try {
    if (jsonStr) {
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (Array.isArray(parsed) && parsed.length) items = parsed;
    }
  } catch (e) {
    console.warn('[render-helper] could not parse CRM Properties JSON', e.message);
  }
  // Split into two lists so the .is-enriched toggle on .csf-profile can
  // animate the enriched rows in/out while the base rows stay visible.
  // Legacy string items (pre-rich format) render as non-enriched rows
  // with a flat label and no value.
  const baseRows = [];
  const enrichedRows = [];
  items.forEach(function(p) {
    if (typeof p === 'string') {
      const lbl = escapeHtml(p);
      baseRows.push('<div class="csf-profile-row"><span class="csf-pr-label">' + lbl + '</span><span class="csf-pr-val"></span></div>');
      return;
    }
    const key = escapeHtml(String((p && p.key) || ''));
    const value = (p && p.value != null) ? escapeHtml(String(p.value)) : '';
    const row = '<div class="csf-profile-row"><span class="csf-pr-label">' + key + '</span><span class="csf-pr-val">' + value + '</span></div>';
    if (p && p.enriched) enrichedRows.push(row); else baseRows.push(row);
  });
  let html = '<div class="csf-profile-list">\n          ' + baseRows.join('\n          ') + '\n        </div>';
  if (enrichedRows.length) {
    html += '\n        <div class="csf-profile-list csf-profile-enriched">\n          ' + enrichedRows.join('\n          ') + '\n        </div>';
  }
  return html;
}

function buildScoreRfv4Html(record) {
  const enabledRaw = record['Score RFV Row 4 Enabled'];
  if (!enabledRaw) return '';
  const label = (record['Score RFV Row 4 Label'] && String(record['Score RFV Row 4 Label']).trim())
    ? String(record['Score RFV Row 4 Label']) : 'Ownership';
  let pills = [{ label: 'Renter', active: true }, { label: 'Buyer', active: false }];
  try {
    const raw = record['Score RFV Row 4 Pills JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length) pills = parsed;
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Score RFV Row 4 Pills JSON', e.message);
  }
  const pillsHtml = pills.map(function(p) {
    const lbl = escapeHtml(String((p && p.label) || ''));
    const cls = (p && p.active) ? 'csf-rfv-pill rfv-active' : 'csf-rfv-pill';
    return '<span class="' + cls + '">' + lbl + '</span>';
  }).join('');
  return '<div class="csf-rfv-row csf-rfv-row-custom">' +
    '<div class="csf-rfv-label">' + escapeHtml(label) + '</div>' +
    '<div class="csf-rfv-pills">' + pillsHtml + '</div>' +
    '</div>';
}

// Derive a single-letter avatar fallback from the profile name, e.g.
// "Sarah Jones" → "S". Falls back to "?" when no name is set.
function buildCrmProfileInitial(name) {
  const trimmed = (name == null ? '' : String(name)).trim();
  if (!trimmed) return '?';
  return escapeHtml(trimmed.charAt(0));
}

function buildScoreBarsHtml(jsonStr) {
  let bars = DEFAULT_SCORE_BARS;
  try {
    if (jsonStr) {
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (Array.isArray(parsed) && parsed.length) bars = parsed;
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Score Bars JSON', e.message);
  }
  return bars.map(function(b, i) {
    const label = escapeHtml(String(b.label || ''));
    const pct = escapeHtml(String(b.pct || ''));
    const color = escapeAttr(String(b.color || '#5A87C4'));
    const width = escapeAttr(String(b.width || '50%'));
    // Derive data-seg from the label by stripping a leading "Seg " so the
    // RFV cycle animation in the template can still highlight the matching
    // bar (it looks up bars by seg='1.1', '1.3', ...). Falls back to an
    // index-based key when the label doesn't follow the pattern.
    const derivedSeg = String(b.label || '').replace(/^seg\s+/i, '').trim();
    const seg = escapeAttr(String(b.seg || derivedSeg || ('s' + (i + 1))));
    return '<div class="csf-seg-bar" data-seg="' + seg + '"><div class="csf-seg-bar-fill" style="background:' + color + ';" data-width="' + width + '">' + label + '</div><span class="csf-seg-bar-pct">' + pct + '</span></div>';
  }).join('\n              ');
}

function buildInsightCardsHtml(jsonStr) {
  let cards = DEFAULT_INSIGHT_CARDS;
  try {
    if (jsonStr) {
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (Array.isArray(parsed) && parsed.length) cards = parsed;
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Insight Cards JSON', e.message);
  }
  // Cap at 6 to keep the 3x2 grid intact; extra cards are dropped.
  if (cards.length > 6) cards = cards.slice(0, 6);
  return cards.map(function(c) {
    const tone = (String(c.tone || 'retain') === 'grow') ? 'dot-grow' : 'dot-retain';
    const count = escapeHtml(String(c.count || ''));
    const title = escapeHtml(String(c.title || ''));
    return '<div class="csf-action-card">' +
      '<div class="csf-action-card-dot ' + tone + '"></div>' +
      '<div><div class="csf-action-card-count">' + count + '</div><div class="csf-action-card-title">' + title + '</div></div>' +
      '</div>';
  }).join('\n            ');
}

function buildFirstPartySectionCopy(record) {
  function field(key, fallback) {
    const v = record[key];
    return (v && String(v).trim() !== '') ? String(v) : fallback;
  }
  const crmBadgeEnabledRaw = record['CRM Badge Enabled'];
  const crmBadgeEnabled = (crmBadgeEnabledRaw === undefined || crmBadgeEnabledRaw === null)
    ? true
    : !!crmBadgeEnabledRaw;
  const profileName = field('CRM Profile Name', 'Sarah Jones');
  return {
    crmHeading:    field('CRM Heading', 'CRM'),
    crmBadgeHtml:  buildCrmBadgeHtml(field('CRM Badge', 'Klaviyo only'), crmBadgeEnabled),
    crmPropertiesHtml: buildCrmPropertiesHtml(record['CRM Properties JSON']),
    // Profile card (added 2026-05-15 v2)
    crmProfileName: profileName,
    crmProfileInitial: buildCrmProfileInitial(profileName),
    crmProfileSubtitle: field('CRM Profile Subtitle', 'Klaviyo profile · ID 184273'),
    crmToggleLeft:  field('CRM Toggle Left',  'Klaviyo only'),
    crmToggleRight: field('CRM Toggle Right', 'Enriched by Outra'),
    crmStat1Value: field('CRM Stat 1 Value', '25+'),
    crmStat1Label: field('CRM Stat 1 Label', 'Attributes added'),
    crmStat2Value: field('CRM Stat 2 Value', '98%'),
    crmStat2Label: field('CRM Stat 2 Label', 'Match rate'),
    crmStat3Value: field('CRM Stat 3 Value', '<24h'),
    crmStat3Label: field('CRM Stat 3 Label', 'Refresh time'),
    scoreTitle:    field('Score Title', 'Mover Value Scoring'),
    scoreRfvR:     field('Score RFV R', 'Recency'),
    scoreRfvF:     field('Score RFV F', 'Frequency'),
    scoreRfvV:     field('Score RFV V', 'Value'),
    scoreRfv4Html: buildScoreRfv4Html(record),
    scoreBarsHtml: buildScoreBarsHtml(record['Score Bars JSON']),
    insightTitle:  field('Insight Title', 'Actionable Insight'),
    insightCardsHtml: buildInsightCardsHtml(record['Insight Cards JSON']),
    activateTitle: field('Activate Title', 'Target & Activate'),
    activateBullet1: field('Activate Bullet 1', 'Build custom segments from enriched data'),
    activateBullet2: field('Activate Bullet 2', 'Find lookalikes of your best customers'),
    activateBullet3: field('Activate Bullet 3', 'Activate across programmatic, social and CTV'),
  };
}

// Slugs that opt in to the heavily-bespoke MatchesFashion layout extras —
// propensity-to-buy section, case-studies grid, team polaroid cards, the
// "Talk to the team" header button and the hardcoded benefit-led bullet
// copy. Headline copy is intentionally NOT shared because the original
// "Supercharge the Matches relaunch" string is brand-specific. Add a new
// slug here to opt that brand in to the full layout; ship Airtable
// toggles when a fourth brand wants the same.
const BRANDED_LAYOUT_SLUGS = new Set(['MatchesFashion', 'Bacardi']);
function hasBrandedLayout(record) {
  return BRANDED_LAYOUT_SLUGS.has(record && record['Slug']);
}

function renderHtml(record) {
  const brandName = record['Brand Name'] || '';
  const logoUrl = record['Logo URL'] || '';
  const isCustom = record['Search Mode'] === 'Custom';

  let chips = GENERIC_CHIPS;
  if (isCustom) {
    try {
      const raw = record['Custom Chips JSON'];
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length) chips = parsed;
      }
    } catch (e) {
      console.warn('[render-helper] could not parse Custom Chips JSON', e.message);
    }
  }

  // ── Hero headline — toggleable override ──
  // Default keeps the existing "Signature Audiences for {brand}" pattern.
  // Users can override with custom copy, and **wrap words in double-asterisks**
  // to highlight them in the brand gradient colour.
  const defaultHeroHeadline = 'Signature Audiences for **' + (brandName || 'Brand') + '**';
  const heroHeadlineRaw = (record['Hero Headline'] != null && String(record['Hero Headline']).trim() !== '')
    ? String(record['Hero Headline']) : defaultHeroHeadline;
  let heroHeadlineHtml = renderInlineMarkdown(heroHeadlineRaw);
  // MatchesFashion-specific copy + line-break override. Replaces whatever
  // is in Airtable's Hero Headline with the shorter approved copy that
  // breaks cleanly into 3 lines at every viewport width.
  //   Line 1: "Supercharge the Matches Fashion"
  //   Line 2: "relaunch with"
  //   Line 3: "high affluence audiences"
  if (record['Slug'] === 'MatchesFashion') {
    // 3-line target: let "Supercharge the Matches relaunch with" wrap
    // naturally on lines 1 + 2, force a break before the gradient phrase
    // so it stays on its own line at the bottom.
    //   Line 1: "Supercharge the Matches"
    //   Line 2: "relaunch with"
    //   Line 3: "high affluence audiences"
    heroHeadlineHtml = 'Supercharge the <span class="gradient">Matches</span> relaunch<br>'
      + 'with <span class="gradient">high affluence audiences</span>';
  }

  // ── Hero bullets — editable, with sensible defaults if omitted ──
  // Up to 3 bullets supported. Bullets 1+2 always render; bullet 3 only
  // renders if a value is present (so existing 2-bullet pages aren't
  // forced to surface an empty third <li>).
  // MatchesFashion gets a hardcoded slug-gated copy override — Frederick's
  // feedback flagged the existing default copy as feature-led rather than
  // benefit-led, so we override regardless of the Airtable values for
  // this specific microsite.
  const defaultBullet1 = 'Household-level precision audiences built on 75bn+ verified UK data signals. Reach high-affluence families and multi-bedroom households actively in the market, privacy-first and GDPR compliant.';
  const defaultBullet2 = 'Ready to activate across programmatic, paid social and addressable TV to drive sales and grow brand reach.';
  const defaultBullet3 = '';
  let heroBullet1, heroBullet2, heroBullet3;
  if (hasBrandedLayout(record)) {
    heroBullet1 = 'Precision targeting that reaches only audiences affluent enough to actually buy.';
    heroBullet2 = 'One spine to your marketing. Household-level data driving every campaign off a single source of truth.';
    heroBullet3 = 'Close the loop on what\u2019s actually driving sales, and use those signals to power future campaigns.';
  } else {
    heroBullet1 = (record['Hero Bullet 1'] != null && String(record['Hero Bullet 1']).trim() !== '')
      ? String(record['Hero Bullet 1']) : defaultBullet1;
    heroBullet2 = (record['Hero Bullet 2'] != null && String(record['Hero Bullet 2']).trim() !== '')
      ? String(record['Hero Bullet 2']) : defaultBullet2;
    heroBullet3 = (record['Hero Bullet 3'] != null && String(record['Hero Bullet 3']).trim() !== '')
      ? String(record['Hero Bullet 3']) : defaultBullet3;
  }
  let heroBulletsHtml =
    '<li>' + renderInlineMarkdown(heroBullet1) + '</li>\n        ' +
    '<li>' + renderInlineMarkdown(heroBullet2) + '</li>';
  if (heroBullet3 && heroBullet3.trim() !== '') {
    heroBulletsHtml += '\n        <li>' + renderInlineMarkdown(heroBullet3) + '</li>';
  }

  // ── Trusted brands — opt-in/opt-out per logo ──
  let trustedKeys = null;
  try {
    const raw = record['Trusted Brands JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) trustedKeys = parsed;
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Trusted Brands JSON', e.message);
  }
  const trustedBrandsHtml = buildTrustedBrandsHtml(trustedKeys);

  // ── Activation channel tiles — opt-in/opt-out per channel ──
  let channelKeys = null;
  try {
    const raw = record['Channel Tiles JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) channelKeys = parsed;
    }
  } catch (e) {
    console.warn('[render-helper] could not parse Channel Tiles JSON', e.message);
  }
  const channelTilesHtml = buildChannelTilesHtml(channelKeys);

  // ── Get In Touch (header CTA + bottom contact form) ──
  // Default = ON. Toggled OFF via dashboard for proposals where the
  // contact path is handled elsewhere (e.g. direct sales follow-up).
  // MatchesFashion overrides: bottom CTA section is excised, but the
  // header still gets a "Talk to the team" button that scrolls down to
  // the new team section instead of the (removed) contact form.
  // Airtable returns `undefined` for unchecked checkbox fields, not `false`,
  // so the old `!== false` check rendered the CTA on every page where the
  // toggle had been turned off via the dashboard. Require an explicit
  // `true` value so unchecked = hidden, matching the dashboard's
  // "Hide contact form" button.
  const ctaEnabled = !hasBrandedLayout(record)
    && record['Get In Touch Enabled'] === true;
  let headerCtaHtml = '';
  if (hasBrandedLayout(record)) {
    headerCtaHtml = '<button class="header-cta" onclick="document.querySelector(\'.mf-team\').scrollIntoView({behavior:\'smooth\'})">Talk to the team</button>';
  } else if (ctaEnabled) {
    headerCtaHtml = '<button class="header-cta" onclick="document.querySelector(\'.cta-section\').scrollIntoView({behavior:\'smooth\'})">Get in Touch</button>';
  }

  // ── First-party data section (Advanced customer understanding) ──
  // Default = ON. Toggle OFF when the audience doesn't have first-party
  // data to enrich (e.g. brand awareness pitches).
  const firstPartyEnabled = record['First Party Enabled'] !== false; // undefined → true

  // ── Activation Channels section (logo grid) ──
  // Default = ON. Toggle OFF when the deck/proposal shouldn't include
  // the channels grid (e.g. data-only / measurement-only pitches).
  const channelsEnabled = record['Channels Enabled'] !== false; // undefined → true

  // ── Closed-Loop Attribution section (separate diagram below channels) ──
  // Default = ON. Tells the "one persistent identifier → activation →
  // attribution → optimisation" story for closed-loop measurement.
  // Branded-layout slugs (MatchesFashion, Bacardi) force this ON
  // regardless of the Airtable toggle so the section ships consistently
  // on those pages even if an old record had the toggle flipped off.
  const closedLoopEnabled = hasBrandedLayout(record)
    ? true
    : record['Closed Loop Enabled'] !== false; // undefined → true

  // ── Hero "Ready to activate on" strip ──
  // Two render styles + selection of which channels appear. See
  // buildHeroAvailableHtml() above.
  const heroAvailableStyle = record['Hero Available Style'] === 'tiles' ? 'tiles' : 'wordmarks';
  let heroAvailableKeys = null;
  try {
    const raw = record['Hero Available Keys JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) heroAvailableKeys = parsed;
    }
  } catch (e) {}
  const heroAvailableHtml = buildHeroAvailableHtml(heroAvailableStyle, heroAvailableKeys);

  const channels = buildChannelsCopy(record);
  const closedLoop = buildClosedLoopCopy(record);
  const firstParty = buildFirstPartySectionCopy(record);

  // ── Propensity to Buy section (hardcoded for MatchesFashion only) ──
  // Renders between social-proof and the Maxi search section. Currently
  // Renders on every page; the per-page overlay logo uses the brand's
  // own Logo URL (uploaded via the dashboard) instead of the legacy
  // matches-fashion-overlay.jpeg. Editable copy (headline, 3 quotes,
  // challenges category) reads from Airtable with renderer defaults
  // when blank, so existing records render unchanged.
  const propensitySectionHtml = buildPropensitySectionHtml(record);

  // ── Case studies section (opt-in via Airtable "Case Studies Enabled") ──
  // Show/hide the whole section per page. Per-card visibility comes from
  // "Case Studies Selection JSON" inside buildCaseStudiesHtml.
  const caseStudiesEnabled = (record['Case Studies Enabled'] === true)
    || (record['Case Studies Enabled'] === undefined && hasBrandedLayout(record));
  const caseStudiesSectionHtml = caseStudiesEnabled
    ? buildCaseStudiesHtml(record)
    : '';

  // ── Team section (opt-in via Airtable "Team Enabled") ──
  // Show/hide the whole section per page. Per-member visibility +
  // CTA recipient come from buildTeamSectionHtml itself.
  const teamEnabled = (record['Team Enabled'] === true)
    || (record['Team Enabled'] === undefined && hasBrandedLayout(record));
  const teamSectionHtml = teamEnabled
    ? buildTeamSectionHtml(record)
    : '';

  const replacements = {
    PAGE_TITLE: 'Outra x ' + (brandName || 'Brand') + ' - Signature Audiences',
    BRAND_NAME: escapeHtml(brandName || 'Brand'),
    HEADER_LOGO_HTML: buildHeaderLogoHtml(brandName, logoUrl),
    HEADER_CTA_HTML: headerCtaHtml,
    SEARCH_SECTION_INNER: buildSearchSectionInner(record, chips, isCustom),
    HERO_HEADLINE_HTML: heroHeadlineHtml,
    HERO_BULLETS_HTML: heroBulletsHtml,
    HERO_AVAILABLE_HTML: heroAvailableHtml,
    TRUSTED_BRANDS_HTML: trustedBrandsHtml,
    CHANNEL_TILES_HTML: channelTilesHtml,
    CHANNELS_HEADING: renderInlineMarkdown(channels.heading),
    CHANNELS_SUBCOPY: escapeHtml(channels.subcopy),
    CLOSED_LOOP_EYEBROW: escapeHtml(closedLoop.eyebrow),
    CLOSED_LOOP_TITLE: renderInlineMarkdown(closedLoop.title),
    CLOSED_LOOP_SUB: escapeHtml(closedLoop.sub),
    CLOSED_LOOP_CAPTION: escapeHtml(closedLoop.caption),
    CL_CARD_1_NUM: escapeHtml(closedLoop.card1.num),
    CL_CARD_1_TITLE: escapeHtml(closedLoop.card1.title),
    CL_CARD_1_BODY: escapeHtml(closedLoop.card1.body),
    CL_CARD_2_NUM: escapeHtml(closedLoop.card2.num),
    CL_CARD_2_TITLE: escapeHtml(closedLoop.card2.title),
    CL_CARD_2_BODY: escapeHtml(closedLoop.card2.body),
    CL_CARD_3_NUM: escapeHtml(closedLoop.card3.num),
    CL_CARD_3_TITLE: escapeHtml(closedLoop.card3.title),
    CL_CARD_3_BODY: escapeHtml(closedLoop.card3.body),
    CL_CARD_4_NUM: escapeHtml(closedLoop.card4.num),
    CL_CARD_4_TITLE: escapeHtml(closedLoop.card4.title),
    CL_CARD_4_BODY: escapeHtml(closedLoop.card4.body),
    FIRST_PARTY_LOGO_HTML: buildFirstPartyLogoHtml(brandName, logoUrl),
    // Editable Entry-column copy with renderer-default fallback. Existing
    // rows render unchanged because every field falls back to the value
    // it had when hardcoded.
    FIRST_PARTY_HEADING: escapeHtml(
      (record['First Party Heading'] && String(record['First Party Heading']).trim())
        ? String(record['First Party Heading'])
        : ((brandName || 'Brand') + ' first party customer data')
    ),
    FIRST_PARTY_DESC: escapeHtml(
      (record['First Party Desc'] && String(record['First Party Desc']).trim())
        ? String(record['First Party Desc'])
        : 'CRM records, order history, email lists, sales and customer reviews — matched and enriched at household level.'
    ),
    FIRST_PARTY_METRIC_1_VALUE: escapeHtml(
      (record['First Party Metric 1 Value'] && String(record['First Party Metric 1 Value']).trim())
        ? String(record['First Party Metric 1 Value']) : '754k'
    ),
    FIRST_PARTY_METRIC_1_LABEL: escapeHtml(
      (record['First Party Metric 1 Label'] && String(record['First Party Metric 1 Label']).trim())
        ? String(record['First Party Metric 1 Label']) : 'Profiles'
    ),
    FIRST_PARTY_METRIC_2_VALUE: escapeHtml(
      (record['First Party Metric 2 Value'] && String(record['First Party Metric 2 Value']).trim())
        ? String(record['First Party Metric 2 Value']) : '83%'
    ),
    FIRST_PARTY_METRIC_2_LABEL: escapeHtml(
      (record['First Party Metric 2 Label'] && String(record['First Party Metric 2 Label']).trim())
        ? String(record['First Party Metric 2 Label']) : 'Match rate'
    ),
    FIRST_PARTY_DISCLAIMER: escapeHtml(
      (record['First Party Disclaimer'] && String(record['First Party Disclaimer']).trim())
        ? String(record['First Party Disclaimer']) : '*all figures illustrative'
    ),
    CRM_HEADING: escapeHtml(firstParty.crmHeading),
    CRM_BADGE_HTML: firstParty.crmBadgeHtml,
    CRM_PROPERTIES_HTML: firstParty.crmPropertiesHtml,
    CRM_PROFILE_NAME: escapeHtml(firstParty.crmProfileName),
    CRM_PROFILE_INITIAL: firstParty.crmProfileInitial,
    CRM_PROFILE_SUBTITLE: escapeHtml(firstParty.crmProfileSubtitle),
    CRM_TOGGLE_LEFT: escapeHtml(firstParty.crmToggleLeft),
    CRM_TOGGLE_RIGHT: escapeHtml(firstParty.crmToggleRight),
    CRM_STAT_1_VALUE: escapeHtml(firstParty.crmStat1Value),
    CRM_STAT_1_LABEL: escapeHtml(firstParty.crmStat1Label),
    CRM_STAT_2_VALUE: escapeHtml(firstParty.crmStat2Value),
    CRM_STAT_2_LABEL: escapeHtml(firstParty.crmStat2Label),
    CRM_STAT_3_VALUE: escapeHtml(firstParty.crmStat3Value),
    CRM_STAT_3_LABEL: escapeHtml(firstParty.crmStat3Label),
    SCORE_TITLE: escapeHtml(firstParty.scoreTitle),
    SCORE_RFV_R: escapeHtml(firstParty.scoreRfvR),
    SCORE_RFV_F: escapeHtml(firstParty.scoreRfvF),
    SCORE_RFV_V: escapeHtml(firstParty.scoreRfvV),
    SCORE_RFV_ROW_4_HTML: firstParty.scoreRfv4Html,
    SCORE_BARS_HTML: firstParty.scoreBarsHtml,
    INSIGHT_TITLE: escapeHtml(firstParty.insightTitle),
    INSIGHT_CARDS_HTML: firstParty.insightCardsHtml,
    ACTIVATE_TITLE: escapeHtml(firstParty.activateTitle),
    ACTIVATE_BULLET_1: escapeHtml(firstParty.activateBullet1),
    ACTIVATE_BULLET_2: escapeHtml(firstParty.activateBullet2),
    ACTIVATE_BULLET_3: escapeHtml(firstParty.activateBullet3),
    PROPENSITY_SECTION_HTML: propensitySectionHtml,
    CASE_STUDIES_SECTION_HTML: caseStudiesSectionHtml,
    TEAM_SECTION_HTML: teamSectionHtml,
  };

  let html = loadTemplate();
  html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in replacements) return replacements[key];
    console.warn('[render-helper] unfilled placeholder:', match);
    return '';
  });

  // Strip the entire CTA section block when disabled. Markers are placed
  // as <!-- CTA_START --> ... <!-- CTA_END --> in the template so we
  // can excise the whole multiline block in one regex pass.
  if (!ctaEnabled) {
    html = html.replace(/<!--\s*CTA_START\s*-->[\s\S]*?<!--\s*CTA_END\s*-->/g, '');
  }
  // Same approach for the first-party section block.
  if (!firstPartyEnabled) {
    html = html.replace(/<!--\s*FIRST_PARTY_START\s*-->[\s\S]*?<!--\s*FIRST_PARTY_END\s*-->/g, '');
  }
  // Channels grid section toggle.
  if (!channelsEnabled) {
    html = html.replace(/<!--\s*CHANNELS_START\s*-->[\s\S]*?<!--\s*CHANNELS_END\s*-->/g, '');
  }
  // Closed-loop attribution section toggle.
  if (!closedLoopEnabled) {
    html = html.replace(/<!--\s*CLOSED_LOOP_START\s*-->[\s\S]*?<!--\s*CLOSED_LOOP_END\s*-->/g, '');
  }

  // ── Live-update bridge for the dashboard preview iframe ───────────────
  // The dashboard posts {type:'mb-update', patch:{heroHeadline,...}} into
  // the iframe whenever the user types a text-only edit, so we can patch
  // the DOM in place — no full reload, no scroll-jump, no flash. Layout/
  // structural changes (logo, mode, password, toggles) still trigger a
  // full form-submit reload (mbRefreshPreview), so this script only
  // handles text updates that are safe to swap with innerHTML.
  const liveUpdateScript = `
<script>
(function(){
  function renderInline(s){
    if(s==null) return '';
    s = String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
    s = s.replace(/\\*\\*(.+?)\\*\\*/g, function(_,inner){
      return '<span class="gradient">'+inner+'</span>';
    });
    return s;
  }
  function setHeadline(html){
    var el = document.querySelector('.hero h1');
    if (el) el.innerHTML = html;
  }
  function setBullets(b1, b2){
    var ul = document.querySelector('.hero-bullets');
    if (!ul) return;
    var items = '';
    if (b1) items += '<li>'+renderInline(b1)+'</li>';
    if (b2) items += '<li>'+renderInline(b2)+'</li>';
    if (items) ul.innerHTML = items;
  }
  function setChannelsHeading(html){
    var el = document.querySelector('.channels-section h2, .channels h2, section.channels h2');
    if (!el) {
      // Fallback: find heading by text
      var h2s = document.querySelectorAll('h2');
      for (var i=0;i<h2s.length;i++){
        if (/Activate wherever|audience is|signature audience categ/i.test(h2s[i].textContent||'')) {
          el = h2s[i]; break;
        }
      }
    }
    if (el) el.innerHTML = html;
  }
  function setBrandName(name){
    var el = document.querySelector('.header-logo-text');
    if (el) el.textContent = name || 'Brand';
  }
  window.addEventListener('message', function(ev){
    var msg = ev && ev.data;
    if (!msg || msg.type !== 'mb-update' || !msg.patch) return;
    var p = msg.patch;
    if ('heroHeadline' in p) {
      var raw = p.heroHeadline || ('Signature Audiences for **' + (p.brandName || ${JSON.stringify(brandName || 'Brand')}) + '**');
      setHeadline(renderInline(raw));
    }
    if ('heroBullet1' in p || 'heroBullet2' in p) {
      setBullets(
        ('heroBullet1' in p) ? p.heroBullet1 : null,
        ('heroBullet2' in p) ? p.heroBullet2 : null
      );
    }
    if ('channelsHeading' in p) {
      var ch = p.channelsHeading || 'Activate wherever your audience is';
      setChannelsHeading(renderInline(ch));
    }
    if ('brandName' in p) setBrandName(p.brandName);
  });
  // Tell parent we're ready so it knows live-patching is available
  try { window.parent && window.parent.postMessage({ type: 'mb-preview-ready' }, '*'); } catch(e){}
})();
</script>
`;
  html = html.replace('</body>', liveUpdateScript + '\n</body>');

  return html;
}

module.exports = { renderHtml, GENERIC_CHIPS, TRUSTED_BRANDS, CHANNEL_TILES };
