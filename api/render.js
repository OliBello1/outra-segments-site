/**
 * Outra Microsite Builder — dynamic render route
 *
 * Serves /signature-segments/:slug for new builder-generated pages.
 *
 * Existing static pages (Emma, BGE, Mercedes, Dentsu, Omnicom, Rathbones,
 * Uber, Outra-Platform) keep serving from disk because their rewrites in
 * vercel.json are higher priority than the catch-all that points here.
 *
 * GET /api/render?brand=:slug
 *   1. Look up `Branded Pages` Airtable row by Slug = :slug
 *   2. If Status = Published (or ?preview=1): render
 *   3. Render via _render-helper.js
 *   4. Return HTML with Cache-Control: s-maxage=300, stale-while-revalidate=86400
 *
 * No external deps — uses built-in https for Airtable calls.
 */

const https = require('https');
const { renderHtml } = require('./_render-helper');
const auth = require('./microsite-auth'); // exports parseCookies, verifySessionToken, isSessionValid, COOKIE_PREFIX

const TABLE = 'Branded Pages';

function airtableGet(baseId, apiKey, table, formula) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    params.set('filterByFormula', formula);
    params.set('maxRecords', '1');
    const reqPath = '/v0/' + baseId + '/' + encodeURIComponent(table) + '?' + params.toString();
    const req = https.request({
      hostname: 'api.airtable.com',
      port: 443,
      path: reqPath,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
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

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/**
 * Inline gate page served when a microsite has Password Protected = true
 * and the visitor doesn't yet have a valid `mc_sess_{slug}` cookie. Mirrors
 * the proposals/cala gate visually but uses the microsite's own brand
 * name/logo for context. POSTs to /api/microsite-auth which sets the
 * cookie + reloads the page.
 */
function renderGate(slug, brandName, logoUrl) {
  const safeSlug = escapeHtml(slug);
  const safeBrand = escapeHtml(brandName || 'this microsite');
  const safeLogo = escapeHtml(logoUrl || '');
  const logoBlock = safeLogo
    ? '<img src="' + safeLogo + '" alt="' + safeBrand + '" style="max-height:36px;max-width:140px;object-fit:contain;">'
    : '<span style="font-weight:800;font-size:18px;color:#0A135B;letter-spacing:-0.3px;">' + safeBrand + '</span>';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>' + safeBrand + ' - Access</title>' +
'<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
'<style>' +
':root{--outra-blue:#4D61F4;--outra-navy:#0A135B;--surface:#FAFAF6;--border:rgba(10,19,91,0.08);--text:#0A135B;--text-muted:#6B7280;}' +
'*{box-sizing:border-box;}html,body{margin:0;padding:0;height:100%;}' +
'body{font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,sans-serif;background:var(--surface);color:var(--text);display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}' +
'.card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:40px 36px;max-width:420px;width:100%;box-shadow:0 12px 48px rgba(10,19,91,0.08);}' +
'.logo-row{display:flex;align-items:center;gap:12px;margin-bottom:24px;}' +
'.logo-x{font-weight:700;color:var(--text-muted);font-size:18px;}' +
'h1{font-size:22px;font-weight:800;letter-spacing:-0.4px;margin:0 0 8px;}' +
'p.lede{font-size:14px;color:var(--text-muted);line-height:1.5;margin:0 0 24px;}' +
'label{display:block;font-size:11px;font-weight:700;color:var(--text);letter-spacing:0.4px;text-transform:uppercase;margin-bottom:8px;}' +
'input[type="password"],input[type="text"]{width:100%;padding:12px 14px;border:1.5px solid rgba(10,19,91,0.15);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text);outline:none;transition:border-color 0.15s;box-sizing:border-box;}' +
'input:focus{border-color:var(--outra-blue);}' +
'button{width:100%;padding:12px 18px;margin-top:14px;border:none;border-radius:10px;background:var(--outra-blue);color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;transition:opacity 0.15s,transform 0.1s;}' +
'button:hover{opacity:0.92;}button:active{transform:translateY(1px);}button[disabled]{opacity:0.5;cursor:not-allowed;}' +
'.status{margin-top:14px;min-height:18px;font-size:12px;font-weight:600;text-align:center;}' +
'.status.ok{color:#2db88a;}.status.err{color:#dc2626;}' +
'.footer-note{margin-top:18px;text-align:center;font-size:11px;color:var(--text-muted);}' +
'</style></head><body>' +
'<div class="card" id="gateCard">' +
'<div class="logo-row">' + logoBlock + '</div>' +
'<h1>This page is private</h1>' +
'<p class="lede">Enter your name and the access code to continue.</p>' +
'<form id="gateForm" autocomplete="off">' +
'<label for="visitorName">Your name</label>' +
'<input type="text" id="visitorName" name="visitorName" autocomplete="name" placeholder="Full name" required>' +
'<label for="pw" style="margin-top:14px;">Access code</label>' +
'<input type="password" id="pw" name="pw" autocomplete="current-password" required>' +
'<button type="submit" id="submitBtn">Unlock</button>' +
'</form>' +
'<div class="status" id="status"></div>' +
'<div class="footer-note">Need access? Speak to your Outra contact.</div>' +
'</div>' +
'<script>' +
'(function(){' +
'var SLUG=' + JSON.stringify(safeSlug) + ';' +
'var form=document.getElementById("gateForm");' +
'var nameEl=document.getElementById("visitorName");' +
'var pw=document.getElementById("pw");' +
'var btn=document.getElementById("submitBtn");' +
'var status=document.getElementById("status");' +
'nameEl.focus();' +
'form.addEventListener("submit",async function(e){' +
'e.preventDefault();' +
'var visitorName=(nameEl.value||"").replace(/^\\s+|\\s+$/g,"");' +
'var password=(pw.value||"").replace(/^\\s+|\\s+$/g,"");' +
'if(!visitorName){status.className="status err";status.textContent="Please enter your name.";nameEl.focus();return;}' +
'if(!password){status.className="status err";status.textContent="Please enter the access code.";pw.focus();return;}' +
'btn.disabled=true;status.className="status";status.textContent="Checking…";' +
'try{' +
'var resp=await fetch("/api/microsite-auth",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({slug:SLUG,password:password,visitorName:visitorName})});' +
'var data=await resp.json();' +
'if(resp.ok&&data.ok){window.location.reload();return;}' +
'status.className="status err";status.textContent=data.error||"Incorrect access code.";' +
'btn.disabled=false;pw.value="";pw.focus();' +
'}catch(err){status.className="status err";status.textContent="Could not check access code. Try again.";btn.disabled=false;}' +
'});' +
'})();' +
'</script></body></html>';
}

function renderNotFound(slug, reason) {
  const safe = escapeHtml(slug || 'unknown');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Page not found - Outra</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;background:#FAFAF6;color:#0A135B;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:40px;text-align:center}h1{font-size:32px;margin:0 0 12px}p{font-size:16px;margin:0 0 8px;opacity:0.8}small{opacity:0.5;display:block;margin-top:24px}a{color:#4D61F4;text-decoration:none;font-weight:600}</style>' +
    '</head><body><div><h1>Page not found</h1><p>The microsite <code>/signature-segments/' + safe + '</code> doesn\'t exist or isn\'t published yet.</p>' +
    (reason ? '<small>' + escapeHtml(reason) + '</small>' : '') +
    '<p style="margin-top:32px"><a href="/signature-segments">View Outra Signature Segments</a></p></div></body></html>';
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const slug = url.searchParams.get('brand') || '';
  const isPreview = url.searchParams.get('preview') === '1';

  if (!slug) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Missing brand parameter');
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound(slug, 'Server misconfiguration: Airtable not connected'));
  }

  let record;
  try {
    const safeSlug = '"' + slug.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    record = await airtableGet(baseId, apiKey, TABLE, '{Slug} = ' + safeSlug);
  } catch (err) {
    console.error('[render] airtable error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound(slug, 'Could not look up page'));
  }

  if (!record) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.end(renderNotFound(slug));
  }

  if (record.Status !== 'Published' && !isPreview) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.end(renderNotFound(slug, 'This page is still in Draft status'));
  }

  // ── Access gate ──
  // If this microsite is password-protected and the visitor doesn't yet
  // have a valid `mc_sess_{slug}` cookie, serve the inline gate page
  // instead of the microsite content. The gate POSTs to /api/microsite-auth
  // which sets the cookie + the page reloads.
  //
  // Always private/no-store on the gate path so we never cache a gated
  // response back to anonymous visitors as the "real" page.
  if (record['Password Protected']) {
    const cookies = auth.parseCookies(req.headers.cookie || '');
    const sessionToken = cookies[auth.COOKIE_PREFIX + slug];
    const session = auth.verifySessionToken(sessionToken);
    if (!session || !auth.isSessionValid(session, slug)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'private, no-store');
      return res.end(renderGate(slug, record['Brand Name'] || '', record['Logo URL'] || ''));
    }
    // Has a valid session — fall through to render. Force no-store so the
    // CDN doesn't cache the unlocked version against anonymous visitors.
  }

  let html;
  try {
    html = renderHtml(record);
  } catch (err) {
    console.error('[render] template error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound(slug, 'Could not render page'));
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Password-protected pages must NEVER be cached at the edge — otherwise
  // the unlocked version would be served to anonymous visitors. Preview
  // mode is also always uncached.
  if (isPreview || record['Password Protected']) {
    res.setHeader('Cache-Control', 'private, no-store');
  } else {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  }
  return res.end(html);
};
