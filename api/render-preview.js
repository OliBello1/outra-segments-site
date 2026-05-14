/**
 * Outra Microsite Builder — preview render route
 *
 * Renders a microsite directly from form state (POST body) without touching
 * Airtable. Powers the live iframe in the dashboard editor so the salesperson
 * sees the page update as they type, with no save round-trip.
 *
 * POST /api/render-preview
 *   Body: {
 *     brandName, slug, logoUrl, audienceType, searchMode,
 *     customChips, ad1Url, ad2Url
 *   }
 *   Returns: text/html with the fully-rendered page.
 *
 * No auth: this endpoint produces preview HTML using form state the caller
 * already has. It doesn't read or write any data, doesn't call Airtable, and
 * never persists anything. Identical attack surface to a static page.
 */

const { renderHtml } = require('./_render-helper');

module.exports = async function handler(req, res) {
  // CORS — allow the dashboard origins to fetch this from an iframe
  const origin = req.headers.origin || '';
  const allowed = [
    'https://outra-dashboard-seven.vercel.app',
    'https://outra.vip',
    'https://www.outra.vip',
    'http://localhost:3000',
    'http://localhost:5500',
  ];
  if (allowed.indexOf(origin) >= 0) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Accept POST (JSON or form-encoded) and GET (state in querystring).
  // Form-encoded POSTs are used by the dashboard iframe + "Preview in new tab"
  // because they let us set target="_blank" / target="iframe" without CORS issues.
  let body = {};
  if (req.method === 'POST') {
    let raw = req.body;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { /* not JSON */ }
    }
    if (raw && typeof raw === 'object') {
      // Vercel parses both JSON and form-encoded into objects.
      // If it has a `state` field that's a JSON string, treat that as the payload.
      if (typeof raw.state === 'string') {
        try { body = JSON.parse(raw.state); } catch (e) { body = {}; }
      } else {
        body = raw;
      }
    }
  } else if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const stateParam = url.searchParams.get('state');
    if (stateParam) {
      try { body = JSON.parse(decodeURIComponent(stateParam)); } catch (e) { body = {}; }
    }
  } else {
    res.statusCode = 405;
    return res.end('GET or POST only');
  }

  // Build a record-shaped object from the form state. Editable text/toggle
  // fields default to empty/undefined so the renderer falls back to its
  // built-in defaults when the dashboard hasn't supplied anything.
  const record = {
    Slug: body.slug || 'preview',
    'Brand Name': body.brandName || '',
    'Logo URL': body.logoUrl || '',
    'Audience Type': body.audienceType === 'Agency' ? 'Agency' : 'Brand',
    'Search Mode': body.searchMode === 'Custom' ? 'Custom' : 'Generic',
    'Custom Chips JSON': Array.isArray(body.customChips) ? JSON.stringify(body.customChips) : '',
    'Ad Screenshot 1 URL': body.ad1Url || '',
    'Ad Screenshot 2 URL': body.ad2Url || '',
    'Hero Headline': body.heroHeadline || '',
    'Hero Bullet 1': body.heroBullet1 || '',
    'Hero Bullet 2': body.heroBullet2 || '',
    'Channels Heading': body.channelsHeading || '',
    'Trusted Brands JSON': Array.isArray(body.trustedBrands) ? JSON.stringify(body.trustedBrands) : '',
    'Channel Tiles JSON': Array.isArray(body.channelTiles) ? JSON.stringify(body.channelTiles) : '',
    'Hero Available Style': body.heroAvailableStyle === 'tiles' ? 'tiles' : 'wordmarks',
    'Hero Available Keys JSON': Array.isArray(body.heroAvailableKeys) ? JSON.stringify(body.heroAvailableKeys) : '',
    'Get In Touch Enabled': body.getInTouchEnabled !== false, // default true
    // ── Closed-loop section overrides (added 2026-05-13) ──
    // Empty strings fall through to canonical defaults in buildClosedLoopCopy().
    'Closed Loop Enabled': body.closedLoopEnabled !== false, // default true
    'Closed Loop Eyebrow': body.closedLoopEyebrow || '',
    'Closed Loop Title':   body.closedLoopTitle   || '',
    'Closed Loop Sub':     body.closedLoopSub     || '',
    'Closed Loop Caption': body.closedLoopCaption || '',
    'Closed Loop Card 1 Num':   body.closedLoopCard1Num   || '',
    'Closed Loop Card 1 Title': body.closedLoopCard1Title || '',
    'Closed Loop Card 1 Body':  body.closedLoopCard1Body  || '',
    'Closed Loop Card 2 Num':   body.closedLoopCard2Num   || '',
    'Closed Loop Card 2 Title': body.closedLoopCard2Title || '',
    'Closed Loop Card 2 Body':  body.closedLoopCard2Body  || '',
    'Closed Loop Card 3 Num':   body.closedLoopCard3Num   || '',
    'Closed Loop Card 3 Title': body.closedLoopCard3Title || '',
    'Closed Loop Card 3 Body':  body.closedLoopCard3Body  || '',
    'Closed Loop Card 4 Num':   body.closedLoopCard4Num   || '',
    'Closed Loop Card 4 Title': body.closedLoopCard4Title || '',
    'Closed Loop Card 4 Body':  body.closedLoopCard4Body  || '',
    Status: 'Draft',
  };

  let html;
  try {
    html = renderHtml(record);
  } catch (err) {
    console.error('[render-preview] template error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Preview render failed: ' + (err.message || 'unknown'));
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.end(html);
};
