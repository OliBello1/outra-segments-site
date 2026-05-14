/**
 * Microsite Builder — per-page access gate.
 *
 * Lives on outra-segments-site (same domain as the rendered microsite) so
 * the session cookie is set against the right origin. Mirrors the
 * proposals/cala-auth.js pattern but reads the password hash + recovery
 * plaintext from the per-microsite Airtable row instead of an env var.
 *
 * GET  /api/microsite-auth?slug=:slug
 *   Validates the session cookie. Returns 200 + { ok: true } if valid,
 *   401 otherwise. Used by the gate page on initial load to skip the
 *   form when there's already an active session.
 *
 * POST /api/microsite-auth
 *   Body: { slug, password, visitorName }
 *   Verifies password against the row's `Access Code Hash`. On success
 *   issues a `mc_sess_{slug}` cookie scoped to the slug. Other slugs
 *   stay locked.
 *
 * Hashing: Node built-in scrypt (no extra deps). Stored format:
 *   scrypt$<salt-base64>$<hash-base64>
 *
 * Sessions: HMAC-SHA256 signed cookie payload, same shape as the
 * proposals project. 30min sliding inactivity, 24h hard cap.
 *
 * Rate limiting: per-IP, per-slug, 10 failed attempts per 5min window.
 * Best-effort (Map in memory, scoped to the lambda instance).
 */

const https = require('https');
const crypto = require('crypto');

// ── Constants ─────────────────────────────────────────────────────────────
const TABLE = 'Branded Pages';
const COOKIE_PREFIX = 'mc_sess_';
const INACTIVITY_MS = 30 * 60 * 1000;       // 30 min sliding
const ABSOLUTE_MS   = 24 * 60 * 60 * 1000;  // 24 hr hard cap

// Rate limiter — Map<ip-and-slug, [timestamps]>
const FAIL_WINDOW_MS = 5 * 60 * 1000;
const FAIL_LIMIT = 10;
const _failures = new Map();

function rateKey(ip, slug) { return ip + '|' + slug; }
function isRateLimited(ip, slug) {
  if (!ip) return false;
  const k = rateKey(ip, slug);
  const now = Date.now();
  const list = (_failures.get(k) || []).filter(t => now - t < FAIL_WINDOW_MS);
  _failures.set(k, list);
  return list.length >= FAIL_LIMIT;
}
function recordFailure(ip, slug) {
  if (!ip) return;
  const k = rateKey(ip, slug);
  const now = Date.now();
  const list = (_failures.get(k) || []).filter(t => now - t < FAIL_WINDOW_MS);
  list.push(now);
  _failures.set(k, list);
}
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'] || '';
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

// ── Slug validation ───────────────────────────────────────────────────────
const SLUG_RE = /^[A-Za-z0-9_-]{1,80}$/;
function validSlug(s) { return typeof s === 'string' && SLUG_RE.test(s); }

