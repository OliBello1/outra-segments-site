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

// Template cache — per-type so the proposal template doesn't displace the
// overview template (and vice versa) when both are served from the same
// renderer process.
const _templateCache = {};
function loadTemplate(type) {
  const t = (type === 'proposal') ? 'proposal' : 'overview';
  if (_templateCache[t]) return _templateCache[t];
  const file = (t === 'proposal') ? 'builder-template-proposal.html' : 'builder-template.html';
  const tplPath = path.join(__dirname, '..', file);
  _templateCache[t] = fs.readFileSync(tplPath, 'utf-8');
  return _templateCache[t];
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

// ── Live-update bridge script (added 2026-05-23, extracted 2026-05-25) ──
// Returns the <script> block that gets appended to every rendered page
// just before </body>. The dashboard posts {type:'mb-update', patch:{...}}
// into the iframe whenever the user types a text-only edit, so we patch
// the DOM in place — no full reload, no scroll-jump, no flash. Layout/
// structural changes (logo, mode, password, toggles) still trigger a
// full form-submit reload from the dashboard side.
//
// Used by both renderHtml (overview) AND renderProposalHtml (proposal)
// because every selector here targets a class that exists in both
// templates (.hero h1, .hero-bullets, .channels-section h2,
// .channels-grid.channels-available, .social-proof-set). Brand-name
// fallback for the hero default is injected via the brandName arg.
function buildLiveUpdateScript(brandName) {
  // Serialize the channel/wordmark metadata + base URLs so the in-iframe
  // live handler can rebuild the hero "Available on" strip exactly the way
  // buildHeroAvailableHtml does server-side. Keeps live-patch 1:1 with reload.
  const HERO_META = JSON.stringify({
    tiles: CHANNEL_TILES,
    tilesBase: CHANNEL_TILES_BASE,
    wordmarks: HERO_WORDMARKS,
    wordmarkBase: HERO_WORDMARK_BASE,
    defaultTileKeys: ['meta', 'google', 'tiktok', 'thetradedesk'],
  });
  return `
<script>
(function(){
  var HERO_META = ${HERO_META};
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
  function setBullets(b1, b2, b3){
    var ul = document.querySelector('.hero-bullets');
    if (!ul) return;
    var items = '';
    if (b1) items += '<li>'+renderInline(b1)+'</li>';
    if (b2) items += '<li>'+renderInline(b2)+'</li>';
    if (b3) items += '<li>'+renderInline(b3)+'</li>';
    if (items) ul.innerHTML = items; else ul.innerHTML = '';
  }
  function setChannelsHeading(html){
    var el = document.querySelector('.channels-section h2, .channels h2, section.channels h2');
    if (!el) {
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
  function reorderImgGrid(containerSelector, order, isTile) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var imgs = Array.prototype.slice.call(container.querySelectorAll('img'));
    var byKey = {};
    imgs.forEach(function(img) {
      var key = (img.getAttribute('data-key') || img.alt || '')
        .toString().toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (key && !byKey[key]) byKey[key] = img;
    });
    var orderNorm = (order || []).map(function(k) {
      return String(k).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    });
    var visible = {};
    orderNorm.forEach(function(k) { visible[k] = true; });
    orderNorm.forEach(function(k) {
      var img = byKey[k];
      if (!img) {
        for (var bk in byKey) {
          if (bk.indexOf(k) === 0 || k.indexOf(bk) === 0) { img = byKey[bk]; break; }
        }
      }
      if (img) { img.style.display = ''; container.appendChild(img); }
    });
    imgs.forEach(function(img) {
      var key = (img.getAttribute('data-key') || img.alt || '')
        .toString().toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      var match = visible[key];
      if (!match) {
        for (var ok in visible) {
          if (key.indexOf(ok) === 0 || ok.indexOf(key) === 0) { match = true; break; }
        }
      }
      img.style.display = match ? '' : 'none';
    });
  }
  function setChannelTilesOrder(order) {
    reorderImgGrid('.channels-grid.channels-available', order, true);
  }
  function setTrustedBrandsOrder(order) {
    var sets = document.querySelectorAll('.social-proof-set');
    sets.forEach(function(set) {
      var imgs = Array.prototype.slice.call(set.querySelectorAll('img'));
      var byKey = {};
      imgs.forEach(function(img) {
        var key = (img.alt || '').toString().toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (key && !byKey[key]) byKey[key] = img;
      });
      var orderNorm = (order || []).map(function(k) {
        return String(k).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      });
      var visible = {};
      orderNorm.forEach(function(k) { visible[k] = true; });
      orderNorm.forEach(function(k) {
        var img = byKey[k];
        if (!img) {
          for (var bk in byKey) {
            if (bk.indexOf(k) === 0 || k.indexOf(bk) === 0) { img = byKey[bk]; break; }
          }
        }
        if (img) { img.style.display = ''; set.appendChild(img); }
      });
      imgs.forEach(function(img) {
        var key = (img.alt || '').toString().toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        var match = visible[key];
        if (!match) {
          for (var ok in visible) {
            if (key.indexOf(ok) === 0 || ok.indexOf(key) === 0) { match = true; break; }
          }
        }
        img.style.display = match ? '' : 'none';
      });
    });
  }
  function escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  // Rebuild the hero "Available on" strip in place to match the chosen style +
  // key order, exactly as buildHeroAvailableHtml renders it server-side. This
  // covers add / remove / reorder AND the wordmark<->tiles style switch with
  // no iframe reload. If the strip container isn't present (some templates),
  // it's a no-op and the dashboard's reload fallback still applies.
  function setHeroAvailableOrder(style, keys){
    var wrap = document.querySelector('.hero-available');
    if (!wrap) return;
    var label = wrap.querySelector('.hero-available-label');
    var labelHtml = label ? label.outerHTML : '';
    style = (style === 'tiles') ? 'tiles' : (style === 'wordmarks' ? 'wordmarks' : null);
    // If style wasn't supplied, infer from existing DOM so a keys-only patch
    // keeps the current layout.
    if (!style) style = wrap.querySelector('.hero-platform-tiles') ? 'tiles' : 'wordmarks';
    var inner = '';
    if (style === 'tiles') {
      var map = {}; HERO_META.tiles.forEach(function(c){ map[c.key] = c; });
      var ordered = (Array.isArray(keys) && keys.length) ? keys.slice(0,8) : HERO_META.defaultTileKeys;
      var vis = ordered.map(function(k){ return map[k]; }).filter(Boolean).slice(0,8);
      if (!vis.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      var tiles = vis.map(function(c){
        var url = c.url || (HERO_META.tilesBase + encodeURIComponent(c.file));
        return '<img src="' + escAttr(url) + '" alt="' + escAttr(c.alt) + '" class="hero-platform-tile">';
      }).join('');
      inner = labelHtml + '<div class="hero-platform-tiles' + (vis.length > 4 ? ' rows-2' : '') + '" data-count="' + vis.length + '">' + tiles + '</div>';
    } else {
      var wmap = {}; HERO_META.wordmarks.forEach(function(w){ wmap[w.key] = w; });
      var allWm = HERO_META.wordmarks.map(function(w){ return w.key; });
      var wmOrdered = (Array.isArray(keys) && keys.length) ? keys : allWm;
      var visWm = wmOrdered.map(function(k){ return wmap[k]; }).filter(Boolean);
      if (!visWm.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      var wms = visWm.map(function(w){
        var url = HERO_META.wordmarkBase + encodeURIComponent(w.file);
        var st = (w.height && w.height !== 20) ? ' style="height:' + w.height + 'px;"' : '';
        return '<img src="' + escAttr(url) + '" alt="' + escAttr(w.alt) + '" class="hero-platform-logo"' + st + '>';
      }).join('');
      inner = labelHtml + '<div class="hero-platform-logos">' + wms + '</div>';
    }
    wrap.innerHTML = inner;
  }
  // Show / hide / replace the custom-mode Meta ad screenshots in place. The
  // server renders the .sig-ads-panel aside only when ≥1 URL is set and only
  // in Custom search mode, so this creates or removes the aside as needed.
  // No-op if the custom search layout (.sig-search-flex) isn't present.
  function setAdScreenshots(ad1, ad2){
    var flex = document.querySelector('.sig-search-flex');
    if (!flex) return; // not custom mode — search-mode change is a full reload
    var panel = flex.querySelector('.sig-ads-panel');
    var have = !!(ad1 || ad2);
    if (!have) { if (panel) panel.parentNode.removeChild(panel); return; }
    var imgs = '';
    if (ad1) imgs += '<img src="' + escAttr(ad1) + '" alt="ad" class="sig-ad-img">';
    if (ad2) imgs += '<img src="' + escAttr(ad2) + '" alt="ad" class="sig-ad-img">';
    if (!panel) {
      panel = document.createElement('aside');
      panel.className = 'sig-ads-panel';
      flex.appendChild(panel);
    }
    panel.innerHTML = '<div class="sig-ads-panel-grid">' + imgs + '</div>';
  }
  window.addEventListener('message', function(ev){
    var msg = ev && ev.data;
    if (!msg || msg.type !== 'mb-update' || !msg.patch) return;
    var p = msg.patch;
    if ('heroHeadline' in p) {
      var raw = p.heroHeadline || ('Signature Audiences for **' + (p.brandName || ${JSON.stringify(brandName || 'Brand')}) + '**');
      setHeadline(renderInline(raw));
    }
    if ('heroBullet1' in p || 'heroBullet2' in p || 'heroBullet3' in p) {
      setBullets(
        ('heroBullet1' in p) ? p.heroBullet1 : null,
        ('heroBullet2' in p) ? p.heroBullet2 : null,
        ('heroBullet3' in p) ? p.heroBullet3 : null
      );
    }
    if ('channelsHeading' in p) {
      var ch = p.channelsHeading || 'Activate wherever your audience is';
      setChannelsHeading(renderInline(ch));
    }
    if ('brandName' in p) setBrandName(p.brandName);
    if ('channelTiles' in p)  setChannelTilesOrder(p.channelTiles || []);
    if ('trustedBrands' in p) setTrustedBrandsOrder(p.trustedBrands || []);
    // Hero "Available on" strip — keys and/or style. Either patch key triggers
    // a full strip rebuild (handler infers missing style from the DOM).
    if ('heroAvailableKeys' in p || 'heroAvailableStyle' in p) {
      setHeroAvailableOrder(
        ('heroAvailableStyle' in p) ? p.heroAvailableStyle : null,
        ('heroAvailableKeys' in p) ? (p.heroAvailableKeys || []) : null
      );
    }
    // The dashboard sends both ad URLs whenever either changes, so we can
    // rebuild the panel from the patch directly (no DOM read needed).
    if ('ad1Url' in p || 'ad2Url' in p) {
      setAdScreenshots(p.ad1Url || '', p.ad2Url || '');
    }
  });
  try { window.parent && window.parent.postMessage({ type: 'mb-preview-ready' }, '*'); } catch(e){}
})();
</script>
`;
}

// ── Page-structure reordering + visibility (added 2026-05-23) ─────────────
// Each reorderable region in builder-template.html is wrapped:
//   <!-- SEC_START:2b -->
//     ... section markup ...
//   <!-- SEC_END:2b -->
// The dashboard's "Page structure" panel writes two arrays to the record:
//   Section Order  — array of section IDs in the user's chosen order
//   Section Hidden — array of section IDs to exclude from the live page
// We parse them and reorder/strip in one pass. Unknown IDs are ignored
// (safe forward-compatibility). Missing markers are skipped.
// IDs must match MB_SECTION_DEFS in the dashboard's index.html. Each
// corresponds to one <!-- SEC_START:<id> --> / <!-- SEC_END:<id> --> pair
// in builder-template.html. Add new groups here AND wrap the matching
// template region with markers — both ends are required for hide/reorder
// to take effect on the live page.
const REORDERABLE_SECTION_IDS = [
  'g-header',
  'g-hero',
  'g-trusted',
  'g-household',
  'g-search',
  'g-channels',
  'g-closedloop',
  'g-firstparty',
  'g-casestudies',
  // g-aji-case + g-commercials-beagle added 2026-05-26. Bespoke
  // sections for Beagle Finance, hosted on the overview template
  // and default-hidden on every record. Enable per-record by adding
  // the id to Section Order in Airtable. Will graduate to fully-
  // editable builder sections in a follow-up commit.
  'g-aji-case',
  'g-team',
  'g-commercials-beagle',
  'g-getintouch',
];
function applySectionStructure(html, sectionOrder, sectionHidden) {
  const hide = new Set(Array.isArray(sectionHidden) ? sectionHidden : []);
  // 1) Drop hidden sections first — cheaper than extracting then dropping.
  hide.forEach((id) => {
    const re = new RegExp(
      '<!--\\s*SEC_START:' + escapeRegex(id) + '\\s*-->[\\s\\S]*?<!--\\s*SEC_END:' + escapeRegex(id) + '\\s*-->',
      'g'
    );
    html = html.replace(re, '');
  });
  // 2) If no custom order set, we're done — sections stay in template order.
  if (!Array.isArray(sectionOrder) || sectionOrder.length === 0) return html;

  // 3) Extract each remaining marked region into a map keyed by section id.
  const blocks = {};
  REORDERABLE_SECTION_IDS.forEach((id) => {
    if (hide.has(id)) return;
    const re = new RegExp(
      '<!--\\s*SEC_START:' + escapeRegex(id) + '\\s*-->([\\s\\S]*?)<!--\\s*SEC_END:' + escapeRegex(id) + '\\s*-->',
      'g'
    );
    const m = re.exec(html);
    if (m) blocks[id] = m[0];  // keep markers so re-extraction is idempotent
  });
  // 4) Build the desired order: user list first (filtered to known + present),
  //    then anything missing in canonical position.
  const seen = new Set();
  const finalOrder = [];
  sectionOrder.forEach((id) => {
    if (!blocks[id] || seen.has(id)) return;
    seen.add(id); finalOrder.push(id);
  });
  REORDERABLE_SECTION_IDS.forEach((id) => {
    if (!blocks[id] || seen.has(id)) return;
    seen.add(id); finalOrder.push(id);
  });
  // 5) Replace the first kept block with the concatenated reordered string,
  //    then strip every other extracted block from the HTML in place.
  if (finalOrder.length === 0) return html;
  const concatenated = finalOrder.map((id) => blocks[id]).join('\n');
  let firstReplaced = false;
  REORDERABLE_SECTION_IDS.forEach((id) => {
    if (!blocks[id]) return;
    if (!firstReplaced) {
      html = html.replace(blocks[id], concatenated);
      firstReplaced = true;
    } else {
      html = html.replace(blocks[id], '');
    }
  });
  return html;
}
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Legacy section id migration (2026-05-25). Records saved before the
// Precision-targeting → Outra Household targeting merge may carry
// 'g-propensitymap' in their Section Order / Section Hidden arrays.
// Rewrite to 'g-household' (the unified id) so the rest of the renderer
// never has to know about the legacy id. Dedupes in case both ids ended
// up in the same array. Identical helper lives client-side in
// outra-dashboard/index.html as _mbMigrateLegacySectionIds — keep in
// sync if either side learns about more legacy ids.
function migrateLegacySectionIds(arr) {
  if (!Array.isArray(arr)) return arr;
  const seen = new Set();
  const out = [];
  for (const raw of arr) {
    const id = raw === 'g-propensitymap' ? 'g-household' : raw;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

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
  // we render here we can trust the bounding box hugs the artwork. Match the
  // Outra wordmark exactly (.logo-img is height:38px display:block) so the two
  // logos sit at the same visual height in the header.
  return '<span class="logo-partner-text">x</span><img src="' + escapeAttr(logoUrl) + '" alt="' + escapeAttr(brandName) + '" class="logo-partner-img" style="height:38px;width:auto;display:block;object-fit:contain;">';
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
    const logoUrl = c.logoUrl || '';
    let visual = '';
    let sep = '';
    if (logoUrl) {
      visual = '<img class="maxi-chip-logo" src="' + escapeAttr(logoUrl) + '" alt="">';
      sep = '&ensp;';
    } else if (emoji) {
      visual = emoji;
      sep = '&ensp;';
    }
    let dataSegments = '';
    if (Array.isArray(c.segments) && c.segments.length) {
      const segs = c.segments.map(s => ({
        name: s.name,
        cat: s.cat,
        reason: s.reason || 'Hand-picked match',
      }));
      dataSegments = " data-segments='" + JSON.stringify(segs).replace(/'/g, '&#39;') + "'";
    }
    return '<button type="button" class="maxi-chip" data-query="' + escapeAttr(c.query || '') + '"' + dataSegments + '>' + visual + sep + escapeHtml(c.label || '') + '</button>';
  }).join('\n      ');
  return '<div class="maxi-search-chips" id="maxiChips">\n      ' + inner + '\n    </div>';
}

function buildSearchSectionInner(record, chips, isCustom) {
  const brandName = record['Brand Name'] || '';
  // Editable override from the microsite builder ("Search Heading" field). Blank
  // falls back to the default copy (2026-06-14). Trimmed so whitespace-only
  // values don't override the default.
  const searchHeadingOverride = (record['Search Heading'] && String(record['Search Heading']).trim())
    ? String(record['Search Heading']).trim()
    : '';
  const titleText = searchHeadingOverride
    || (isCustom
        ? 'Find your highest-converting ' + brandName + ' audience'
        : 'Find your highest converting audience');

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
const TRUSTED_BRANDS_BASE = 'https://outra.vip/Company%20Logos/';

function buildTrustedBrandsHtml(enabledKeys) {
  // Default = all enabled when caller hasn't customised the selection.
  const all = TRUSTED_BRANDS.map(b => b.key);
  const brandByKey = new Map(TRUSTED_BRANDS.map(b => [b.key, b]));
  const selected = (Array.isArray(enabledKeys) && enabledKeys.length > 0) ? enabledKeys : all;
  // Iterate the selected array in its saved order so drag-to-reorder in
  // the dashboard is respected on the live page.
  const seen = new Set();
  const visible = [];
  selected.forEach((k) => {
    if (seen.has(k)) return;
    const brand = brandByKey.get(k);
    if (!brand) return;
    seen.add(k);
    visible.push(brand);
  });
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
const CHANNEL_TILES_BASE = 'https://outra.vip/Channel%20Logos/tiles/';
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
  { key: 'shopify',       alt: 'Shopify',        file: 'shopify-available.gif' },
];

function buildChannelTilesHtml(enabledKeys) {
  const all = CHANNEL_TILES.map(b => b.key);
  const tileByKey = new Map(CHANNEL_TILES.map(b => [b.key, b]));
  const selected = (Array.isArray(enabledKeys) && enabledKeys.length > 0) ? enabledKeys : all;
  // Iterate the selected array in its saved order — the dashboard's
  // drag-to-reorder writes channel ordering into this list, so we must
  // respect insertion order rather than canonical order. Filter out
  // unknown keys (forward-compat) and silently drop duplicates.
  const seen = new Set();
  const visible = [];
  selected.forEach((k) => {
    if (seen.has(k)) return;
    const tile = tileByKey.get(k);
    if (!tile) return;
    seen.add(k);
    visible.push(tile);
  });
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
const HERO_WORDMARK_BASE = 'https://outra.vip/';
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
      // Respect per-channel `url` override (e.g. WhatsApp on
      // proposals.outra.vip) — without this WhatsApp 404s on the canonical
      // CDN and renders broken in the hero strip.
      const url = c.url || (CHANNEL_TILES_BASE + encodeURIComponent(c.file));
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
  const challengesCategory = field('Propensity Category', '');
  const quote1 = field('Propensity Quote 1',
    'How do we ensure that we aren\u2019t wasting ad spend on bringing the wrong customers to our site?');
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
      // Desktop: full mint-green pill with the MATCHES logo inside.
      // Mobile: shrink the pill so the partner lockup doesn't dominate
      // the header — the pill scales down with the Outra logo to a
      // compact thumbnail-sized chip that still reads as the brand.
      + '  @media (min-width: 600px) {\n'
      + '    .logo .logo-partner-img {\n'
      + '      height: 28px !important;\n'
      + '      padding: 6px 14px;\n'
      + '      background: #A7DCBA;\n'
      + '      border-radius: 4px;\n'
      + '      box-sizing: content-box;\n'
      + '    }\n'
      + '  }\n'
      + '  @media (max-width: 599px) {\n'
      + '    .logo .logo-partner-img {\n'
      + '      height: 18px !important;\n'
      + '      padding: 4px 8px;\n'
      + '      background: #A7DCBA;\n'
      + '      border-radius: 3px;\n'
      + '      box-sizing: content-box;\n'
      + '    }\n'
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
      + '    width: 21%;\n'
      + '    height: 14%;\n'
      + '    background: #ffffff;\n'
      + '    border: 1px solid rgba(20, 24, 60, 0.08);\n'
      + '    border-radius: 6px;\n'
      + '    box-shadow: 0 4px 12px rgba(10, 19, 91, 0.10), 0 1px 2px rgba(10, 19, 91, 0.06);\n'
      + '    box-sizing: border-box;\n'
      + '    z-index: 2;\n'
      + '    padding: 4% 4% 4%;\n'
      + '    overflow: hidden;\n'
      + '  }\n'
      // Logo absolutely positioned, centered horizontally and vertically in
      // the SPACE ABOVE the caption (top 0 → bottom 24%). object-fit:contain
      // keeps aspect ratio.
      // Logo sits in the upper portion of the box, vertically centered
      // between the top edge (5%) and well above the caption (bottom 30%).
      // The bottom 30% is reserved for the caption + padding so logo and
      // caption never overlap.
      + '  .propensity-video-logo-img {\n'
      + '    position: absolute;\n'
      + '    top: 14%;\n'
      + '    left: 50%;\n'
      + '    transform: translateX(-50%);\n'
      + '    max-width: 95%;\n'
      + '    max-height: 58%;\n'
      + '    width: auto;\n'
      + '    height: auto;\n'
      + '    object-fit: contain;\n'
      + '    display: block;\n'
      + '  }\n'
      // Caption pinned a touch above the bottom of the box, centered.
      // Font-size bumped ~20% (was clamp(4px, 0.35vw, 5px)).
      + '  .propensity-video-logo-caption {\n'
      + '    position: absolute;\n'
      + '    left: 0;\n'
      + '    right: 0;\n'
      + '    bottom: 8%;\n'
      + '    font-size: clamp(5px, 0.42vw, 6px);\n'
      + '    font-weight: 600;\n'
      + '    text-transform: uppercase;\n'
      + '    letter-spacing: 0.25px;\n'
      + '    color: rgba(20, 24, 60, 0.55);\n'
      + '    line-height: 1;\n'
      + '    text-align: center;\n'
      + '    white-space: nowrap;\n'
      + '  }\n';
  const propensityLogoSlugCss = (slug === 'Emma')
    ? '  .propensity-video-logo-card .propensity-video-logo-img { max-width: 60% !important; }\n'
    : '';
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
    + propensityLogoSlugCss
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
+ '        <p class="propensity-aud-label">Challenges we solve' + (String(challengesCategory).trim() ? ' for ' + escapeHtml(String(challengesCategory).trim()) : '') + '</p>\n'
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
+ '          <video class="propensity-video-el" autoplay muted loop playsinline webkit-playsinline preload="auto" disablePictureInPicture onloadedmetadata="try{this.currentTime=3}catch(e){}" oncanplay="this.play().catch(function(){})">\n'
+ '            <source src="https://proposals.outra.vip/cala/p2b-recording.mp4" type=\'video/mp4; codecs="avc1.42E01E, mp4a.40.2"\'>\n'
+ '          </video>\n'
+ '          <img class="propensity-video-poster" src="/signature-segments/p2b-poster-mobile.jpg" alt="Dashboard preview" />\n'
+ (usingDedicatedMatchesOverlay
    ? '          <img class="propensity-video-logo" src="' + escapeAttr(logoSrc) + '" alt="' + escapeAttr(logoAlt) + '" />\n'
    : '          <div class="propensity-video-logo-card"><img class="propensity-video-logo-img" src="' + escapeAttr(logoSrc) + '" alt="' + escapeAttr(logoAlt) + '" /><span class="propensity-video-logo-caption">Illustrative household volumes</span></div>\n')
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
// TEAM_MEMBERS — canonical list shared by overview + proposal microsites.
// `photo` is a filename relative to /signature-segments/ for members whose
// portrait lives in that asset folder. `photoUrl` is an explicit absolute
// URL for members whose portrait lives elsewhere (e.g. the PB team whose
// assets are pinned to proposals.outra.vip/purplebricks/). Renderers prefer
// `photoUrl` when present, otherwise fall back to ASSET_BASE + photo.
const TEAM_MEMBERS = [
  { id: 'graham',  photo: 'team-graham.jpeg', name: 'Graham Field',     role: 'CRO',                              email: 'GField@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/graham-field-1532323/' },
  { id: 'kim',     photo: 'team-kim.jpeg',    name: 'Kim Joyce',        role: 'Head of Agency Sales',             email: 'KJoyce@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/kimberley-joyce-8125708b/' },
  { id: 'leo',     photo: 'team-leo.jpeg',    name: 'Leo Xiong',        role: 'Chief Data Scientist',             email: 'QXiong@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/qizhou-leo-xiong-ph-d-59a08818/' },
  { id: 'jack',    photo: 'team-jack.jpeg',   name: 'Jack Edwards',     role: 'Director of Growth',               email: 'JEdwards@outra.co.uk', linkedin: 'https://www.linkedin.com/in/jack-edwards-68780916b/' },
  { id: 'oli',     photo: 'team-oli.png',     name: 'Oli Bello',        role: 'Head of Go to Market',             email: 'OBello@outra.co.uk',   linkedin: 'https://www.linkedin.com/in/olibello/' },
  // Customer success team — portrait lives with the cala proposal assets.
  { id: 'alex',     photoUrl: 'https://proposals.outra.vip/cala/team-alex.png',            name: 'Alex Swiderski',   role: 'Customer Success Manager',         email: 'ASwiderski@outra.co.uk', linkedin: '' },
  // Purplebricks-proposal team — portraits pinned to proposals.outra.vip.
  { id: 'fred',     photoUrl: 'https://proposals.outra.vip/purplebricks/team-fred.webp',   name: 'Fred Jones',       role: 'CEO',                              email: 'fred@outra.co.uk',     linkedin: '' },
  { id: 'richard',  photoUrl: 'https://proposals.outra.vip/purplebricks/team-rich.jpeg',   name: 'Richard Durrant',  role: 'Head of Commercial Partnerships',  email: 'RDurrant@outra.co.uk', linkedin: '' },
  { id: 'david',    photoUrl: 'https://proposals.outra.vip/purplebricks/team-david.jpeg',  name: 'David Whiteley',   role: 'Head of Customer Success',         email: 'DWhiteley@outra.co.uk',linkedin: '' },
];

// Resolve a TEAM_MEMBERS portrait URL — prefer absolute photoUrl when
// supplied (PB-team assets), fall back to ASSET_BASE + photo otherwise.
function teamMemberPhotoUrl(m, assetBase) {
  if (m && m.photoUrl) return m.photoUrl;
  return (assetBase || '/signature-segments/') + (m && m.photo ? m.photo : '');
}

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
  // Selection-order-preserving lookup: when the user has explicitly
  // ordered the array via the dashboard's drag-to-reorder team grid we
  // want the page to render in that order, not the canonical
  // TEAM_MEMBERS list order. Map selection IDs → member objects via a
  // dictionary, drop unknown IDs.
  const memberById = {};
  TEAM_MEMBERS.forEach(m => { memberById[m.id] = m; });
  const visibleTeam = selection === null
    ? TEAM_MEMBERS
    : selection.map(id => memberById[id]).filter(Boolean);
  if (!visibleTeam.length) return '';
  // CTA recipient: dashboard picks one of the visible team members' IDs.
  // Falls back to the first visible member if unset or invalid.
  const ctaRecipientId = (record && record['Team CTA Recipient']) || '';
  const ctaMember = visibleTeam.find(m => m.id === ctaRecipientId) || visibleTeam[0];
  // LinkedIn pill is only emitted when the member has a linkedin URL on
  // file (PB team entries don't have public LI links yet).
  const cardsHtml = visibleTeam.map(m => {
    const liHtml = m.linkedin
      ? '          <a class="mf-team-li" href="' + escapeAttr(m.linkedin) + '" target="_blank" rel="noopener" aria-label="' + escapeAttr(m.name) + ' on LinkedIn"><span class="mf-team-li-icon" aria-hidden="true"></span>LinkedIn</a>\n'
      : '';
    return ''
      + '      <div class="mf-team-card">\n'
      + '        <div class="mf-team-photo"><img src="' + escapeAttr(teamMemberPhotoUrl(m, ASSET_BASE)) + '" alt="' + escapeAttr(m.name) + '"></div>\n'
      + '        <div class="mf-team-name">' + escapeHtml(m.name) + '</div>\n'
      + '        <div class="mf-team-role">' + escapeHtml(m.role) + '</div>\n'
      + '        <div class="mf-team-pills">\n'
      + '          <a class="mf-team-email" href="mailto:' + escapeAttr(m.email) + '" title="Email ' + escapeAttr(m.name) + '">' + escapeHtml(m.email) + '</a>\n'
      + liHtml
      + '        </div>\n'
      + '      </div>';
  }).join('\n');

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

// ── Proposal-specific multi-opportunity Commercials section (2026-05-25)
// Replaces the hardcoded cala pricing slider. Reads an array of
// opportunity objects from `Commercials JSON` and emits one
// .prop-pricing-grid per opportunity. v1 supports tier tables only
// (no live sliders) so the editor is copy-driven, not math-driven.
function buildCommercialsHtml(record) {
  let opps = null;
  try {
    const raw = record && record['Commercials JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) opps = parsed;
    }
  } catch (_) {}
  if (!opps || opps.length === 0) {
    // No commercials configured — section renders empty. The wrapping
    // <section class="prop-commercials"> in the template still exists
    // so the dark-navy band shows but with no cards. Users can either
    // configure commercials or hide the whole section via Page structure.
    return '<div class="prop-commercials-inner"><div class="prop-commercials-header"><p class="prop-commercials-sub" style="opacity:0.6;">Add a Commercials JSON entry to populate this section.</p></div></div>';
  }

  function buildTierRows(tiers) {
    if (!Array.isArray(tiers) || !tiers.length) return '';
    return tiers.map((t) => ''
      + '<div class="prop-tier-row">'
      + '<span class="prop-tier-label">' + escapeHtml(String(t.label || '')) + '</span>'
      + '<span class="prop-tier-price">' + escapeHtml(String(t.price || '')) + '</span>'
      + '</div>').join('\n');
  }
  function buildFeatures(features) {
    if (!Array.isArray(features) || !features.length) return '';
    return '<ul class="prop-pricing-features">'
      + features.map((f) => '<li>' + escapeHtml(String(f)) + '</li>').join('')
      + '</ul>';
  }
  function buildLeftCard(left, accent) {
    if (!left) return '';
    const tiersHtml = buildTierRows(left.tiers);
    return ''
      + '<div class="prop-pricing-card" style="--opp-accent:' + escapeAttr(accent || '#4D61F4') + ';">'
      + '<div class="prop-pricing-card-name">' + escapeHtml(String(left.name || 'Per unit')) + '</div>'
      + '<div class="prop-pricing-card-headline">' + escapeHtml(String(left.headline || '')) + '</div>'
      + (left.refresh ? '<div class="prop-refresh-pill"><span class="prop-refresh-dot"></span>' + escapeHtml(String(left.refresh)) + '</div>' : '')
      + (tiersHtml ? '<div class="prop-tier-table">' + tiersHtml + '</div>' : '')
      + (left.meta ? '<div class="prop-price-meta">' + escapeHtml(String(left.meta)) + '</div>' : '')
      + '</div>';
  }
  function buildRightCard(right, accent) {
    if (!right) return '';
    return ''
      + '<div class="prop-pricing-card unlimited" style="--opp-accent:' + escapeAttr(accent || '#4D61F4') + ';">'
      + '<div class="prop-pricing-card-name">' + escapeHtml(String(right.name || 'Unlimited')) + '</div>'
      + '<div class="prop-pricing-card-headline">' + escapeHtml(String(right.headline || '')) + '</div>'
      + (right.refresh ? '<div class="prop-refresh-pill prop-refresh-pill-bright"><span class="prop-refresh-dot"></span>' + escapeHtml(String(right.refresh)) + '</div>' : '')
      + (right.price ? '<div class="prop-price-display"><span class="prop-price-num">' + escapeHtml(String(right.price)) + '</span>'
          + (right.period ? '<span class="prop-price-period">' + escapeHtml(String(right.period)) + '</span>' : '')
          + '</div>' : '')
      + buildFeatures(right.features)
      + '</div>';
  }

  // ── Slider-stack layout (2026-06 — Loaf) ──────────────────────────
  // A bespoke Knight-Dragon-style layout driven by `opp.layout ===
  // 'slider-stack'`. Renders a 2-column grid:
  //   LEFT column  = [records slider card] stacked above [platform card]
  //   RIGHT column = one tall "unlimited tier + bonus" card whose height
  //                  matches the two left cards combined (CSS grid stretch).
  // The slider is live: an injected loafCpUpdate() recalculates the
  // per-record price + monthly total in 10k-record increments and bolds
  // the active tier row. Tiers come from opp.slider.tiers as
  // [{ max: <number|null>, price: <pence number>, label, price_label }].
  function fmtGBP(n) {
    return '\u00A3' + Math.round(n).toLocaleString('en-GB');
  }
  // Channels-included strip for a card. `channels` is an array of slugs
  // (e.g. ['meta','google','tiktok','direct-mail']). Renders gifs with the
  // same relative path + outra.vip CDN fallback as the Knight Dragon page.
  function buildChannelsStrip(channels, label, light) {
    if (!Array.isArray(channels) || !channels.length) return '';
    const alts = { meta: 'Meta', google: 'Google', tiktok: 'TikTok', 'direct-mail': 'CRM', klaviyo: 'Klaviyo' };
    const imgs = channels.map((c) => {
      const slug = String(c).toLowerCase();
      const alt = alts[slug] || slug;
      const rel = '/channels/' + slug + '-available.gif';
      const cdn = 'https://outra.vip/Channel%20Logos/tiles/' + slug + '-available.gif';
      return '<img src="' + escapeAttr(rel) + '" alt="' + escapeAttr(alt) + '" '
        + 'onerror="this.onerror=null;this.src=\'' + escapeAttr(cdn) + '\'">';
    }).join('');
    return '<div class="prop-card-bottom">'
      + '<div class="prop-card-channels' + (light ? ' prop-card-channels-light' : '') + '">'
      + '<div class="prop-card-channels-label">' + escapeHtml(String(label || 'Channels included')) + '</div>'
      + '<div class="prop-card-channels-logos">' + imgs + '</div>'
      + '</div></div>';
  }

  function buildSliderStack(opp) {
    const accent = opp.accent || '#4D61F4';
    const s = opp.slider || {};
    const tiers = Array.isArray(s.tiers) ? s.tiers : [];
    // Slider config — records in 10k increments.
    const step = Number(s.step) || 10000;
    const min = (s.min == null ? step : Number(s.min)); // allow min:0
    const max = Number(s.max) || 5000000;
    const start = (s.start == null ? min : Number(s.start)); // defaults to left edge
    const capMonthly = Number(s.cap_monthly) || 10000; // unlimited tier £/mo
    // Serialise tiers for the client script (max=null means open-ended top tier).
    const tiersJson = JSON.stringify(tiers.map((t) => ({
      max: (t.max == null ? null : Number(t.max)),
      price: Number(t.price),         // pence per record
      label: String(t.label || ''),
    })));
    // Tier table rows (visible — we override .prop-tier-table display).
    const tierRows = tiers.map((t, i) => ''
      + '<div class="prop-tier-row" data-tier="' + i + '">'
      + '<span>' + escapeHtml(String(t.label || '')) + '</span>'
      + '<span>' + escapeHtml(String(t.price_label || '')) + '</span>'
      + '</div>').join('');

    // LEFT-TOP: enrichment slider card.
    const sliderCard = ''
      + '<div class="prop-pricing-card" style="--opp-accent:' + escapeAttr(accent) + ';">'
      + '<div class="prop-pricing-card-name">' + escapeHtml(String(s.name || 'Outra Enrichment')) + '</div>'
      + '<div class="prop-slider-wrap">'
      +   '<div class="prop-slider-row">'
      +     '<span class="prop-slider-sites-num" id="loafRecNum">' + Number(start).toLocaleString('en-GB') + '</span>'
      +     '<span class="prop-slider-sites-label">records / month</span>'
      +   '</div>'
      +   '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + start + '" class="prop-slider" id="loafSlider" oninput="loafCpUpdate(this.value)">'
      +   '<div class="prop-slider-ticks">' + (function(){ var t=''; for(var i=0;i<=max;i+=1000000){ t+='<span>'+(i===0?'0':i===max?(i/1000000)+'m+':((i/1000000)+'m'))+'</span>'; } return t; })() + '</div>'
      + '</div>'
      + '<div class="prop-price-display">'
      +   '<span class="prop-price-num" id="loafPrice">\u00A30</span>'
      +   '<span class="prop-price-period">/ month</span>'
      +   '<span class="prop-savings-badge" id="loafSavingsBadge">Save <strong id="loafSavingsAmt">\u00A30</strong> with unlimited tier</span>'
      + '</div>'
      + '<div class="prop-price-meta"><span id="loafCapNote"></span></div>'
      // Tier table kept in the DOM but hidden — the live slider script still
      // reads data-tiers to compute the capped monthly price, but we don't show
      // the per-record cost breakdown to the customer.
      + '<div class="prop-tier-table" style="display:none;" id="loafTierTable" data-tiers=\'' + tiersJson.replace(/'/g, '&#39;') + '\' data-cap="' + capMonthly + '" data-step="' + step + '">'
      +   tierRows
      + '</div>'
      + '</div>';

    // LEFT-BOTTOM: Outra Platform £5k/month card.
    const p = opp.platform || {};
    const platformFeatures = Array.isArray(p.features) && p.features.length
      ? '<ul class="unlimited-features">' + p.features.map((f) => '<li>' + escapeHtml(String(f)) + '</li>').join('') + '</ul>'
      : '';
    const platformCard = ''
      + '<div class="prop-pricing-card" style="--opp-accent:' + escapeAttr(accent) + ';">'
      + '<div class="prop-pricing-card-name">' + escapeHtml(String(p.name || 'Outra Platform')) + '</div>'
      + '<div class="prop-price-display"><span class="prop-price-num">' + escapeHtml(String(p.price || '\u00A35,000')) + '</span><span class="prop-price-period">' + escapeHtml(String(p.period || '/ month')) + '</span></div>'
      + (p.meta ? '<div class="prop-price-meta">' + escapeHtml(String(p.meta)) + '</div>' : '')
      + platformFeatures
      + buildChannelsStrip(p.channels, p.channels_label || 'Channels included', false)
      + '</div>';

    // RIGHT: tall unlimited tier + bonus card.
    const r = opp.unlimited || {};
    const ayceFeatures = Array.isArray(r.features) && r.features.length
      ? '<ul class="unlimited-features">' + r.features.map((f) => '<li>' + escapeHtml(String(f)) + '</li>').join('') + '</ul>'
      : '';
    const bonus = opp.bonus || {};
    const bonusItems = Array.isArray(bonus.items) && bonus.items.length
      ? '<ul class="unlimited-features">' + bonus.items.map((f) => '<li>' + escapeHtml(String(f)) + '</li>').join('') + '</ul>'
      : '';
    // Explicit, prominently called-out bonus section (not a subtle pill).
    const bonusSectionItems = Array.isArray(bonus.items) && bonus.items.length
      ? '<ul class="loaf-bonus-list">' + bonus.items.map((f) => '<li>' + escapeHtml(String(f)) + '</li>').join('') + '</ul>'
      : '';
    const bonusBlock = (bonus.title || bonusSectionItems)
      ? '<div class="loaf-bonus">'
        + '<div class="loaf-bonus-tag">' + escapeHtml(String(bonus.tag || 'Added value')) + '</div>'
        + (bonus.title ? '<div class="loaf-bonus-title">' + escapeHtml(String(bonus.title)) + '</div>' : '')
        + (bonus.subtitle ? '<div class="loaf-bonus-sub">' + escapeHtml(String(bonus.subtitle)) + '</div>' : '')
        + bonusSectionItems
        + '</div>'
      : '';
    const unlimitedCard = ''
      + '<div class="prop-pricing-card unlimited" style="--opp-accent:' + escapeAttr(accent) + ';height:100%;">'
      + '<div class="prop-pricing-card-name">' + escapeHtml(String(r.name || 'Unlimited tier')) + '</div>'
      + '<div class="unlimited-price">' + escapeHtml(String(r.price || '\u00A310,000')) + '<span class="unlimited-price-suffix">' + escapeHtml(String(r.period || ' per month')) + '</span></div>'
      + (r.meta ? '<div class="unlimited-period">' + escapeHtml(String(r.meta)) + '</div>' : '')
      + ayceFeatures
      + bonusBlock
      + buildChannelsStrip(r.channels, r.channels_label || 'Channels included', true)
      + '</div>';

    // Grid: left column is a nested flex stack; right column one tall card.
    // Both columns stretch to the same height (grid align-items:stretch). The
    // left stack's two cards flex to fill the column so, combined, they equal
    // the right card's height. The right wrapper + card fill 100% so it never
    // ends up shorter than the left stack.
    const grid = ''
      + '<div class="prop-pricing-grid loaf-cp-grid" style="grid-template-columns:1fr 1fr;align-items:stretch;">'
      +   '<div class="loaf-cp-left">' + sliderCard + platformCard + '</div>'
      +   '<div class="loaf-cp-right">' + unlimitedCard + '</div>'
      + '</div>';

    const foot = Array.isArray(opp.footnotes)
      ? opp.footnotes.map((f) => '<p class="prop-commercials-footnote">' + escapeHtml(String(f)) + '</p>').join('')
      : (opp.footnote ? '<p class="prop-commercials-footnote">' + escapeHtml(String(opp.footnote)) + '</p>' : '');

    return ''
      + buildLoafCompactCss()
      + '<div class="prop-commercials-inner loaf-cp" style="--opp-accent:' + escapeAttr(accent) + ';">'
      + '<div class="prop-commercials-header">'
      + (opp.title ? '<h2 class="prop-commercials-title">' + escapeHtml(String(opp.title)) + '</h2>' : '')
      + (opp.subtitle ? '<p class="prop-commercials-sub">' + escapeHtml(String(opp.subtitle)) + '</p>' : '')
      + '</div>'
      + grid
      + foot
      + '</div>'
      + buildLoafSliderScript();
  }

  // Scoped compactness + centering overrides for the slider-stack layout.
  // Targets only `.loaf-cp` so Knight Dragon's shared .prop-* CSS is untouched.
  // Goal: whole commercials section fits on one screen without scrolling, and
  // the grid is centred with a sensible max-width.
  function buildLoafCompactCss() {
    return '\n<style>\n'
      + '.loaf-cp{max-width:1100px;margin-left:auto;margin-right:auto;}\n'
      + '.prop-commercials:has(.loaf-cp){padding-top:56px;padding-bottom:140px;}\n'
      + '.loaf-cp .prop-commercials-header{margin-bottom:56px;text-align:center;}\n'
      + '.loaf-cp .prop-commercials-title{font-size:26px;margin-bottom:6px;}\n'
      + '.loaf-cp .prop-commercials-sub{max-width:680px;margin-left:auto;margin-right:auto;font-size:15px;}\n'
      + '.loaf-cp .prop-pricing-grid{gap:18px;align-items:stretch;}\n'
      // Equal-height columns: left stack and right card both fill the row.
      + '.loaf-cp .loaf-cp-left{display:flex;flex-direction:column;gap:12px;height:100%;}\n'
      + '.loaf-cp .loaf-cp-right{display:flex;height:100%;}\n'
      + '.loaf-cp .loaf-cp-right > .prop-pricing-card{flex:1 1 auto;width:100%;height:100%;}\n'
      // Left cards share the column height: slider card hugs its content, the
      // platform card grows to fill the remainder so the two together match the
      // right card exactly.
      + '.loaf-cp .loaf-cp-left > .prop-pricing-card:last-child{flex:1 1 auto;}\n'
      + '.loaf-cp .prop-pricing-card{padding:18px 20px;}\n'
      + '.loaf-cp .prop-pricing-card-name{margin-bottom:8px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n'
      + '.loaf-cp .prop-refresh-pill{margin:0 0 8px;}\n'
      + '.loaf-cp .prop-slider-wrap{margin:6px 0 8px;}\n'
      + '.loaf-cp .prop-slider-sites-num{font-size:31px;line-height:1.1;}\n'
      + '.loaf-cp .prop-slider-sites-label{font-size:12.5px;}\n'
      + '.loaf-cp .prop-price-display{margin:6px 0 4px;}\n'
      + '.loaf-cp .prop-price-num{font-size:26px;}\n'
      + '.loaf-cp .prop-price-meta{margin-bottom:6px;font-size:13px;}\n'
      + '.loaf-cp .prop-tier-table{margin-top:6px;}\n'
      + '.loaf-cp .prop-tier-row{padding:3px 0;font-size:13px;}\n'
      + '.loaf-cp .unlimited-price{font-size:34px;line-height:1.1;margin-bottom:4px;}\n'
      + '.loaf-cp .unlimited-period{margin-bottom:8px;font-size:13px;}\n'
      + '.loaf-cp .unlimited-features{margin-top:6px;}\n'
      + '.loaf-cp .unlimited-features li{margin-bottom:4px;font-size:14px;}\n'
      + '.loaf-cp .prop-commercials-footnote{margin-top:56px;font-size:15px;}\n'
      + '.loaf-cp .prop-commercials-footnote + .prop-commercials-footnote{margin-top:8px;}\n'
      // Glowing unlimited card — matches Knight Dragon's pulsing Annual card.
      + '.loaf-cp .prop-pricing-card.unlimited{position:relative;background:linear-gradient(160deg, rgba(180,200,255,0.26), rgba(120,150,255,0.18));border:1.5px solid rgba(180,200,255,0.75);border-radius:16px;animation:propUnlimitedPulse 2.6s ease-in-out infinite;}\n'
      + '@keyframes propUnlimitedPulse{0%,100%{border-color:rgba(180,200,255,0.65);box-shadow:0 0 0 1px rgba(180,200,255,0.20),0 0 28px rgba(120,150,255,0.20);}50%{border-color:rgba(77,203,199,1);box-shadow:0 0 0 5px rgba(77,203,199,0.22),0 0 46px rgba(77,203,199,0.42);}}\n'
      + '@media (prefers-reduced-motion: reduce){.loaf-cp .prop-pricing-card.unlimited{animation:none;}}\n'
      // Save-with badge inside the slider card's price display.
      + '.loaf-cp .prop-savings-badge{display:none;align-items:center;gap:4px;margin-left:6px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.2px;background:rgba(77,203,199,0.16);color:rgba(77,203,199,1);border:1px solid rgba(77,203,199,0.5);white-space:nowrap;}\n'
      + '.loaf-cp .prop-savings-badge.show{display:inline-flex;}\n'
      + '.loaf-cp .prop-savings-badge strong{font-weight:800;}\n'
      // Channels-included strip at the bottom of each card.
      + '.loaf-cp .prop-card-bottom{margin-top:auto;padding-top:14px;}\n'
      + '.loaf-cp .prop-card-channels-label{font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:6px;}\n'
      + '.loaf-cp .prop-card-channels-light .prop-card-channels-label{color:rgba(255,255,255,0.65);}\n'
      + '.loaf-cp .prop-card-channels-logos{display:flex;flex-wrap:nowrap;gap:8px;align-items:center;}\n'
      + '.loaf-cp .prop-card-channels-logos img{height:58px;width:auto;border-radius:10px;display:block;}\n'
      // Explicit bonus section — bordered, tinted box with a clear "Added value" tag.
      + '.loaf-cp .loaf-bonus{margin-top:14px;padding:14px 18px;border-radius:12px;background:rgba(77,203,199,0.10);border:1px solid rgba(77,203,199,0.45);}\n'
      + '.loaf-cp .loaf-bonus-tag{display:inline-block;margin-bottom:10px;padding:5px 12px;border-radius:999px;font-size:12.5px;font-weight:800;letter-spacing:0.3px;text-transform:uppercase;background:rgba(77,203,199,1);color:#06201f;}\n'
      + '.loaf-cp .loaf-bonus-title{font-size:15px;font-weight:800;color:#fff;margin-bottom:3px;}\n'
      + '.loaf-cp .loaf-bonus-sub{font-size:12.5px;color:rgba(255,255,255,0.7);margin-bottom:8px;}\n'
      + '.loaf-cp .loaf-bonus-list{list-style:none;margin:0;padding:0;}\n'
      + '.loaf-cp .loaf-bonus-list li{position:relative;padding-left:20px;margin-bottom:9px;font-size:13px;line-height:1.3;color:rgba(255,255,255,0.92);}\n'
      + '.loaf-cp .loaf-bonus-list li:last-child{margin-bottom:0;}\n'
      + '.loaf-cp .loaf-bonus-list li::before{content:"\\2713";position:absolute;left:0;top:0;color:rgba(77,203,199,1);font-weight:800;}\n'
      + '</style>\n';
  }

  // Live slider script — self-contained, idempotent (guards against double
  // injection if multiple slider-stack opps exist on one page).
  function buildLoafSliderScript() {
    return '\n<script>(function(){\n'
      + 'if (window.__loafCpInit) return; window.__loafCpInit = true;\n'
      + 'function gbp(n){return "\\u00A3"+Math.round(n).toLocaleString("en-GB");}\n'
      + 'window.loafCpUpdate=function(val){\n'
      + '  var table=document.getElementById("loafTierTable"); if(!table) return;\n'
      + '  var tiers; try{tiers=JSON.parse(table.getAttribute("data-tiers"));}catch(e){tiers=[];}\n'
      + '  var cap=parseFloat(table.getAttribute("data-cap"))||10000;\n'
      + '  var n=parseInt(val,10)||0;\n'
      + '  var idx=tiers.length-1, pence=tiers.length?tiers[tiers.length-1].price:100;\n'
      + '  for(var i=0;i<tiers.length;i++){ if(tiers[i].max==null || n<=tiers[i].max){ idx=i; pence=tiers[i].price; break; } }\n'
      + '  var monthly=(n*pence)/100;\n'
      + '  var saving=monthly-cap;\n'
      + '  var numEl=document.getElementById("loafRecNum"); if(numEl) numEl.textContent=n.toLocaleString("en-GB");\n'
      + '  var priceEl=document.getElementById("loafPrice"); if(priceEl) priceEl.textContent=gbp(monthly);\n'
      + '  var perEl=document.getElementById("loafPerRec"); if(perEl) perEl.textContent=gbp(pence/100).replace("\\u00A30","\\u00A30")+(pence<100?"":"") ;\n'
      + '  if(perEl){ perEl.textContent="\\u00A3"+(pence/100).toFixed(2); }\n'
      + '  var capNote=document.getElementById("loafCapNote"); if(capNote) capNote.textContent=saving>0?"Unlimited tier saves you "+gbp(saving)+"/mo \\u2014 switch to \\u00A310,000/mo flat.":"";\n'
      + '  var badge=document.getElementById("loafSavingsBadge"); var badgeAmt=document.getElementById("loafSavingsAmt");\n'
      + '  if(badge&&badgeAmt){ if(saving>0){ badgeAmt.textContent=gbp(saving); badge.classList.add("show"); } else { badge.classList.remove("show"); } }\n'
      + '  var rows=table.querySelectorAll(".prop-tier-row");\n'
      + '  for(var j=0;j<rows.length;j++){ rows[j].classList.toggle("active", j===idx); }\n'
      + '};\n'
      + 'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){var sl=document.getElementById("loafSlider"); if(sl) window.loafCpUpdate(sl.value);});}else{var sl=document.getElementById("loafSlider"); if(sl) window.loafCpUpdate(sl.value);}\n'
      + '})();</script>\n';
  }

  const blocks = opps.map((opp) => {
    if (!opp || typeof opp !== 'object') return '';
    if (opp.layout === 'slider-stack') return buildSliderStack(opp);
    const accent = opp.accent || '#4D61F4';
    const left = buildLeftCard(opp.left, accent);
    const right = buildRightCard(opp.right, accent);
    const gridStyle = (left && right) ? '' : ' style="grid-template-columns: minmax(0, 1fr);"';
    return ''
      + '<div class="prop-commercials-inner" style="--opp-accent:' + escapeAttr(accent) + ';">'
      + '<div class="prop-commercials-header">'
      + (opp.title ? '<h2 class="prop-commercials-title">' + escapeHtml(String(opp.title)) + '</h2>' : '')
      + (opp.subtitle ? '<p class="prop-commercials-sub">' + escapeHtml(String(opp.subtitle)) + '</p>' : '')
      + '</div>'
      + ((left || right)
          ? '<div class="prop-pricing-grid"' + gridStyle + '>' + left + right + '</div>'
          : '')
      + (opp.footnote ? '<p class="prop-commercials-footnote">' + escapeHtml(String(opp.footnote)) + '</p>' : '')
      + '</div>';
  });
  return blocks.join('\n');
}

// ── Proposal-specific How-it-works steps (2026-05-25) ─────────────────
// Reads `How Steps JSON` — array of {title, desc} — and emits the 4
// step cards with cala-style numbered badges + arrow connectors. Falls
// back to canonical cala defaults when blank.
function buildHowStepsHtml(record) {
  const defaults = [
    { title: 'Sites shared',           desc: 'You give us the developments you want to target. Postcodes, plot lists, or just a map pin — we\'ll work with what you have.' },
    { title: 'Audiences generated',    desc: 'Outra (or your agency) builds household-level audiences using our Propensity to Buy models, matched to your sites.' },
    { title: 'Audiences shared, your way', desc: 'Option to integrate directly with your ad accounts or share as downloadable CSVs. We can even set up with your DM provider via API.' },
    { title: 'Refreshed automatically', desc: 'Audiences updated monthly, so you\'re always targeting the highest propensity households, relevant to your sites.' },
  ];
  let steps = null;
  try {
    const raw = record && record['How Steps JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) steps = parsed;
    }
  } catch (_) {}
  const use = (steps && steps.length) ? steps : defaults;
  const arrowSvg = '<div class="prop-how-connector" aria-hidden="true">'
    + '<svg viewBox="0 0 100 12" preserveAspectRatio="none">'
    + '<line class="rail" x1="0" y1="6" x2="92" y2="6" />'
    + '<line class="pulse" x1="0" y1="6" x2="92" y2="6" />'
    + '<polygon class="arrow" points="92,2 100,6 92,10" />'
    + '</svg></div>';
  const stepBlocks = use.map((s, i) => ''
    + '<div class="prop-how-step">'
    + '<span class="prop-how-step-num">' + (i + 1) + '</span>'
    + '<div class="prop-how-step-title">' + escapeHtml(String((s && s.title) || '')) + '</div>'
    + '<div class="prop-how-step-desc">' + escapeHtml(String((s && s.desc) || '')) + '</div>'
    + '</div>');
  // Interleave arrows between steps (n-1 connectors for n steps).
  let out = '';
  stepBlocks.forEach((block, i) => {
    if (i > 0) out += arrowSvg;
    out += block;
  });
  return out;
}

// ── Proposal-specific Team grid (2026-05-25) ──────────────────────────
// Reads `Proposal Team Selection JSON` (array of member IDs) to pick
// which of the 5 TEAM_MEMBERS show. Renders cala-style .prop-team-card
// HTML (different markup from the overview's mf-team variant). CTA email
// pulls from `Team CTA Recipient` (same field as overview) or `CTA
// Recipient Email` as fallback.
function buildProposalTeamGridHtml(record) {
  let selection = null;
  try {
    const raw = record && record['Proposal Team Selection JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) selection = parsed;
    }
  } catch (_) {}
  const ASSET_BASE = '/signature-segments/';
  // Same selection-order-preserving lookup as buildTeamSectionHtml — the
  // dashboard's drag-to-reorder team grid writes the array in display
  // order so the live page must render in that order.
  const memberById = {};
  TEAM_MEMBERS.forEach((m) => { memberById[m.id] = m; });
  const members = (selection && selection.length)
    ? selection.map((id) => memberById[id]).filter(Boolean)
    : TEAM_MEMBERS;
  return members.map((m) => ''
    + '<div class="prop-team-card">'
    + '<div class="prop-team-photo">'
    +   '<img src="' + escapeAttr(teamMemberPhotoUrl(m, ASSET_BASE)) + '" alt="' + escapeAttr(m.name) + '" />'
    + '</div>'
    + '<div>'
    +   '<div class="prop-team-name">' + escapeHtml(m.name) + '</div>'
    +   '<div class="prop-team-role">' + escapeHtml(m.role) + '</div>'
    +   '<a class="prop-team-email" href="mailto:' + escapeAttr(m.email) + '">' + escapeHtml(m.email) + '</a>'
    + '</div>'
    + '</div>').join('\n');
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
    // User wants the new sub kept, but the em dash removed (mobile + desktop).
    // \u2014 swapped for a comma so the line reads cleanly without the
    // long em dash on either platform.
    sub:     field('Closed Loop Sub',     'It takes 7 meaningful brand exposures before most consumers convert, and 10+ for considered purchases. Outra\u2019s persistent household identifier lets you reach the same audience across every channel, every campaign, then learn what resonates and refine the next message.'),
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
  { key: 'Email',            value: 'sarah.jones@gmail.com',     enriched: false },
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
  // Teal pill matches Score / Insight / Activate column tags. PB uses
  // .tag-enrich (teal background + navy text); .tag-crm is the legacy
  // grey/black version kept around for back-compat but no longer the
  // default.
  return '<span class="csf-col-tag tag-enrich">' + escapeHtml(t) + '</span>';
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
    crmBadgeHtml:  buildCrmBadgeHtml(field('CRM Badge', 'Enrich'), crmBadgeEnabled),
    crmPropertiesHtml: buildCrmPropertiesHtml(record['CRM Properties JSON']),
    // Profile card (added 2026-05-15 v2)
    crmProfileName: profileName,
    crmProfileInitial: buildCrmProfileInitial(profileName),
    crmProfileSubtitle: field('CRM Profile Subtitle', 'CRM profile · ID 184273'),
    crmToggleLeft:  field('CRM Toggle Left',  'CRM only'),
    crmToggleRight: field('CRM Toggle Right', 'Enriched by Outra'),
    crmStat1Value: field('CRM Stat 1 Value', '25+'),
    crmStat1Label: field('CRM Stat 1 Label', 'Attributes added'),
    crmStat2Value: field('CRM Stat 2 Value', '98%'),
    crmStat2Label: field('CRM Stat 2 Label', 'Match rate'),
    crmStat3Value: field('CRM Stat 3 Value', '<24h'),
    crmStat3Label: field('CRM Stat 3 Label', 'Refresh time'),
    scoreTitle:    field('Score Title', 'Customer segmentation'),
    scoreRfvR:     field('Score RFV R', 'Recency'),
    scoreRfvF:     field('Score RFV F', 'Frequency'),
    scoreRfvV:     field('Score RFV V', 'Value'),
    // Two extra High/Med/Low rows added below R/F/V. Labels editable per
    // page; pills always render as High/Medium/Low to match rows 1-3.
    scoreRfvO1:    field('Score RFV O1', 'Outra attribute 1'),
    scoreRfvO2:    field('Score RFV O2', 'Outra attribute 2'),
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

// ── Proposal renderer (added 2026-05-23) ───────────────────────────────────
// Renders builder-template-proposal.html (cloned from cala-content) using
// a smaller placeholder map. Reuses the existing buildHeaderLogoHtml /
// buildTrustedBrandsHtml / buildChannelTilesHtml / buildHeroAvailableHtml
// helpers so brand selection, channel selection, and hero-strip style
// behave identically to overview microsites. Falls back to the cala
// defaults wherever Airtable fields are blank.
function renderProposalHtml(record) {
  const brandName = record['Brand Name'] || '';
  const logoUrl   = record['Logo URL'] || '';

  // Header — partner logo (next to Outra mark) + CTA button.
  const ctaRecipientEmail = (record['CTA Recipient Email'] && String(record['CTA Recipient Email']).trim())
    ? String(record['CTA Recipient Email']).trim()
    : 'hello@outra.co.uk';
  const headerLogoHtml = buildHeaderLogoHtml(brandName, logoUrl);
  const headerCtaHtml = '<a class="header-cta" href="mailto:' + escapeAttr(ctaRecipientEmail) + '">Talk to the team</a>';

  // Hero — headline + bullets fall back to canonical proposal copy.
  const defaultHeadline = 'Signal-Led Audiences,<br>Ready to Move, Built for **' + (brandName || 'Your Brand') + '**.';
  const heroHeadlineRaw = (record['Hero Headline'] && String(record['Hero Headline']).trim() !== '')
    ? String(record['Hero Headline'])
    : defaultHeadline;
  const heroHeadlineHtml = renderInlineMarkdown(heroHeadlineRaw).replace(/&lt;br&gt;/g, '<br>');

  const defaultBullet1 = 'Finally, a proven alternative to broad and wasteful targeting — introducing Outra\u2019s Propensity to Buy.';
  // Bullet 1 keeps its canonical fallback. Bullets 2 + 3 are now both
  // truly optional (2026-05-25) — a blank field on the record omits
  // the matching <li> on the live page instead of falling back to a
  // hardcoded sentence.
  const hb1 = (record['Hero Bullet 1'] && String(record['Hero Bullet 1']).trim()) ? String(record['Hero Bullet 1']) : defaultBullet1;
  const hb2 = (record['Hero Bullet 2'] && String(record['Hero Bullet 2']).trim()) ? String(record['Hero Bullet 2']) : '';
  const hb3 = (record['Hero Bullet 3'] && String(record['Hero Bullet 3']).trim()) ? String(record['Hero Bullet 3']) : '';
  let heroBulletsHtml = '<li>' + renderInlineMarkdown(hb1) + '</li>';
  if (hb2) heroBulletsHtml += '\n        <li>' + renderInlineMarkdown(hb2) + '</li>';
  if (hb3) heroBulletsHtml += '\n        <li>' + renderInlineMarkdown(hb3) + '</li>';

  // Hero "Ready to activate on" strip — reuse the overview helper. Default
  // selection on the cala proposal is meta/google/tiktok/direct-mail, in
  // tiles style. Users can override via the dashboard.
  const heroAvailableStyle = record['Hero Available Style'] === 'tiles' ? 'tiles' : 'tiles';
  let heroAvailableKeys = null;
  try {
    const raw = record['Hero Available Keys JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) heroAvailableKeys = parsed;
    }
  } catch (e) {}
  const heroAvailableHtml = buildHeroAvailableHtml(heroAvailableStyle, heroAvailableKeys);

  // Trusted brands — same selection mechanism as overview.
  let trustedBrandsKeys = null;
  try {
    const raw = record['Trusted Brands JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) trustedBrandsKeys = parsed;
    }
  } catch (e) {}
  const trustedBrandsHtml = buildTrustedBrandsHtml(trustedBrandsKeys);

  // Channels heading + subcopy + selection. Defaults are the cala copy.
  const channelsHeading = (record['Channels Heading'] && String(record['Channels Heading']).trim())
    ? renderInlineMarkdown(String(record['Channels Heading']))
    : 'Activate wherever your audience is';
  const channelsSubcopy = (brandName || 'Your brand') + ' audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, CRM, and direct mail.';
  let channelTilesKeys = null;
  try {
    const raw = record['Channel Tiles JSON'];
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) channelTilesKeys = parsed;
    }
  } catch (e) {}
  const channelTilesHtml = buildChannelTilesHtml(channelTilesKeys);

  const replacements = {
    PAGE_TITLE: 'Outra x ' + (brandName || 'Brand'),
    BRAND_NAME: escapeHtml(brandName || 'Your Brand'),
    HEADER_LOGO_HTML: headerLogoHtml,
    HEADER_CTA_HTML: headerCtaHtml,
    // Upstix + AIQ sections (PB-derived, opt-in via Page-structure).
    // Opportunity-area labels read as "Opportunity area NN · <name>"
    // — the dashboard editor cards expose these via the Upstix / AIQ
    // cards. Fall back to canonical PB labels when blank.
    UPSTIX_OPPORTUNITY_LABEL: escapeHtml(
      (record['Upstix Opportunity Label'] && String(record['Upstix Opportunity Label']).trim())
        || 'Opportunity area 02'
    ),
    AIQ_OPPORTUNITY_LABEL: escapeHtml(
      (record['AIQ Opportunity Label'] && String(record['AIQ Opportunity Label']).trim())
        || 'Opportunity area 03'
    ),
    // Patch section overrides (PB-derived, added 2026-05-26). Defaults
    // match the live PB page at proposals.outra.vip/purplebricks
    // (focus-7 section). All five fields fall back to canonical PB copy
    // when blank so a freshly-seeded PB-copy record renders identically
    // until a rep overrides per-record.
    PATCH_OPPORTUNITY_LABEL: escapeHtml(
      (record['Patch Opportunity Label'] && String(record['Patch Opportunity Label']).trim())
        || 'Opportunity area 04 \u00B7 Patch'
    ),
    PATCH_HEADLINE_LEAD: escapeHtml(
      (record['Patch Headline Lead'] && String(record['Patch Headline Lead']).trim())
        || 'Patch \u2013 the Intelligence agent,'
    ),
    PATCH_AUDIENCE: escapeHtml(
      (record['Patch Audience'] && String(record['Patch Audience']).trim())
        || 'estate agents'
    ),
    PATCH_HEADLINE_HIGHLIGHT: escapeHtml(
      (record['Patch Headline Highlight'] && String(record['Patch Headline Highlight']).trim())
        || 'over 12.7 hours per week'
    ),
    PATCH_FOOTNOTE: escapeHtml(
      (record['Patch Footnote'] && String(record['Patch Footnote']).trim())
        || '*KPI from measuring with alpha clients.'
    ),
    // Upstix per-step overrides — each card in the 3-step lead-flow has
    // an editable hero image, eyebrow, title and body. Blank fields
    // fall back to the canonical PB content (Sarah / 14 Beech Grove /
    // Upstix → Purplebricks valuation booked) so existing pages keep
    // their canonical story until a rep overrides specific fields.
    // Step 3 also carries a brand wordmark slot that falls back to
    // the proposal's own Logo URL when blank.
    UPSTIX_STEP1_IMG_URL: escapeAttr(
      (record['Upstix Step1 Image URL'] && String(record['Upstix Step1 Image URL']).trim())
        || 'https://proposals.outra.vip/purplebricks/upstix-asset.jpg'
    ),
    UPSTIX_STEP1_EYEBROW: escapeHtml(
      (record['Upstix Step1 Eyebrow'] && String(record['Upstix Step1 Eyebrow']).trim())
        || 'Step 1 \u00B7 Lead source'
    ),
    UPSTIX_STEP1_TITLE: escapeHtml(
      (record['Upstix Step1 Title'] && String(record['Upstix Step1 Title']).trim())
        || 'Vendor enquiry on Upstix'
    ),
    UPSTIX_STEP1_BODY: escapeHtml(
      (record['Upstix Step1 Body'] && String(record['Upstix Step1 Body']).trim())
        || 'Homeowner submits a cash offer enquiry through Upstix and is qualified by our AI chatbot.'
    ),
    UPSTIX_STEP2_IMG_URL: escapeAttr(
      (record['Upstix Step2 Image URL'] && String(record['Upstix Step2 Image URL']).trim())
        || 'https://proposals.outra.vip/purplebricks/p2b-conversion.svg'
    ),
    UPSTIX_STEP2_EYEBROW: escapeHtml(
      (record['Upstix Step2 Eyebrow'] && String(record['Upstix Step2 Eyebrow']).trim())
        || ('Step 2 \u00B7 ' + (brandName || 'Brand') + ' conversion')
    ),
    UPSTIX_STEP2_TITLE: escapeHtml(
      (record['Upstix Step2 Title'] && String(record['Upstix Step2 Title']).trim())
        || 'Market-value intent identified'
    ),
    UPSTIX_STEP2_BODY: escapeHtml(
      (record['Upstix Step2 Body'] && String(record['Upstix Step2 Body']).trim())
        || ('Vendors looking for market value (rather than an instant cash offer) are routed straight to ' + (brandName || 'the brand') + ' in real time.')
    ),
    UPSTIX_STEP3_IMG_URL: escapeAttr(
      (record['Upstix Step3 Image URL'] && String(record['Upstix Step3 Image URL']).trim())
        || 'https://proposals.outra.vip/purplebricks/purplebricks-asset.png'
    ),
    UPSTIX_STEP3_EYEBROW: escapeHtml(
      (record['Upstix Step3 Eyebrow'] && String(record['Upstix Step3 Eyebrow']).trim())
        || 'Step 3 \u00B7 Outcome'
    ),
    UPSTIX_STEP3_TITLE: escapeHtml(
      (record['Upstix Step3 Title'] && String(record['Upstix Step3 Title']).trim())
        || ('Booked ' + (brandName || 'brand') + ' valuation')
    ),
    UPSTIX_STEP3_BODY: escapeHtml(
      (record['Upstix Step3 Body'] && String(record['Upstix Step3 Body']).trim())
        || ('Qualified vendors land directly in the ' + (brandName || 'brand') + ' diary as a high-intent, ready-to-instruct appointment.')
    ),
    UPSTIX_STEP3_LOGO_URL: escapeAttr(
      (record['Upstix Step3 Logo URL'] && String(record['Upstix Step3 Logo URL']).trim())
        || logoUrl  // fall back to the proposal's Logo URL (Section 1)
        || 'https://proposals.outra.vip/purplebricks/pb-logo.png'
    ),
    HERO_HEADLINE_HTML: heroHeadlineHtml,
    HERO_BULLETS_HTML: heroBulletsHtml,
    HERO_AVAILABLE_HTML: heroAvailableHtml,
    TRUSTED_BRANDS_HTML: trustedBrandsHtml,
    CHANNELS_HEADING_HTML: channelsHeading,
    CHANNELS_SUBCOPY: escapeHtml(channelsSubcopy),
    CHANNEL_TILES_HTML: channelTilesHtml,
    PROP_TEAM_CTA_EMAIL: escapeAttr(ctaRecipientEmail),

    // ── PB-derived Propensity Map (added 2026-05-23) ─────────────────
    // All fields fall back to canonical PB defaults when blank so the
    // section renders out of the box, even before the editor card
    // exposes per-page overrides. Records that explicitly populate
    // these Airtable fields override the defaults verbatim.
    PROP_MAP_EYEBROW:        escapeHtml((record['Prop Map Eyebrow'] && String(record['Prop Map Eyebrow']).trim()) || 'Every home has an ideal moment to sell'),
    PROP_MAP_HEADLINE_HTML:  (function() {
      var raw = (record['Prop Map Headline'] && String(record['Prop Map Headline']).trim())
        ? String(record['Prop Map Headline'])
        : 'Introducing Outra\u2019s **household level precision targeting**';
      return renderInlineMarkdown(raw);
    })(),
    PROP_MAP_DESC:           escapeHtml((record['Prop Map Desc'] && String(record['Prop Map Desc']).trim()) || 'Outra signature segments are built household by household, fusing billions of verified property, financial and behavioural signals so you reach the buyers most likely to convert, not just the ones most likely to see your ad.'),
    PROP_MAP_QUOTE_LABEL:    escapeHtml((record['Prop Map Quote Label'] && String(record['Prop Map Quote Label']).trim()) || 'Challenges we solve'),
    PROP_MAP_QUOTE_1:        escapeHtml((record['Prop Map Quote 1'] && String(record['Prop Map Quote 1']).trim()) || 'Most of the people we put ads in front of aren\u2019t actually planning to move any time soon.'),
    PROP_MAP_QUOTE_2:        escapeHtml((record['Prop Map Quote 2'] && String(record['Prop Map Quote 2']).trim()) || 'How do we know if the right vendors are even seeing our brand, let alone considering us?'),
    PROP_MAP_QUOTE_3:        escapeHtml((record['Prop Map Quote 3'] && String(record['Prop Map Quote 3']).trim()) || 'Our CRM tells us who\u2019s registered, but not who\u2019s ready to instruct.'),
    PROP_MAP_STAT_LABEL:     escapeHtml((record['Prop Map Stat Label'] && String(record['Prop Map Stat Label']).trim()) || 'Property brands using the Outra platform'),
    PROP_MAP_STAT_1_VALUE:   escapeHtml((record['Prop Map Stat 1 Value'] && String(record['Prop Map Stat 1 Value']).trim()) || '42\u201370%'),
    PROP_MAP_STAT_1_LABEL:   escapeHtml((record['Prop Map Stat 1 Label'] && String(record['Prop Map Stat 1 Label']).trim()) || 'reduction in cost per qualified lead'),
    PROP_MAP_STAT_2_VALUE:   escapeHtml((record['Prop Map Stat 2 Value'] && String(record['Prop Map Stat 2 Value']).trim()) || '22\u201343%'),
    PROP_MAP_STAT_2_LABEL:   escapeHtml((record['Prop Map Stat 2 Label'] && String(record['Prop Map Stat 2 Label']).trim()) || 'higher click-to-conversion'),
    PROP_MAP_CAVEAT:         escapeHtml((record['Prop Map Caveat'] && String(record['Prop Map Caveat']).trim()) || '* Based on Outra testing across 10+ property brands against broad and portal-based audiences. Best results when creative and messaging is matched to the specific signature segment.'),
    // Canonical Outra propensity-map screen recording. The path says
    // "cala" because that's the folder it's stored in, but this is the
    // same file every overview microsite (Emma, Matches, etc) plays in
    // its propensity section — the CSS crop above is tuned to it.
    PROP_MAP_VIDEO_SRC:      escapeAttr((record['Prop Map Video URL'] && String(record['Prop Map Video URL']).trim()) || 'https://proposals.outra.vip/cala/p2b-recording.mp4'),
    // Match the Emma overview-microsite pattern exactly: white logo card
    // (4% padding, 1px border, drop shadow) with the brand logo
    // contain-fit in the upper portion and "Illustrative household
    // volumes" caption pinned 8% from the bottom. See
    // buildPropensitySectionHtml() in this file for the canonical
    // .propensity-video-logo-card / -img / -caption styles.
    PROP_MAP_VIDEO_LOGO_HTML: (logoUrl
      ? '<div class="propensity-video-logo-card">'
        + '<img class="propensity-video-logo-img" src="' + escapeAttr(logoUrl) + '" alt="' + escapeAttr(brandName || 'Brand') + '" />'
        + '<span class="propensity-video-logo-caption">Illustrative household volumes</span>'
        + '</div>'
      : ''),

    // ── PB-derived Closed-Loop Attribution (added 2026-05-23) ────────
    // Eyebrow + title + sub fall back to PB canonical defaults. The
    // 4 card slots (Resolve / Target / Activate / Measure) each have
    // num + title + body overrides. Figure emoji defaults to 🏠 (PB
    // housing context); set to '✦' or similar for non-property brands.
    CL_EYEBROW:        escapeHtml((record['CL Eyebrow'] && String(record['CL Eyebrow']).trim()) || 'One household. One persistent ID.'),
    CL_TITLE_HTML:     (function() {
      var raw = (record['CL Title'] && String(record['CL Title']).trim())
        ? String(record['CL Title'])
        : 'The same homeowner, **recognised every time** you reach them.';
      // Reuse the inline markdown helper but swap **word** for the
      // ".accent" span (matches the PB CSS, gradient blue→purple)
      return escapeHtml(raw).replace(/\*\*([^*]+)\*\*/g, '<span class="accent">$1</span>');
    })(),
    CL_SUB:            escapeHtml((record['CL Sub'] && String(record['CL Sub']).trim()) || 'Every customer is stitched to one household-level ID that travels with them across channels — so every campaign builds on the last instead of starting from zero.'),
    CL_FIGURE_EMOJI:   escapeHtml((record['CL Figure Emoji'] && String(record['CL Figure Emoji']).trim()) || '🏠'),
    CL_FIGURE_CAPTION: escapeHtml((record['CL Figure Caption'] && String(record['CL Figure Caption']).trim()) || 'Each household is a persistent identifier'),
    CL_CARD_1_NUM:     escapeHtml((record['CL Card 1 Num']   && String(record['CL Card 1 Num']).trim())   || '01 · Resolve'),
    CL_CARD_1_TITLE:   escapeHtml((record['CL Card 1 Title'] && String(record['CL Card 1 Title']).trim()) || 'One persistent household ID'),
    CL_CARD_1_BODY:    escapeHtml((record['CL Card 1 Body']  && String(record['CL Card 1 Body']).trim())  || 'Customer records, valuations and listings stitched to a single household ID with 25+ verified attributes attached.'),
    CL_CARD_2_NUM:     escapeHtml((record['CL Card 2 Num']   && String(record['CL Card 2 Num']).trim())   || '02 · Target'),
    CL_CARD_2_TITLE:   escapeHtml((record['CL Card 2 Title'] && String(record['CL Card 2 Title']).trim()) || 'Build audiences once, re-use everywhere'),
    CL_CARD_2_BODY:    escapeHtml((record['CL Card 2 Body']  && String(record['CL Card 2 Body']).trim())  || 'Audiences are defined against the household ID, so no re-identification, no leakage, and no rebuilding for each platform.'),
    CL_CARD_3_NUM:     escapeHtml((record['CL Card 3 Num']   && String(record['CL Card 3 Num']).trim())   || '03 · Activate'),
    CL_CARD_3_TITLE:   escapeHtml((record['CL Card 3 Title'] && String(record['CL Card 3 Title']).trim()) || 'Reach them on every channel'),
    CL_CARD_3_BODY:    escapeHtml((record['CL Card 3 Body']  && String(record['CL Card 3 Body']).trim())  || 'Push the audience to Meta, Google, TikTok, CTV, programmatic, addressable TV, CRM and direct mail — same ID, every destination.'),
    CL_CARD_4_NUM:     escapeHtml((record['CL Card 4 Num']   && String(record['CL Card 4 Num']).trim())   || '04 · Measure'),
    CL_CARD_4_TITLE:   escapeHtml((record['CL Card 4 Title'] && String(record['CL Card 4 Title']).trim()) || 'Outcomes tied back to the same ID'),
    CL_CARD_4_BODY:    escapeHtml((record['CL Card 4 Body']  && String(record['CL Card 4 Body']).trim())  || 'Impressions, valuations and conversions all reconcile to the household that saw the ad. No black-box attribution.'),

    // ── PB-derived Opportunity Summary (added 2026-05-23) ────────────
    // 4-card grid on navy gradient. Each card has its own accent colour.
    // Defaults are generic enough to land on most B2B proposals.
    OPP_EYEBROW:     escapeHtml((record['Opp Eyebrow']  && String(record['Opp Eyebrow']).trim())  || 'Unlocking acquisition & conversion'),
    OPP_TITLE_HTML:  (function() {
      var raw = (record['Opp Title'] && String(record['Opp Title']).trim())
        ? String(record['Opp Title'])
        : 'Four ways Outra **unlocks growth** for ' + (brandName || 'your brand');
      return escapeHtml(raw).replace(/\*\*([^*]+)\*\*/g, '<span class="accent">$1</span>');
    })(),
    OPP_SUB:         escapeHtml((record['Opp Sub'] && String(record['Opp Sub']).trim()) || 'From the first qualified lead through to the booked conversion — each stage of your funnel made more efficient, in one closed-loop system.'),
    OPP_1_ACCENT:    escapeAttr((record['Opp 1 Accent'] && String(record['Opp 1 Accent']).trim()) || '#4D61F4'),
    OPP_1_TITLE:     escapeHtml((record['Opp 1 Title']  && String(record['Opp 1 Title']).trim())  || 'CRM enrichment'),
    OPP_1_DESC:      escapeHtml((record['Opp 1 Desc']   && String(record['Opp 1 Desc']).trim())   || 'Enrich every CRM profile with household-level attributes so segmentation and lifecycle messaging finally reflect who the customer actually is.'),
    OPP_1_FOOT:      escapeHtml((record['Opp 1 Foot']   && String(record['Opp 1 Foot']).trim())   || 'Full marketing funnel optimisation'),
    OPP_2_ACCENT:    escapeAttr((record['Opp 2 Accent'] && String(record['Opp 2 Accent']).trim()) || '#7A6BFF'),
    OPP_2_TITLE:     escapeHtml((record['Opp 2 Title']  && String(record['Opp 2 Title']).trim())  || 'High-intent leads'),
    OPP_2_DESC:      escapeHtml((record['Opp 2 Desc']   && String(record['Opp 2 Desc']).trim())   || 'Real-time, AI-qualified inbound enquiries routed straight into your sales team — a ready-to-convert pipeline alongside your own marketing.'),
    OPP_2_FOOT:      escapeHtml((record['Opp 2 Foot']   && String(record['Opp 2 Foot']).trim())   || 'Upper funnel, high-intent inbound'),
    OPP_3_ACCENT:    escapeAttr((record['Opp 3 Accent'] && String(record['Opp 3 Accent']).trim()) || '#CB88FF'),
    OPP_3_TITLE:     escapeHtml((record['Opp 3 Title']  && String(record['Opp 3 Title']).trim())  || 'Conversational qualification'),
    OPP_3_DESC:      escapeHtml((record['Opp 3 Desc']   && String(record['Opp 3 Desc']).trim())   || 'Every inbound enquiry handled and qualified in real time, before it reaches a human — so your team only spends time on conversations worth having.'),
    OPP_3_FOOT:      escapeHtml((record['Opp 3 Foot']   && String(record['Opp 3 Foot']).trim())   || 'Full-funnel conversion optimisation'),
    OPP_4_ACCENT:    escapeAttr((record['Opp 4 Accent'] && String(record['Opp 4 Accent']).trim()) || '#09AFCF'),
    OPP_4_TITLE:     escapeHtml((record['Opp 4 Title']  && String(record['Opp 4 Title']).trim())  || 'Agent intelligence'),
    OPP_4_DESC:      escapeHtml((record['Opp 4 Desc']   && String(record['Opp 4 Desc']).trim())   || 'A live view of every household, so your team walks into every appointment knowing exactly who they\u2019re talking to and what to lead with.'),
    OPP_4_FOOT:      escapeHtml((record['Opp 4 Foot']   && String(record['Opp 4 Foot']).trim())   || 'Mid & lower funnel conversion'),

    // ── PB-derived CRM enrichment / Customer segmentation (2026-05-25) ─
    // Simplified 4-column flow (Entry → Enrich → Score & Insight →
    // Activate). All fields fall back to generic enrichment defaults
    // so the section can be turned on for any proposal without bespoke
    // copy. PB's live RFV/segment-bar animations + Leaflet map are NOT
    // ported in v1.
    CRM_EYEBROW:      escapeHtml((record['CRM Eyebrow']  && String(record['CRM Eyebrow']).trim())  || 'Customer enrichment'),
    CRM_TITLE_HTML:   escapeHtml((record['CRM SecTitle'] && String(record['CRM SecTitle']).trim()) || 'CRM Enrichment and Activation'),
    CRM_BRAND_NAME:   escapeHtml(brandName || 'Your brand'),
    CRM_SUB:          escapeHtml((record['CRM SecSub']   && String(record['CRM SecSub']).trim())   || 'Unlocking the power of your CRM with household-level enrichment, scoring and actionable insight.'),
    CRM_ENTRY_LOGO_HTML: (logoUrl ? '<img class="pcs-entry-logo" src="' + escapeAttr(logoUrl) + '" alt="' + escapeAttr(brandName || 'Brand') + '" />' : ''),
    CRM_ENTRY_HEADING: escapeHtml((record['CRM Entry Heading'] && String(record['CRM Entry Heading']).trim()) || (brandName || 'Your') + ' first-party customer data'),
    CRM_ENTRY_DESC:   escapeHtml((record['CRM Entry Desc'] && String(record['CRM Entry Desc']).trim()) || 'CRM, order history, email lists, sales and customer reviews, matched and enriched at household level.'),
    CRM_ENTRY_STAT_1_VAL:   escapeHtml((record['CRM Entry Stat 1 Val']   && String(record['CRM Entry Stat 1 Val']).trim())   || '12m'),
    CRM_ENTRY_STAT_1_LABEL: escapeHtml((record['CRM Entry Stat 1 Label'] && String(record['CRM Entry Stat 1 Label']).trim()) || 'Profiles'),
    CRM_ENTRY_STAT_2_VAL:   escapeHtml((record['CRM Entry Stat 2 Val']   && String(record['CRM Entry Stat 2 Val']).trim())   || '98%'),
    CRM_ENTRY_STAT_2_LABEL: escapeHtml((record['CRM Entry Stat 2 Label'] && String(record['CRM Entry Stat 2 Label']).trim()) || 'Match rate'),
    CRM_ENRICH_TITLE: escapeHtml((record['CRM Enrich Title'] && String(record['CRM Enrich Title']).trim()) || 'Profile enrichment'),
    CRM_ENRICH_ITEM_1: escapeHtml((record['CRM Enrich Item 1'] && String(record['CRM Enrich Item 1']).trim()) || 'Pre-mover score'),
    CRM_ENRICH_ITEM_2: escapeHtml((record['CRM Enrich Item 2'] && String(record['CRM Enrich Item 2']).trim()) || 'Affluence band'),
    CRM_ENRICH_ITEM_3: escapeHtml((record['CRM Enrich Item 3'] && String(record['CRM Enrich Item 3']).trim()) || 'Property type + tenure'),
    CRM_ENRICH_ITEM_4: escapeHtml((record['CRM Enrich Item 4'] && String(record['CRM Enrich Item 4']).trim()) || 'Recent moves + market events'),
    CRM_ENRICH_ITEM_5: escapeHtml((record['CRM Enrich Item 5'] && String(record['CRM Enrich Item 5']).trim()) || 'Lifestyle + life-stage signals'),
    CRM_ENRICH_KPI_1_VAL:   escapeHtml((record['CRM Enrich KPI 1 Val']   && String(record['CRM Enrich KPI 1 Val']).trim())   || '25+'),
    CRM_ENRICH_KPI_1_LABEL: escapeHtml((record['CRM Enrich KPI 1 Label'] && String(record['CRM Enrich KPI 1 Label']).trim()) || 'Attributes added'),
    CRM_ENRICH_KPI_2_VAL:   escapeHtml((record['CRM Enrich KPI 2 Val']   && String(record['CRM Enrich KPI 2 Val']).trim())   || '<24h'),
    CRM_ENRICH_KPI_2_LABEL: escapeHtml((record['CRM Enrich KPI 2 Label'] && String(record['CRM Enrich KPI 2 Label']).trim()) || 'Refresh time'),
    CRM_SCORE_TITLE:  escapeHtml((record['CRM Score Title']  && String(record['CRM Score Title']).trim())  || 'Audience segments'),
    CRM_SCORE_ITEM_1: escapeHtml((record['CRM Score Item 1'] && String(record['CRM Score Item 1']).trim()) || 'High-intent movers'),
    CRM_SCORE_ITEM_2: escapeHtml((record['CRM Score Item 2'] && String(record['CRM Score Item 2']).trim()) || 'Lifecycle anniversaries'),
    CRM_SCORE_ITEM_3: escapeHtml((record['CRM Score Item 3'] && String(record['CRM Score Item 3']).trim()) || 'High net worth households'),
    CRM_SCORE_ITEM_4: escapeHtml((record['CRM Score Item 4'] && String(record['CRM Score Item 4']).trim()) || 'Just moved'),
    CRM_SCORE_ITEM_5: escapeHtml((record['CRM Score Item 5'] && String(record['CRM Score Item 5']).trim()) || 'Custom segments by RFV'),
    CRM_ACTIVATE_TITLE:  escapeHtml((record['CRM Activate Title']  && String(record['CRM Activate Title']).trim())  || 'Target & activate'),
    CRM_ACTIVATE_ITEM_1: escapeHtml((record['CRM Activate Item 1'] && String(record['CRM Activate Item 1']).trim()) || 'Build custom segments from enriched data'),
    CRM_ACTIVATE_ITEM_2: escapeHtml((record['CRM Activate Item 2'] && String(record['CRM Activate Item 2']).trim()) || 'Find lookalikes of your best customers'),
    CRM_ACTIVATE_ITEM_3: escapeHtml((record['CRM Activate Item 3'] && String(record['CRM Activate Item 3']).trim()) || 'Activate across programmatic, social and CTV'),

    // ── Multi-Opportunity Commercials (2026-05-25) ────────────────────
    // Replaces the cala pricing slider with N data-driven opportunity
    // cards. Each entry in `Commercials JSON` produces one block on the
    // page. v1 ships tier-table only (no live slider) — see plan.
    COMMERCIALS_INNER_HTML: buildCommercialsHtml(record),
    // ── How it works (parameterised 2026-05-25) ───────────────────────
    HOW_TITLE: escapeHtml((record['How Title'] && String(record['How Title']).trim()) || 'How Propensity to Buy Works'),
    HOW_SUB:   escapeHtml((record['How Sub']   && String(record['How Sub']).trim())   || 'From sites shared to live audiences in the channels of your choice.'),
    HOW_STEPS_HTML: buildHowStepsHtml(record),
    // ── Proposal Team strip (parameterised 2026-05-25) ────────────────
    PROPOSAL_TEAM_TITLE: escapeHtml((record['Proposal Team Title'] && String(record['Proposal Team Title']).trim()) || 'Your team at Outra'),
    PROPOSAL_TEAM_SUB:   escapeHtml((record['Proposal Team Sub']   && String(record['Proposal Team Sub']).trim())   || 'A complete team supporting you across marketing, data science, agency expertise and customer success.'),
    PROPOSAL_TEAM_GRID_HTML: buildProposalTeamGridHtml(record),
  };

  let html = loadTemplate('proposal');
  html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in replacements) return replacements[key];
    // Cala template contains many template-literal placeholders that we
    // haven't parameterised yet — keep their canonical default content
    // by returning an empty string only when the placeholder is one we
    // explicitly own.
    return match;  // leave untouched so unparameterised content survives
  });

  // Reorder + hide via SEC markers (same logic as overview).
  // Legacy id migration (2026-05-25): records saved before the
  // Precision-targeting → Outra Household targeting merge may carry
  // 'g-propensitymap' in their Section Order / Section Hidden arrays.
  // Rewrite to 'g-household' so the rest of the renderer never sees
  // the legacy id. See migrateLegacySectionIds().
  let sectionOrder = [];
  let sectionHidden = [];
  try { if (record['Section Order'])  { const v = JSON.parse(record['Section Order']);  if (Array.isArray(v)) sectionOrder = migrateLegacySectionIds(v); } } catch (_) {}
  try { if (record['Section Hidden']) { const v = JSON.parse(record['Section Hidden']); if (Array.isArray(v)) sectionHidden = migrateLegacySectionIds(v); } } catch (_) {}

  // Default-hide opt-in sections so records created before these groups
  // existed don't suddenly grow new sections. The guard only force-hides
  // IDs the user hasn't explicitly placed in sectionOrder yet — once
  // they enable it via the Page structure panel, this steps out of the
  // way and the user's saved sectionHidden state takes over.
  // g-household (formerly g-propensitymap, merged 2026-05-25) stays
  // default-hidden on proposal pages so existing pages where it was
  // off-by-default keep that behaviour after the id rename.
  const OPT_IN_BY_DEFAULT = ['g-household', 'g-oppsummary', 'g-crmseg', 'g-upstix', 'g-aiq', 'g-patch'];
  OPT_IN_BY_DEFAULT.forEach((id) => {
    if (sectionOrder.indexOf(id) === -1 && sectionHidden.indexOf(id) === -1) {
      sectionHidden.push(id);
    }
  });

  html = applySectionStructureProposal(html, sectionOrder, sectionHidden);

  // Inject the live-update bridge so the dashboard preview iframe can
  // patch hero/bullets/channels/brand-name + reorder channel tiles &
  // trusted-brand logos without a full reload. The selectors in the
  // script target classes shared by both overview and proposal
  // templates (.hero h1, .hero-bullets, .channels-section h2,
  // .channels-grid.channels-available, .social-proof-set) so the
  // exact same script works for both.
  html = html.replace('</body>', buildLiveUpdateScript(brandName) + '\n</body>');

  return html;
}

