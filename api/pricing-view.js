/**
 * Standalone pricing-only view for the Loaf proposal page.
 *
 * Serves /PricingView — a minimal document containing ONLY the
 * commercials/pricing section (`g-commercials`) from the live Loaf page
 * at /signature-segments/LoafProposal, with no header/hero/other sections.
 *
 * Route name is deliberately not /Pricing to avoid it being easily
 * guessed/searched — this is a direct-share link only.
 *
 * GET /api/pricing-view
 *   1. Look up `Branded Pages` Airtable row by Slug = LoafProposal
 *   2. If Status != Published: 404
 *   3. Render full page via _render-helper.js's renderHtml()
 *   4. Extract <head>...</head> and the g-commercials SEC block
 *   5. Compose a minimal standalone HTML document from those two pieces
 */

const https = require('https');
const { renderHtml, buildCommercialsHtml } = require('./_render-helper');

const TABLE = 'Branded Pages';
const SLUG = 'LoafProposal';

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

function renderNotFound(reason) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Page not found - Outra</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;background:#FAFAF6;color:#0A135B;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:40px;text-align:center}h1{font-size:32px;margin:0 0 12px}p{font-size:16px;margin:0 0 8px;opacity:0.8}</style>' +
    '</head><body><div><h1>Page not found</h1>' +
    (reason ? '<p>' + reason + '</p>' : '') +
    '</div></body></html>';
}

module.exports = async function handler(req, res) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound('Server misconfiguration: Airtable not connected'));
  }

  let record;
  try {
    record = await airtableGet(baseId, apiKey, TABLE, '{Slug} = "' + SLUG + '"');
  } catch (err) {
    console.error('[pricing-view] airtable error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound('Could not look up page'));
  }

  if (!record || record.Status !== 'Published') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.end(renderNotFound());
  }

  let fullHtml;
  try {
    fullHtml = renderHtml(record);
  } catch (err) {
    console.error('[pricing-view] template error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound('Could not render page'));
  }

  // Extract <head> (carries the commercials CSS unconditionally) from a
  // normal render. We deliberately do NOT extract the g-commercials SEC block
  // from the rendered body: LoafProposal is an overview-type page, and the
  // renderer force-hides proposal-only sections (incl. g-commercials) on
  // overview shells, so those markers never appear in the body. Instead we
  // build the commercials section directly via buildCommercialsHtml(record),
  // mirroring the template's <section class="prop-commercials"> wrapper. This
  // keeps /PricingView working without changing how the live Loaf page renders.
  const headMatch = fullHtml.match(/<head[\s\S]*?<\/head>/i);

  let commercialsInner = '';
  try {
    commercialsInner = buildCommercialsHtml(record);
  } catch (err) {
    console.error('[pricing-view] commercials build error:', err);
  }

  if (!headMatch || !commercialsInner) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderNotFound('Pricing section is not available for this page'));
  }

  const html = '<!DOCTYPE html><html lang="en">' +
    headMatch[0] +
    '<body style="margin:0;">' +
    '<section class="prop-commercials">' + commercialsInner + '</section>' +
    '</body></html>';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return res.end(html);
};
