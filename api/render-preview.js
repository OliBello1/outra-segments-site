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
    // Microsite template type — drives which builder-template the
    // renderer picks (overview vs proposal). Clamped to known values.
    'Type': (String(body.type || '').toLowerCase() === 'proposal') ? 'proposal' : 'overview',
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
    'Search Heading': body.searchHeading || '',
    'Trusted Brands JSON': Array.isArray(body.trustedBrands) ? JSON.stringify(body.trustedBrands) : '',
    'Channel Tiles JSON': Array.isArray(body.channelTiles) ? JSON.stringify(body.channelTiles) : '',
    // Page-structure ordering — mirror live behaviour in the preview iframe.
    'Section Order':  Array.isArray(body.sectionOrder)  ? JSON.stringify(body.sectionOrder)  : '',
    'Section Hidden': Array.isArray(body.sectionHidden) ? JSON.stringify(body.sectionHidden) : '',
    // PB-style propensity map overrides (proposal-only). Blank = canonical PB defaults.
    'Prop Map Eyebrow':     body.propMapEyebrow     || '',
    'Prop Map Headline':    body.propMapHeadline    || '',
    'Prop Map Desc':        body.propMapDesc        || '',
    'Prop Map Quote Label': body.propMapQuoteLabel  || '',
    'Prop Map Quote 1':     body.propMapQuote1      || '',
    'Prop Map Quote 2':     body.propMapQuote2      || '',
    'Prop Map Quote 3':     body.propMapQuote3      || '',
    // PB-style closed-loop attribution. Blank = canonical PB defaults.
    'CL Eyebrow':           body.clEyebrow          || '',
    'CL Title':             body.clTitle            || '',
    'CL Sub':               body.clSub              || '',
    'CL Figure Emoji':      body.clFigureEmoji      || '',
    'CL Figure Caption':    body.clFigureCaption    || '',
    // Opportunity Summary 4-card grid (proposal-only).
    'Opp Eyebrow':          body.oppEyebrow         || '',
    'Opp Title':            body.oppTitle           || '',
    'Opp Sub':              body.oppSub             || '',
    'Opp 1 Accent':         body.opp1Accent         || '', 'Opp 1 Title': body.opp1Title || '', 'Opp 1 Desc': body.opp1Desc || '', 'Opp 1 Foot': body.opp1Foot || '',
    'Opp 2 Accent':         body.opp2Accent         || '', 'Opp 2 Title': body.opp2Title || '', 'Opp 2 Desc': body.opp2Desc || '', 'Opp 2 Foot': body.opp2Foot || '',
    'Opp 3 Accent':         body.opp3Accent         || '', 'Opp 3 Title': body.opp3Title || '', 'Opp 3 Desc': body.opp3Desc || '', 'Opp 3 Foot': body.opp3Foot || '',
    'Opp 4 Accent':         body.opp4Accent         || '', 'Opp 4 Title': body.opp4Title || '', 'Opp 4 Desc': body.opp4Desc || '', 'Opp 4 Foot': body.opp4Foot || '',
    // Multi-Opportunity Commercials + parameterised How + Team (2026-05-25)
    'Commercials JSON':             Array.isArray(body.commercials) ? JSON.stringify(body.commercials) : '',
    'How Title':                    body.howTitle                  || '',
    'How Sub':                      body.howSub                    || '',
    'How Steps JSON':               Array.isArray(body.howSteps)   ? JSON.stringify(body.howSteps) : '',
    'Proposal Team Title':          body.proposalTeamTitle         || '',
    'Proposal Team Sub':            body.proposalTeamSub           || '',
    'Proposal Team Selection JSON': Array.isArray(body.proposalTeamSelection) ? JSON.stringify(body.proposalTeamSelection) : '',
    // Upstix + AIQ opportunity-area labels (PB-derived sections).
    'Upstix Opportunity Label':     body.upstixOpportunityLabel    || '',
    'AIQ Opportunity Label':        body.aiqOpportunityLabel       || '',
    // Patch section overrides (PB-derived, added 2026-05-26)
    'Patch Opportunity Label':      body.patchOpportunityLabel     || '',
    'Patch Headline Lead':          body.patchHeadlineLead         || '',
    'Patch Audience':               body.patchAudience             || '',
    'Patch Headline Highlight':     body.patchHeadlineHighlight    || '',
    'Patch Footnote':               body.patchFootnote             || '',
    // Upstix per-step overrides — image dropzones + editable eyebrow /
    // title / body copy for each of the 3 step cards. Blank falls
    // back to canonical PB content in renderProposalHtml.
    'Upstix Step1 Image URL':       body.upstixStep1ImageUrl       || '',
    'Upstix Step1 Eyebrow':         body.upstixStep1Eyebrow        || '',
    'Upstix Step1 Title':           body.upstixStep1Title          || '',
    'Upstix Step1 Body':            body.upstixStep1Body           || '',
    'Upstix Step2 Image URL':       body.upstixStep2ImageUrl       || '',
    'Upstix Step2 Eyebrow':         body.upstixStep2Eyebrow        || '',
    'Upstix Step2 Title':           body.upstixStep2Title          || '',
    'Upstix Step2 Body':            body.upstixStep2Body           || '',
    'Upstix Step3 Image URL':       body.upstixStep3ImageUrl       || '',
    'Upstix Step3 Eyebrow':         body.upstixStep3Eyebrow        || '',
    'Upstix Step3 Title':           body.upstixStep3Title          || '',
    'Upstix Step3 Body':            body.upstixStep3Body           || '',
    'Upstix Step3 Logo URL':        body.upstixStep3LogoUrl        || '',
    'Hero Available Style': body.heroAvailableStyle === 'tiles' ? 'tiles' : 'wordmarks',
    'Hero Available Keys JSON': Array.isArray(body.heroAvailableKeys) ? JSON.stringify(body.heroAvailableKeys) : '',
    'Get In Touch Enabled': body.getInTouchEnabled !== false, // default true
    // ── Section visibility toggles (default ON when omitted) ──
    'First Party Enabled': body.firstPartyEnabled !== false, // default true
    'Channels Enabled':    body.channelsEnabled   !== false, // default true
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
    // ── First-party 4-column flow overrides (added 2026-05-15) ──
    // Empty values / arrays fall through to canonical defaults in
    // buildFirstPartySectionCopy() / the JSON builder helpers.
    'CRM Heading': body.crmHeading || '',
    'CRM Badge':   body.crmBadge   || '',
    'CRM Badge Enabled': body.crmBadgeEnabled !== false, // default true
    'CRM Properties JSON': Array.isArray(body.crmProperties) ? JSON.stringify(body.crmProperties) : '',
    // ── Profile card + stats row (added 2026-05-15 v2) ──
    'CRM Profile Name':     body.crmProfileName     || '',
    'CRM Profile Subtitle': body.crmProfileSubtitle || '',
    'CRM Toggle Left':      body.crmToggleLeft      || '',
    'CRM Toggle Right':     body.crmToggleRight     || '',
    'CRM Stat 1 Value': body.crmStat1Value || '',
    'CRM Stat 1 Label': body.crmStat1Label || '',
    'CRM Stat 2 Value': body.crmStat2Value || '',
    'CRM Stat 2 Label': body.crmStat2Label || '',
    'CRM Stat 3 Value': body.crmStat3Value || '',
    'CRM Stat 3 Label': body.crmStat3Label || '',
    // ── Optional 4th RFV row (added 2026-05-15 v2) ──
    'Score RFV Row 4 Enabled': !!body.scoreRfv4Enabled,
    'Score RFV Row 4 Label':   body.scoreRfv4Label || '',
    'Score RFV Row 4 Pills JSON': Array.isArray(body.scoreRfv4Pills) ? JSON.stringify(body.scoreRfv4Pills) : '',
    'Score Title':  body.scoreTitle  || '',
    'Score RFV R':  body.scoreRfvR   || '',
    'Score RFV F':  body.scoreRfvF   || '',
    'Score RFV V':  body.scoreRfvV   || '',
    'Score RFV O1': body.scoreRfvO1  || '',
    'Score RFV O2': body.scoreRfvO2  || '',
    'Score Bars JSON': Array.isArray(body.scoreBars) ? JSON.stringify(body.scoreBars) : '',
    'Insight Title':  body.insightTitle || '',
    'Insight Cards JSON': Array.isArray(body.insightCards) ? JSON.stringify(body.insightCards) : '',
    'Activate Title':   body.activateTitle   || '',
    'Activate Bullet 1': body.activateBullet1 || '',
    'Activate Bullet 2': body.activateBullet2 || '',
    'Activate Bullet 3': body.activateBullet3 || '',
    'Propensity Headline': body.propensityHeadline || '',
    'Propensity Category': body.propensityCategory || '',
    'Propensity Quote 1':  body.propensityQuote1  || '',
    'Propensity Quote 2':  body.propensityQuote2  || '',
    'Propensity Quote 3':  body.propensityQuote3  || '',
    'Propensity Stat 1 Value': body.propensityStat1Value || '',
    'Propensity Stat 1 Label': body.propensityStat1Label || '',
    'Propensity Stat 2 Value': body.propensityStat2Value || '',
    'Propensity Stat 2 Label': body.propensityStat2Label || '',
    'Propensity Caveat':       body.propensityCaveat     || '',
    'First Party Heading':           body.firstPartyHeading        || '',
    'First Party Desc':              body.firstPartyDesc           || '',
    'First Party Metric 1 Value':    body.firstPartyMetric1Value   || '',
    'First Party Metric 1 Label':    body.firstPartyMetric1Label   || '',
    'First Party Metric 2 Value':    body.firstPartyMetric2Value   || '',
    'First Party Metric 2 Label':    body.firstPartyMetric2Label   || '',
    'First Party Disclaimer':        body.firstPartyDisclaimer     || '',
    'Case Studies Enabled':          body.caseStudiesEnabled === true,
    'Case Studies Selection JSON':   Array.isArray(body.caseStudiesSelection) ? JSON.stringify(body.caseStudiesSelection) : '',
    'Team Enabled':                  body.teamEnabled === true,
    'Team Selection JSON':           Array.isArray(body.teamSelection) ? JSON.stringify(body.teamSelection) : '',
    'Team CTA Recipient':            body.teamCtaRecipient         || '',
    'Header CTA Enabled':            body.headerCtaEnabled === true,
    'Bottom CTA Enabled':            body.bottomCtaEnabled === true,
    'CTA Recipient Email':           body.ctaRecipientEmail        || '',
    Status: 'Draft',
  };

  let html;
  try {
    html = renderHtml(record);
  } catch (err) {
    console.error('[render-preview] template error:', err);
    // Surface the real error (name + message + stack) so a failing render can
    // actually be diagnosed instead of showing a useless "unknown". This only
    // runs when renderHtml() throws, and exposes no data — just the crash site.
    const detail =
      (err && (err.name || 'Error')) + ': ' +
      (err && err.message ? err.message : '(no message)') +
      (err && err.stack ? '\n\n' + err.stack : '');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Preview render failed:\n' + detail);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.end(html);
};