// Proposal-specific section ID set for applySectionStructure. We need a
// separate list because the proposal template has different group IDs
// than the overview (g-video / g-how / g-commercials vs the overview's
// g-search etc).
const PROPOSAL_REORDERABLE_SECTION_IDS = [
  // Canonical proposal order. Outra Household targeting (g-household,
  // formerly g-propensitymap before the 2026-05-25 merge) is the 4th
  // section so the live page reads brand → trusted → household → P2B
  // video → activation channels → … . This matches MB_SECTION_DEFS_LIST
  // in the dashboard so the Page-structure panel and the iframe always
  // agree before a user has saved a custom sectionOrder. g-household is
  // still default-hidden via OPT_IN_BY_DEFAULT above on proposal pages
  // — listing it here only dictates *position* if/when enabled.
  'g-header', 'g-hero', 'g-trusted', 'g-household', 'g-video',
  'g-channels', 'g-how', 'g-commercials', 'g-team',
  // Remaining PB-derived opt-in groups (also default-hidden). Upstix +
  // AIQ ported wholesale from public/Purplebricks.html on 2026-05-25 —
  // they ship with their own CSS in the proposal template + the AIQ
  // section carries a self-contained <script> IIFE that drives the
  // animated SMS phone thread.
  // g-closedloop-pb dropped 2026-05-25 — see comment above
  // PROPOSAL_ONLY_SECTION_IDS.
  'g-oppsummary', 'g-crmseg', 'g-upstix', 'g-aiq',
  // Patch ported wholesale from public/Purplebricks.html on 2026-05-26.
  'g-patch',
];
function applySectionStructureProposal(html, sectionOrder, sectionHidden) {
  const hide = new Set(Array.isArray(sectionHidden) ? sectionHidden : []);
  hide.forEach((id) => {
    const re = new RegExp(
      '<!--\\s*SEC_START:' + String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*-->[\\s\\S]*?<!--\\s*SEC_END:' + String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*-->',
      'g'
    );
    html = html.replace(re, '');
  });
  if (!Array.isArray(sectionOrder) || sectionOrder.length === 0) return html;

  const blocks = {};
  PROPOSAL_REORDERABLE_SECTION_IDS.forEach((id) => {
    if (hide.has(id)) return;
    const re = new RegExp(
      '<!--\\s*SEC_START:' + id + '\\s*-->([\\s\\S]*?)<!--\\s*SEC_END:' + id + '\\s*-->',
      'g'
    );
    const m = re.exec(html);
    if (m) blocks[id] = m[0];
  });
  const seen = new Set();
  const finalOrder = [];
  sectionOrder.forEach((id) => { if (blocks[id] && !seen.has(id)) { seen.add(id); finalOrder.push(id); } });
  PROPOSAL_REORDERABLE_SECTION_IDS.forEach((id) => { if (blocks[id] && !seen.has(id)) { seen.add(id); finalOrder.push(id); } });
  if (finalOrder.length === 0) return html;
  const concatenated = finalOrder.map((id) => blocks[id]).join('\n');
  let firstReplaced = false;
  PROPOSAL_REORDERABLE_SECTION_IDS.forEach((id) => {
    if (!blocks[id]) return;
    if (!firstReplaced) { html = html.replace(blocks[id], concatenated); firstReplaced = true; }
    else { html = html.replace(blocks[id], ''); }
  });
  return html;
}