// ── Airtable lookup ───────────────────────────────────────────────────────
function airtableGet(slug) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    if (!apiKey || !baseId) return reject(new Error('Airtable not configured'));
    const safe = '"' + slug.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    const params = new URLSearchParams();
    params.set('filterByFormula', '{Slug} = ' + safe);
    params.set('maxRecords', '1');
    const reqPath = '/v0/' + baseId + '/' + encodeURIComponent(TABLE) + '?' + params.toString();
    const req = https.request({
      hostname: 'api.airtable.com',
      port: 443,
      path: reqPath,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            const rec = data.records && data.records[0];
            resolve(rec ? Object.assign({ id: rec.id }, rec.fields || {}) : null);
          } catch (e) { reject(e); }
        } else {
          reject(new Error('Airtable ' + res.statusCode + ': ' + body.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Password hashing (scrypt — Node built-in, no deps) ────────────────────
//
// Hash format: scrypt$<salt-b64>$<hash-b64>
// Verifying: extract salt, recompute hash, constant-time compare.
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(plain), salt, 64);
  return 'scrypt$' + salt.toString('base64') + '$' + derived.toString('base64');
}
function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  let salt, expected;
  try {
    salt = Buffer.from(parts[1], 'base64');
    expected = Buffer.from(parts[2], 'base64');
  } catch (e) { return false; }
  let derived;
  try { derived = crypto.scryptSync(String(plain), salt, 64); }
  catch (e) { return false; }
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

// ── Session cookie (signed, HMAC-SHA256) ──────────────────────────────────
function getSecret() {
  return (process.env.SESSION_SECRET || process.env.MICROSITE_AUTH_SECRET || 'fallback-not-secret').trim();
}
function signSession(payload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return b64 + '.' + sig;
}
function verifySessionToken(value) {
  if (!value || typeof value !== 'string') return null;
  const idx = value.lastIndexOf('.');
  if (idx < 0) return null;
  const b64 = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const json = Buffer.from(b64, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch (e) { return null; }
}
function isSessionValid(payload, slug) {
  if (!payload || typeof payload.loginAt !== 'number' || typeof payload.lastActiveAt !== 'number') return false;
  if (payload.slug !== slug) return false; // cookie scoped to slug
  const now = Date.now();
  if (now - payload.loginAt > ABSOLUTE_MS) return false;
  if (now - payload.lastActiveAt > INACTIVITY_MS) return false;
  return true;
}
function parseCookies(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  header.split(';').forEach(part => {
    const eq = part.indexOf('=');
    if (eq < 0) return;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}
function buildCookie(slug, payload) {
  const value = signSession(payload);
  const expires = new Date(payload.loginAt + ABSOLUTE_MS).toUTCString();
  return [
    COOKIE_PREFIX + slug + '=' + encodeURIComponent(value),
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Expires=' + expires,
  ].join('; ');
}

// ── Handler ───────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Slug — query for GET, body for POST
  let slug;
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    slug = url.searchParams.get('slug') || '';
  } else if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};
    req._parsedBody = body;
    slug = body.slug || '';
  } else {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  if (!validSlug(slug)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Invalid slug' }));
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const existing = verifySessionToken(cookies[COOKIE_PREFIX + slug]);

  // ── GET: session check only ──
  if (req.method === 'GET') {
    if (!existing || !isSessionValid(existing, slug)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'No valid session' }));
    }
    // Slide the inactivity window
    const refreshed = {
      slug,
      name: existing.name,
      loginAt: existing.loginAt,
      lastActiveAt: Date.now(),
    };
    res.setHeader('Set-Cookie', buildCookie(slug, refreshed));
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, name: existing.name }));
  }

  // ── POST: fresh login ──
  const ip = getClientIp(req);
  if (isRateLimited(ip, slug)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ ok: false, error: 'Too many attempts. Try again in 5 minutes.' }));
  }

  const body = req._parsedBody || {};
  const submitted = String(body.password || '').trim();
  const visitorName = String(body.visitorName || '').trim().slice(0, 120);

  if (!visitorName) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Please enter your name.' }));
  }
  if (!submitted) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Please enter the access code.' }));
  }

  // Lookup the microsite + verify password
  let record;
  try {
    record = await airtableGet(slug);
  } catch (err) {
    console.error('[microsite-auth] airtable error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'Could not validate access.' }));
  }
  if (!record) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ ok: false, error: 'Microsite not found.' }));
  }
  // If the page isn't password-protected, return early — caller shouldn't be here
  if (!record['Password Protected']) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, notProtected: true }));
  }

  const storedHash = record['Access Code Hash'] || '';
  if (!verifyPassword(submitted, storedHash)) {
    recordFailure(ip, slug);
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'Incorrect access code.' }));
  }

  // Issue fresh session cookie scoped to this slug
  const now = Date.now();
  const session = { slug, name: visitorName, loginAt: now, lastActiveAt: now };
  res.setHeader('Set-Cookie', buildCookie(slug, session));

  // Fire-and-forget: log this unlock to outra-api so it appears on the
  // microsite's activity timeline. Failures are swallowed — auth must
  // never be blocked by a downstream logging hiccup.
  try {
    const apiBase = process.env.OUTRA_API_BASE || 'https://outra-api-umber.vercel.app';
    const token = process.env.PROPOSAL_TRACKING_TOKEN || '';
    if (token) {
      // Don't await — let the response complete immediately.
      fetch(apiBase + '/api/branded-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Proposal-Token': token },
        body: JSON.stringify({
          action: 'log-access-unlock',
          slug,
          visitorName,
          userAgent: req.headers['user-agent'] || '',
        }),
      }).catch(function () { /* non-fatal */ });
    }
  } catch (e) { /* non-fatal */ }

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, name: visitorName }));
};

// Exports for use by render.js (gate detection + cookie validation)
module.exports.parseCookies = parseCookies;
module.exports.verifySessionToken = verifySessionToken;
module.exports.isSessionValid = isSessionValid;
module.exports.COOKIE_PREFIX = COOKIE_PREFIX;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