// Section IDs that only exist in builder-template-proposal.html. If any
// of these are enabled (= present in sectionOrder OR absent from
// sectionHidden where they default-hide), we must render with the
// proposal template because the overview template doesn't carry the
// SEC blocks or CSS for these sections.
const PROPOSAL_ONLY_SECTION_IDS = new Set([
  // g-propensitymap was merged into g-household on 2026-05-25 — same
  // conceptual section, just different template visuals. g-household
  // is NOT in this set because it exists in both templates now (the
  // overview template's 7b card + the proposal template's
  // SEC_START:g-household block, formerly g-propensitymap).
  'g-video', 'g-how', 'g-commercials',
  // g-closedloop-pb removed 2026-05-25: the existing g-closedloop covers
  // the same conceptual section. Leftover sectionOrder entries on saved
  // records are silently ignored by applySectionStructureProposal.
  'g-oppsummary', 'g-crmseg',
  'g-upstix', 'g-aiq', 'g-patch',
]);

// Heuristic: does this record have any proposal-only section turned on?
// Reads Section Order + Section Hidden the same way the renderer does.
// All proposal-only sections default-hide via OPT_IN_BY_DEFAULT in the
// proposal renderer, so the only way one is "on" is if the user
// explicitly placed it in sectionOrder OR sectionHidden does NOT
// include it. We use the safer "in sectionOrder AND not in
// sectionHidden" test so an empty record stays an overview.
function recordUsesProposalSections(record) {
  let sectionOrder = [];
  let sectionHidden = [];
  try { if (record && record['Section Order'])  { const v = JSON.parse(record['Section Order']);  if (Array.isArray(v)) sectionOrder = migrateLegacySectionIds(v); } } catch (_) {}
  try { if (record && record['Section Hidden']) { const v = JSON.parse(record['Section Hidden']); if (Array.isArray(v)) sectionHidden = migrateLegacySectionIds(v); } } catch (_) {}
  const hiddenSet = new Set(sectionHidden);
  for (const id of sectionOrder) {
    if (PROPOSAL_ONLY_SECTION_IDS.has(id) && !hiddenSet.has(id)) return true;
  }
  return false;
}

function renderHtml(record) {
  // Phase 1 of the builder-unification (2026-05-25): we no longer fork
  // on the legacy `Type` field. Instead we dispatch by *which sections
  // are enabled*. Records with any proposal-only section turned on
  // (Upstix Leads, AIQ, Precision targeting, P2B video, Commercials,
  // How it works, Closed-loop PB, Opportunity summary, CRM enrichment)
  // render with the proposal template so the markup + CSS for those
  // sections is available. Everything else uses the overview template.
  // The dashboard now exposes a single unified Page-structure panel
  // — proposal sections default-hide and live in the "Hidden / unused
  // sections" drawer until a rep opts them in.
  //
  // Why we still keep the `Type` field as a fallback signal: legacy
  // records may have been created as `proposal` before the unification
  // and may not yet have explicit sectionOrder entries. Those records
  // should still render via the proposal template. New records use
  // sectionOrder as the source of truth.
  // Path A unification (2026-05-25): records with Template='unified'
  // go through renderUnifiedHtml which composes a page from both legacy
  // template outputs. Existing records (Template field empty / absent)
  // continue through the legacy dispatch unchanged.
  if (String(record && record['Template'] || '').toLowerCase() === 'unified') {
    return renderUnifiedHtml(record);
  }

  // Renderer dispatch is gated STRICTLY on c.type now (2026-05-26).
  // Previously this used `legacyType === 'proposal' || recordUsesProposalSections(record)`
  // which sniffed sectionOrder for proposal-only IDs. That heuristic
  // bit us repeatedly: a rep clicking Show on a proposal-only section
  // (Upstix/AIQ/Patch) on Emma's overview record made
  // recordUsesProposalSections return true, which flipped the dispatch
  // to renderProposalHtml and silently dropped every overview-shape
  // section (Maxi search, audience-categories, first-party, etc.).
  // The page rendered as a proposal even though Emma's Type='overview'.
  // Now we trust c.type as the single signal. Cross-template sections
  // in sectionOrder are silently ignored by the chosen template's
  // applySectionStructure (the SEC marker for the cross-template id
  // doesn't exist in the template, so it has no effect).
  const legacyType = String(record && record['Type'] || '').toLowerCase();
  if (legacyType === 'proposal') {
    return renderProposalHtml(record);
  }

  // From here on this is renderHtml's legacy overview body. Extracted into
  // renderOverviewHtmlImpl so renderUnifiedHtml can reuse the fully-
  // substituted overview output without re-triggering the dispatch.
  return renderOverviewHtmlImpl(record);
}

// ── Octopus EV bespoke section (2026-06-29) ──────────────────────────────
// Slug-gated "segment breakdown by persona" block injected before the
// footer for the OctopusEV overview record only. Content lifted from the
// Octopus_EV_Audiences PDF (Four Fits Workshop, 2nd June). Self-contained:
// carries its own scoped <style> (oev-* class prefix) so it can't collide
// with the rest of the microsite. Designed to fit one screen (no internal
// vertical scroll) using a compact two-block layout: persona table on top,
// filters + exclusions columns below. Mirrors the slug-gated override
// pattern used for MatchesFashion. Will graduate to a builder section if
// it proves reusable.
function buildOctopusEvSegmentSection() {
  const personas = [
    ['Age 30s–80s salary',        'Wide age-range drivers; employed professionals',   '4.17M', '13.5%', 'Age 30–80, high income / vehicle value, employed'],
    ['Homeowner charger-ready',   'Physical infrastructure for EV adoption',          '13.0M', '42.0%', 'Owner, garage + driveway, detached / semi-detached'],
    ['Family households',         'Parents with any-age children, incl. adult kids',  '9.54M', '30.8%', 'Children at home, 3+ bedrooms, household size 3+'],
    ['Two-car family households', 'SUV as primary, hatchback as second car',          '1.10M', '3.5%',  'Ages 35–65, 2 vehicles, kids, 3+ bedrooms'],
    ['High income, no dependents','Disposable income, simplicity-motivated buyers',   '693K',  '2.2%',  '£100k+ income, no kids, owner, employed'],
    ['Value brand buyers',        'Open to budget / emerging brands (MG, BYD…)',      '352K',  '1.1%',  'Historic owners of value / EV brands'],
    ['Waitrose psychographic',    'Hassle-free, tech-comfortable, premium fit',       '799K',  '2.6%',  'Ages 30–59, £100k+ income, premium supermarket shopper'],
  ];
  const filters = [
    ['Good credit score',          '18.1M', 'Essential for leasing qualification'],
    ['Tech early-adopter mindset', '9.3M',  'Modern home or high EPC + frequent internet user'],
    ['ULEZ financial pressure',    '4.6M',  'Within 20km of a ULEZ boundary'],
    ['Low–medium mileage',         '13.4M', '0–9k annual miles — range anxiety not a barrier'],
    ['High purchasing power',      '7.6M',  'Affluent households, strong disposable income'],
    ['Ultra high purchasing power','1.4M',  'Premium segment with exceptional wealth'],
  ];
  const exclusions = [
    ['Rural, no charging',     '71K',  'No driveway or public charging infrastructure'],
    ['Low affordability',      '2.9M', 'Extremely price-sensitive, monthly-cost focused'],
    ['Low tech confidence',    '5.4M', 'Older / offline users uneasy with new tech'],
    ['First-time young buyers','1.2M', 'Aged 18–23; credit / insurance barriers to leasing'],
  ];

  const personaRows = personas.map(function (p) {
    return '<tr>'
      + '<td class="oev-seg-name">' + escapeHtml(p[0]) + '</td>'
      + '<td class="oev-seg-brief">' + escapeHtml(p[1]) + '</td>'
      + '<td class="oev-seg-uprn"><span class="oev-uprn-val">' + escapeHtml(p[2]) + '</span>'
      +   '<span class="oev-uprn-pct">' + escapeHtml(p[3]) + '</span></td>'
      + '<td class="oev-seg-crit">' + escapeHtml(p[4]) + '</td>'
      + '</tr>';
  }).join('');

  const filterRows = filters.map(function (f) {
    return '<div class="oev-pill oev-pill-keep">'
      + '<span class="oev-dot oev-dot-keep"></span>'
      + '<span class="oev-pill-body"><span class="oev-pill-label">' + escapeHtml(f[0]) + '</span>'
      +   '<span class="oev-pill-desc">' + escapeHtml(f[2]) + '</span></span>'
      + '<span class="oev-pill-num oev-pill-num-keep">' + escapeHtml(f[1]) + '</span>'
      + '</div>';
  }).join('');

  const exclusionRows = exclusions.map(function (x) {
    return '<div class="oev-pill oev-pill-drop">'
      + '<span class="oev-dot oev-dot-drop"></span>'
      + '<span class="oev-pill-body"><span class="oev-pill-label">' + escapeHtml(x[0]) + '</span>'
      +   '<span class="oev-pill-desc">' + escapeHtml(x[2]) + '</span></span>'
      + '<span class="oev-pill-num oev-pill-num-drop">&minus;' + escapeHtml(x[1]) + '</span>'
      + '</div>';
  }).join('');

  return ''
+ '<!-- SEC_START:g-oev-segments -->\n'
+ '<style>\n'
+ '.oev-seg{background:linear-gradient(170deg,#0A135B 0%,#13206E 55%,#1A2380 100%);color:#fff;padding:18px 24px 12px;position:relative;overflow:hidden;height:100vh;display:flex;align-items:stretch;box-sizing:border-box;}\n'
+ '.oev-seg:before{content:"";position:absolute;top:-120px;right:-80px;width:420px;height:420px;background:radial-gradient(circle,rgba(77,97,244,0.35) 0%,transparent 70%);pointer-events:none;}\n'
+ '.oev-seg:after{content:"";position:absolute;bottom:-140px;left:-60px;width:360px;height:360px;background:radial-gradient(circle,rgba(194,254,151,0.10) 0%,transparent 70%);pointer-events:none;}\n'
+ '.oev-inner{max-width:1180px;margin:0 auto;position:relative;z-index:1;width:100%;display:flex;flex-direction:column;}\n'
+ '.oev-head{text-align:center;margin-bottom:18px;}\n'
+ '.oev-eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9FAAFF;background:rgba(159,170,255,0.12);border:1px solid rgba(159,170,255,0.28);padding:3px 12px;border-radius:999px;margin-bottom:6px;}\n'
+ '.oev-title{font-size:clamp(26px,3.2vw,34px);font-weight:800;line-height:1.1;margin:0 0 6px;letter-spacing:-0.02em;}\n'
+ '.oev-title .oev-grad{background:linear-gradient(135deg,#C2FE97,#4CDCC7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}\n'
+ '.oev-sub{font-size:13px;color:rgba(255,255,255,0.66);margin:0;}\n'
+ '.oev-card{background:#F6F5F1;border:1px solid #E8E5DF;border-radius:16px;padding:12px 14px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}\n'
+ '.oev-card-title{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0A135B;margin:0 0 6px;}\n'
+ '.oev-card-title .oev-num{color:#0A135B;background:rgba(10,19,91,0.08);border:1px solid rgba(10,19,91,0.15);border-radius:8px;padding:2px 9px;font-size:12px;}\n'
+ '.oev-table{width:100%;border-collapse:collapse;font-size:13px;}\n'
+ '.oev-table thead th{text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(10,19,91,0.45);padding:0 12px 7px;border-bottom:1px solid rgba(10,19,91,0.10);}\n'
+ '.oev-table thead th.oev-th-uprn{text-align:center;}\n'
+ '.oev-table tbody td{padding:6px 12px;border-bottom:1px solid rgba(10,19,91,0.06);vertical-align:middle;}\n'
+ '.oev-table tbody tr:last-child td{border-bottom:none;}\n'
+ '.oev-seg-name{font-weight:700;color:#0A135B;white-space:nowrap;}\n'
+ '.oev-seg-brief{color:rgba(10,19,91,0.75);}\n'
+ '.oev-seg-uprn{text-align:center;white-space:nowrap;}\n'
+ '.oev-uprn-val{font-weight:800;color:#1A8A4A;font-variant-numeric:tabular-nums;}\n'
+ '.oev-uprn-pct{display:inline-block;color:rgba(10,19,91,0.58);font-size:11px;margin-left:6px;min-width:42px;}\n'
+ '.oev-seg-crit{color:rgba(10,19,91,0.68);font-size:12px;}\n'
+ '.oev-body{display:grid;grid-template-columns:1.7fr 1fr;gap:14px;align-items:stretch;flex:1 1 auto;}\n'
+ '.oev-card-personas{margin-bottom:0;height:100%;}\n'
// Right column matches the left card height: the two cards share that height on
// rows sized 6fr / 4fr (6 filters vs 4 exclusions) so pill density stays even,
// and each card distributes spare vertical space across its pills.
+ '.oev-split{display:grid;grid-template-columns:1fr;grid-template-rows:6fr 4fr;gap:10px;height:100%;}\n'
+ '.oev-split .oev-card{margin-bottom:0;display:flex;flex-direction:column;min-height:0;}\n'
+ '.oev-split .oev-card-title{flex:0 0 auto;}\n'
+ '.oev-pill{display:flex;align-items:center;gap:10px;padding:5px 10px;border-radius:10px;background:#fff;border:1px solid #E8E5DF;box-shadow:0 1px 4px rgba(0,0,0,0.06);margin-bottom:4px;flex:1 1 0;min-height:0;}\n'
+ '.oev-pill:last-child{margin-bottom:0;}\n'
+ '.oev-dot{flex:0 0 auto;width:10px;height:10px;border-radius:50%;}\n'
+ '.oev-dot-keep{background:#34C759;box-shadow:0 0 6px rgba(52,199,89,0.4);}\n'
+ '.oev-dot-drop{background:#FF3B30;box-shadow:0 0 6px rgba(255,59,48,0.4);}\n'
+ '.oev-pill-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px;}\n'
+ '.oev-pill-label{font-weight:700;font-size:12px;color:#0A135B;}\n'
+ '.oev-pill-desc{font-size:11px;color:rgba(10,19,91,0.75);line-height:1.3;}\n'
+ '.oev-pill-num{flex:0 0 auto;font-weight:800;font-size:12px;font-variant-numeric:tabular-nums;}\n'
+ '.oev-pill-num-keep{color:#1A8A4A;font-size:13px;}\n'
+ '.oev-pill-num-drop{color:#D92D20;font-size:13px;}\n'
+ '@media(max-width:980px){.oev-body{grid-template-columns:1fr;}}\n'
+ '@media(max-width:760px){.oev-table thead th.oev-th-crit,.oev-table td.oev-seg-crit{display:none;}.oev-seg{padding:48px 16px 56px;}}\n'
+ '</style>\n'
+ '<section class="oev-seg" id="oevSeg">\n'
+ '  <div class="oev-inner">\n'
+ '    <div class="oev-head">\n'
+ '      <h2 class="oev-title">Identifying the <span class="oev-grad">high-fit customer</span></h2>\n'
+ '      <p class="oev-sub">Taking Octopus EV persona insight from the &lsquo;Four Fits Workshop&rsquo;.</p>\n'
+ '    </div>\n'
+ '    <div class="oev-body">\n'
+ '      <div class="oev-card oev-card-personas">\n'
+ '        <div class="oev-card-title">High-fit segments<span class="oev-num">8 personas</span></div>\n'
+ '        <table class="oev-table">\n'
+ '          <thead><tr>'
+           '<th>Segment</th><th>Brief alignment</th>'
+           '<th class="oev-th-uprn">UPRNs</th><th class="oev-th-crit">Key criteria</th>'
+           '</tr></thead>\n'
+ '          <tbody>' + personaRows + '</tbody>\n'
+ '        </table>\n'
+ '      </div>\n'
+ '      <div class="oev-split">\n'
+ '        <div class="oev-card">\n'
+ '          <div class="oev-card-title">Filters available</div>\n'
+           filterRows + '\n'
+ '        </div>\n'
+ '        <div class="oev-card">\n'
+ '          <div class="oev-card-title">Exclusion suggestions</div>\n'
+           exclusionRows + '\n'
+ '        </div>\n'
+ '      </div>\n'
+ '    </div>\n'
+ '  </div>\n'
+ '</section>\n'
+ '<!-- SEC_END:g-oev-segments -->\n';
}

function renderOverviewHtmlImpl(record) {
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
  // Bullet 2 + 3 are both truly optional (2026-05-25). The editor
  // shows a "Leave blank to omit" placeholder, and a blank field
  // omits the <li> on the live page rather than falling back to a
  // hardcoded sentence. Bullet 1 keeps its canonical fallback.
  let heroBullet1, heroBullet2, heroBullet3;
  if (hasBrandedLayout(record)) {
    heroBullet1 = 'Precision targeting that reaches only audiences affluent enough to actually buy.';
    heroBullet2 = 'One spine to your marketing. Household-level data driving every campaign off a single source of truth.';
    heroBullet3 = 'Close the loop on what\u2019s actually driving sales, and use those signals to power future campaigns.';
  } else {
    heroBullet1 = (record['Hero Bullet 1'] != null && String(record['Hero Bullet 1']).trim() !== '')
      ? String(record['Hero Bullet 1']) : defaultBullet1;
    heroBullet2 = (record['Hero Bullet 2'] != null && String(record['Hero Bullet 2']).trim() !== '')
      ? String(record['Hero Bullet 2']) : '';
    heroBullet3 = (record['Hero Bullet 3'] != null && String(record['Hero Bullet 3']).trim() !== '')
      ? String(record['Hero Bullet 3']) : '';
  }
  let heroBulletsHtml = '<li>' + renderInlineMarkdown(heroBullet1) + '</li>';
  if (heroBullet2 && heroBullet2.trim() !== '') {
    heroBulletsHtml += '\n        <li>' + renderInlineMarkdown(heroBullet2) + '</li>';
  }
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
  // CTA toggles — independent now.
  // - Header CTA: top-right "Get in Touch" button in the page header.
  // - Bottom CTA: the full contact form section near the page footer.
  // Both default to OFF unless explicitly enabled, or on legacy
  // branded-layout pages (Matches / Bacardi) where they keep their
  // original behaviour. Email recipient is one shared field; both
  // CTAs use the same address. Falls back to hello@outra.co.uk.
  const headerCtaEnabled = record['Header CTA Enabled'] === true;
  const bottomCtaEnabled = record['Bottom CTA Enabled'] === true;
  const ctaRecipientEmail = (record['CTA Recipient Email'] && String(record['CTA Recipient Email']).trim())
    ? String(record['CTA Recipient Email']).trim()
    : 'hello@outra.co.uk';
  // Legacy alias kept so the rest of the file (e.g. bottom CTA section
  // strip) doesn't need to change everywhere.
  const ctaEnabled = bottomCtaEnabled;
  // Pre-compute teamEnabled here too (the full definition lives below)
  // so the header CTA can decide whether to scroll to the team strip.
  const _teamSectionShown = (record['Team Enabled'] === true)
    || (record['Team Enabled'] === undefined && hasBrandedLayout(record));
  let headerCtaHtml = '';
  if (headerCtaEnabled) {
    if (hasBrandedLayout(record) && _teamSectionShown) {
      headerCtaHtml = '<button class="header-cta" onclick="document.querySelector(\'.mf-team\').scrollIntoView({behavior:\'smooth\'})">Talk to the team</button>';
    } else if (bottomCtaEnabled) {
      headerCtaHtml = '<button class="header-cta" onclick="document.querySelector(\'.cta-section\').scrollIntoView({behavior:\'smooth\'})">Get in Touch</button>';
    } else {
      headerCtaHtml = '<a class="header-cta" href="mailto:' + escapeAttr(ctaRecipientEmail) + '">Get in Touch</a>';
    }
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
    CTA_RECIPIENT_EMAIL: escapeAttr(ctaRecipientEmail),
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
    SCORE_RFV_O1: escapeHtml(firstParty.scoreRfvO1),
    SCORE_RFV_O2: escapeHtml(firstParty.scoreRfvO2),
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

  let html = loadTemplate('overview');
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

  // ── Page-structure reordering + hide (added 2026-05-23) ───────────────
  // The dashboard's "Page structure" panel writes two JSON arrays to the
  // record: Section Order (custom permutation of canonical section IDs)
  // and Section Hidden (IDs that should not render on the live page).
  //
  // The live template marks each reorderable region with paired markers
  // such as <!-- SEC_START:2b --> ... <!-- SEC_END:2b -->. We extract
  // every marked region, drop the hidden ones, then re-emit them in the
  // saved order. Records that don't set sectionOrder fall through with no
  // change — the canonical order in the template stays intact.
  let sectionOrder = [];
  let sectionHidden = [];
  try {
    if (record['Section Order'])  { const v = JSON.parse(record['Section Order']);  if (Array.isArray(v)) sectionOrder = v; }
  } catch (_) {}
  try {
    if (record['Section Hidden']) { const v = JSON.parse(record['Section Hidden']); if (Array.isArray(v)) sectionHidden = v; }
  } catch (_) {}
  // Auto-hide opt-in overview sections that aren't explicitly placed in
  // sectionOrder. Mirrors the proposal-side OPT_IN_BY_DEFAULT. Stops
  // Beagle-bespoke sections (g-aji-case, g-commercials-beagle) from
  // rendering on Emma / MatchesFashion / every other overview record.
  // A record can opt in by adding the id to its Section Order in
  // Airtable (Beagle: 'g-aji-case' + 'g-commercials-beagle').
  const OVERVIEW_OPT_IN_BY_DEFAULT = ['g-aji-case', 'g-commercials-beagle'];
  OVERVIEW_OPT_IN_BY_DEFAULT.forEach((id) => {
    if (sectionOrder.indexOf(id) === -1 && sectionHidden.indexOf(id) === -1) {
      sectionHidden.push(id);
    }
  });
  html = applySectionStructure(html, sectionOrder, sectionHidden);

  // ── Octopus EV bespoke "segment breakdown by persona" section ─────────
  // Slug-gated: only the OctopusEV record gets this block, injected just
  // before the footer chrome so it lands last on the page (before the
  // "© 2026 Outra" footer). The Branded Pages schema has no free-form
  // HTML field, so this bespoke content lives in the renderer — mirroring
  // the MatchesFashion slug-gated overrides above.
  if (record['Slug'] === 'OctopusEV') {
    const oevBlock = buildOctopusEvSegmentSection();
    if (html.indexOf('<!-- FOOTER -->') !== -1) {
      html = html.replace('<!-- FOOTER -->', oevBlock + '\n<!-- FOOTER -->');
    } else {
      html = html.replace('</body>', oevBlock + '\n</body>');
    }
  }

  // ── Live-update bridge for the dashboard preview iframe ───────────────
  // The dashboard posts {type:'mb-update', patch:{heroHeadline,...}} into
  // the iframe whenever the user types a text-only edit, so we can patch
  // the DOM in place — no full reload, no scroll-jump, no flash. Layout/
  // structural changes (logo, mode, password, toggles) still trigger a
  // full form-submit reload (mbRefreshPreview), so this script only
  // handles text updates that are safe to swap with innerHTML.
  html = html.replace('</body>', buildLiveUpdateScript(brandName) + '\n</body>');

  return html;
}

// ── Unified renderer (Path A, 2026-05-25) ────────────────────────────────
// Renders records with Template='unified' by composing a single output
// page from the two legacy renderers. Approach:
//
//   1) Run both legacy renderers as black boxes to get fully-substituted
//      HTML strings for the record. They handle all 161 placeholders
//      between them — no risk of missing a {{KEY}} because the existing
//      maps already cover everything.
//   2) Extract every SEC_START…SEC_END block from both outputs.
//   3) Use the record's `Type` field to pick which output is the SHELL
//      (head + body wrapper + scripts + CSS). 'proposal' uses the
//      proposal renderer's shell; 'overview' uses the overview shell.
//      Shared section ids (g-header / g-hero / g-trusted / g-channels /
//      g-team / g-household) keep their shell-template visuals as a
//      result.
//   4) For every section id in MB_SECTION_DEFS_LIST that the shell
//      doesn't carry but the OTHER renderer's output has, lift that
//      block in and inject just before </body>. Then applySectionStructure
//      (or applySectionStructureProposal, depending on shell) handles
//      reordering + hiding by sectionOrder + sectionHidden.
//   5) Inject the live-update bridge once, last, on the final HTML.
//
// Existing records (no Template field) never touch this function because
// the dispatcher in renderHtml only routes Template='unified' here. So
// Emma, Cala, EON, TrueSpeed, TUI, BeagleFinance, MatchesFashion, etc.
// remain on their pre-existing render paths byte-for-byte.
function renderUnifiedHtml(record) {
  // Defensive clone so the recursive calls below see a record WITHOUT
  // the Template field — otherwise renderHtml's dispatcher would call
  // us again forever. We strip Template only on the clone passed down
  // so the actual record on disk / Airtable is unmodified.
  const recordOverview = Object.assign({}, record, { Template: '', Type: 'overview' });
  const recordProposal = Object.assign({}, record, { Template: '', Type: 'proposal' });

  // Step 1 — produce both fully-rendered outputs.
  const overviewHtml = renderOverviewHtmlImpl(recordOverview);
  const proposalHtml = renderProposalHtml(recordProposal);

  // Step 2 — extract every SEC block from both. Returns { id: blockText }
  // where blockText includes the SEC_START / SEC_END markers so it can
  // be re-injected verbatim.
  const overviewBlocks = extractAllSecBlocks(overviewHtml);
  const proposalBlocks = extractAllSecBlocks(proposalHtml);

  // Step 3 — pick the shell based on the record's Type (visual style).
  const visualStyle = (String(record['Type'] || '').toLowerCase() === 'proposal') ? 'proposal' : 'overview';
  const shellHtml   = (visualStyle === 'proposal') ? proposalHtml : overviewHtml;
  const shellBlocks = (visualStyle === 'proposal') ? proposalBlocks : overviewBlocks;
  const otherBlocks = (visualStyle === 'proposal') ? overviewBlocks : proposalBlocks;

  // Step 4 — lift alien blocks: any SEC id present in the other template's
  // output that isn't in the shell. Drop them into the shell just before
  // </body> so applySectionStructure's reorder picks them up.
  const alienIds = Object.keys(otherBlocks).filter((id) => !shellBlocks[id]);
  let html = shellHtml;
  if (alienIds.length > 0) {
    // Skip g-closedloop-pb + g-propensitymap — both deprecated 2026-05-25
    // (replaced by g-closedloop + g-household respectively).
    const DEPRECATED_IDS = new Set(['g-closedloop-pb', 'g-propensitymap']);
    const liftedBlocks = alienIds
      .filter((id) => !DEPRECATED_IDS.has(id))
      .map((id) => otherBlocks[id])
      .join('\n');
    // Inject lifted blocks just BEFORE the footer chrome so the footer stays
    // last on the page (the footer is plain chrome, not a reorderable SEC
    // block, so Section Order can't push lifted sections above it). Fall back
    // to just-before-</body> if the footer marker isn't present.
    if (html.indexOf('<!-- FOOTER -->') !== -1) {
      html = html.replace('<!-- FOOTER -->', liftedBlocks + '\n<!-- FOOTER -->');
    } else {
      html = html.replace('</body>', liftedBlocks + '\n</body>');
    }
  }

  // Step 5 — final sectionOrder / sectionHidden reordering. The shell's
  // legacy renderer already applied its own copy of this, but with the
  // alien blocks just lifted in we re-run to position them correctly
  // among the shell's native blocks. Build the canonical id list from
  // every block id we now have in the page.
  let sectionOrder = [];
  let sectionHidden = [];
  try { if (record['Section Order'])  { const v = JSON.parse(record['Section Order']);  if (Array.isArray(v)) sectionOrder = migrateLegacySectionIds(v); } } catch (_) {}
  try { if (record['Section Hidden']) { const v = JSON.parse(record['Section Hidden']); if (Array.isArray(v)) sectionHidden = migrateLegacySectionIds(v); } } catch (_) {}

  // Auto-hide leaked sections (2026-06-03). Step 4 lifts EVERY alien block
  // from the non-shell template into the page. The appliers' canonical-
  // fallback loops keep any block absent from sectionOrder rather than
  // dropping it, so those lifted sections "leak" below the last intended
  // section (e.g. HeyCar rendered g-casestudies/g-team/g-getintouch/
  // g-video/g-how/g-commercials after g-firstparty). The dashboard UI
  // already treats absent-from-order opt-in sections as hidden, so the
  // server was the side that disagreed. When the record carries an
  // explicit, non-empty Section Order, treat it as authoritative: any
  // section present in the page but absent from that order is hidden —
  // except always-on chrome (header/hero/footer) which must never drop.
  if (Array.isArray(sectionOrder) && sectionOrder.length > 0) {
    const ALWAYS_ON = new Set(['g-header', 'g-hero', 'g-footer']);
    const orderSet  = new Set(sectionOrder);
    const hiddenSet = new Set(sectionHidden);
    const presentIds = Object.keys(extractAllSecBlocks(html));
    presentIds.forEach((id) => {
      if (orderSet.has(id) || hiddenSet.has(id) || ALWAYS_ON.has(id)) return;
      sectionHidden.push(id);
      hiddenSet.add(id);
    });
  }

  // Use the shell-appropriate applier so the regex + canonical-fallback
  // order matches what the shell already did once.
  if (visualStyle === 'proposal') {
    html = applySectionStructureProposal(html, sectionOrder, sectionHidden);
  } else {
    html = applySectionStructure(html, sectionOrder, sectionHidden);
  }

  // The shell already injected the live-update script once via its own
  // renderer. The alien blocks lift didn't duplicate scripts, so we're
  // done — no second injection needed.
  return html;
}

// Helper: extract every SEC_START…SEC_END block from an HTML string.
// Returns { id: blockText } where blockText includes the markers so the
// block can be re-injected verbatim and re-extracted on a later pass.
function extractAllSecBlocks(html) {
  if (typeof html !== 'string' || !html) return {};
  const out = {};
  const re = /<!--\s*SEC_START:([a-z0-9-]+)\s*-->[\s\S]*?<!--\s*SEC_END:\1\s*-->/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out[m[1]] = m[0];
  }
  return out;
}

module.exports = { renderHtml, GENERIC_CHIPS, TRUSTED_BRANDS, CHANNEL_TILES };
