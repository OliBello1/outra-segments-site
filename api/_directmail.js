// Outra × Zap Post section for /signature-segments/DirectMail.
//
// Replaces the generic propensity ("Every purchase has an ideal customer")
// block via the DirectMail alias postRender hook in api/render.js. Reuses the
// template's propensity-* header, green panel and dashboard video frame, and
// adds dm-* rules for the layout, benefit cards, mailer visual and CTAs.
// No other page uses this file.
//
// Desktop layout: hero + CTAs, then one screen-height block — mailer with the
// three benefit cards beneath it on the left, the household map on the right
// stretched to the same height, and the statement + CTAs centred below.
//
// Plain JS with no requires so a local mock can load it with <script src>.

// ── Configuration ────────────────────────────────────────────────────────
// "Book a call" opens this in a Calendly pop-up; the same URL is the href, so
// it still works as a normal link if the widget fails to load.
const DM_CALENDLY_URL = 'https://calendly.com/obello-outra/oli-meet';
// Oli's WhatsApp number in international format: digits only, no plus sign,
// spaces or leading zero (e.g. 447700900123). Empty = the "Contact on
// WhatsApp" buttons are not rendered.
const DM_WHATSAPP_NUMBER = '';
// Prefilled for the visitor to send (wa.me never sends automatically).
const DM_WHATSAPP_TEXT = 'Hi%2C%20I%27m%20interested%20in%20a%20precision%20direct%20mail%20campaign';

const DM_WHATSAPP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.78h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.88 9.88M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg>';

function dmEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// `id` lets the category-guide "Activate" buttons (which scroll to
// #cta-section) land on a real CTA — this page has no Get in Touch section.
function dmCtaHtml(id) {
  const wa = /^[1-9]\d{6,14}$/.test(DM_WHATSAPP_NUMBER)
    ? '<a class="dm-cta-btn dm-cta-btn--wa" href="https://wa.me/' + DM_WHATSAPP_NUMBER + '?text=' + DM_WHATSAPP_TEXT + '" target="_blank" rel="noopener">' + DM_WHATSAPP_ICON + 'Contact on WhatsApp</a>'
    : '';
  return ''
    + '<div class="dm-cta"' + (id ? ' id="' + id + '"' : '') + '>'
    +   '<div class="dm-cta-row">'
    +     '<a class="dm-cta-btn" href="' + dmEscape(DM_CALENDLY_URL) + '" target="_blank" rel="noopener" data-calendly>Book a call</a>'
    +     wa
    +   '</div>'
    + '</div>';
}

const DM_BENEFITS = [
  { icon: '\u{1F3E0}', title: 'Find your next customers', text: 'Target households by wealth, property, life stage and moving home.' },
  { icon: '✉️', title: 'Make an impression', text: 'Put beautifully produced, personalised direct mail into the right hands.' },
  { icon: '\u{1F4C8}', title: 'See what works', text: 'Measure response and sales to understand which audiences deliver.' },
];

const DM_CSS = ''
  + '<style>\n'
  + '.dm-section .propensity-header { max-width: 900px; }\n'
  + '.dm-section .propensity-headline { font-size: clamp(30px, 4.4vw, 54px); text-wrap: balance; }\n'
  // Second line is its own block so the break always falls after "meets".
  + '.dm-section .propensity-headline .gradient { display: block; }\n'
  + '.dm-section .propensity-desc { max-width: 760px; }\n'
  + '.dm-body { width: 100%; }\n'
  + '.dm-grid { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); gap: 24px; align-items: stretch; }\n'
  + '.dm-left { display: flex; flex-direction: column; gap: 14px; min-width: 0; }\n'
  + '.dm-mailer { position: relative; margin: 0; }\n'
  + '.dm-mailer img { display: block; width: 100%; height: auto; }\n'
  // Caption sits in the transparent space under the back of the mailer.
  + '.dm-mailer .dm-caption { position: absolute; right: 3%; bottom: 1%; margin: 0; }\n'
  + '.dm-benefits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n'
  + '.dm-benefit { padding: 14px 15px; background: #fff; border: 1px solid rgba(20, 24, 60, 0.08); border-radius: 12px;'
  +   ' box-shadow: 0 2px 10px rgba(20, 24, 60, 0.04); }\n'
  + '.dm-benefit-title { display: flex; align-items: baseline; gap: 7px; margin: 0 0 5px; font-size: 15px; line-height: 1.25;'
  +   ' font-weight: 800; color: #14143c; letter-spacing: -0.2px; }\n'
  + '.dm-benefit-icon { flex: 0 0 auto; font-size: 14px; }\n'
  + '.dm-benefit-text { margin: 0; font-size: 13px; line-height: 1.45; color: rgba(20, 24, 60, 0.72); }\n'
  + '.dm-map { position: relative; min-width: 0; display: flex; flex-direction: column; }\n'
  + '.dm-map-caption { display: none; }\n'
  + '.dm-map .propensity-video-logo-card .propensity-video-logo-img { font-size: clamp(10px, 1.5vw, 22px); }\n'
  + '.dm-caption { margin: 6px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;'
  +   ' color: rgba(20, 24, 60, 0.45); text-align: center; }\n'
  + '.dm-audience-cta { display: flex; justify-content: center; margin-top: 40px; padding: 0 24px; }\n'
  + '.dm-cta { display: flex; flex-direction: column; align-items: center; gap: 8px; scroll-margin-top: 120px; }\n'
  + '.propensity-header .dm-cta { margin-top: clamp(18px, 2.6vh, 30px); }\n'
  + '.dm-cta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }\n'
  + '.dm-cta-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 30px;'
  +   ' border: 1px solid transparent; border-radius: 100px; background: var(--outra-blue); color: #fff; font-size: 16px;'
  +   ' font-weight: 700; letter-spacing: 0.2px; text-decoration: none; box-sizing: border-box;'
  +   ' transition: background 0.25s, border-color 0.25s, transform 0.25s, box-shadow 0.25s; }\n'
  + '.dm-cta-btn:hover { background: var(--outra-navy); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(77, 97, 244, 0.3); }\n'
  + '.dm-cta-btn:focus-visible { outline: 3px solid rgba(77, 97, 244, 0.35); outline-offset: 3px; }\n'
  // Secondary: quieter outline button so "Book a call" stays dominant.
  + '.dm-cta-btn--wa { background: #fff; color: var(--outra-navy); border-color: rgba(20, 24, 60, 0.16); }\n'
  + '.dm-cta-btn--wa:hover { background: #fff; border-color: var(--outra-navy); box-shadow: 0 4px 16px rgba(20, 24, 60, 0.12); }\n'
  + '.dm-cta-btn--wa svg { width: 18px; height: 18px; fill: #25D366; flex: 0 0 auto; }\n'
  // Closing CTA on the dark pricing section: a lighter hover for the
  // primary (navy would vanish into the background).
  + '.dm-pricing-cta { display: flex; justify-content: center; margin-top: 32px; padding: 0 24px; }\n'
  // Price readout: no minimum-spend note and no "per month" (a send can be
  // one-off). The floor still applies to the price itself.
  + '#bnsPriceMin, #bnsPriceSub { display: none !important; }\n'
  + '.dm-pricing-cta .dm-cta-btn:not(.dm-cta-btn--wa):hover { background: #6274ff; box-shadow: 0 4px 18px rgba(77, 97, 244, 0.45); }\n'
  // Desktop: the map fills the row height set by mailer + cards. The stock
  // crop is width-based (aspect 1000/590); here it's height-based — video
  // sized off the frame height (width follows its own aspect), top 12%
  // clipped as before, and the logo card sized off the height too so it
  // still covers the same dashboard tile at any frame width.
  + '@media (min-width: 981px) {\n'
  + '  .dm-map .propensity-video-frame { flex: 1; aspect-ratio: auto; min-height: 0; }\n'
  + '  .dm-map .propensity-video-frame video { width: auto; height: 113.64%; top: -13.56%; left: 0; }\n'
  + '  .dm-map .propensity-video-logo-card { width: auto; height: 14%; aspect-ratio: 2.54; }\n'
  + '}\n'
  + '@media (min-width: 981px) and (max-width: 1180px) {\n'
  + '  .dm-benefits { grid-template-columns: 1fr; }\n'
  + '}\n'
  + '@media (max-width: 980px) {\n'
  + '  .dm-grid { grid-template-columns: 1fr; gap: 20px; }\n'
  + '  .dm-mailer { width: 100%; max-width: 640px; margin: 0 auto; }\n'
  + '}\n'
  + '@media (max-width: 600px) {\n'
  + '  .dm-benefits { grid-template-columns: 1fr; }\n'
  + '}\n'
  + '@media (max-width: 540px) {\n'
  + '  .dm-section .propensity-headline { font-size: clamp(25px, 7.4vw, 30px); }\n'
  // The in-card caption can't fit the narrow frame; show it below instead.
  + '  .dm-map .propensity-video-logo-caption { display: none !important; }\n'
  + '  .dm-map-caption { display: block; }\n'
  + '  .dm-cta-row { flex-direction: column; align-items: stretch; width: 100%; max-width: 340px; }\n'
  + '  .dm-cta-btn { width: 100%; }\n'
  + '  .dm-benefit { padding: 14px 16px; }\n'
  + '}\n'
  + '</style>\n';

// Calendly pop-up. Links fall back to opening the booking page in a new tab
// if the widget script hasn't loaded (blocked, offline, slow).
const DM_CALENDLY_JS = ''
  + '<link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css">\n'
  + '<script src="https://assets.calendly.com/assets/external/widget.js" async></script>\n'
  + '<script>\n'
  + 'document.addEventListener("click", function (e) {\n'
  + '  var a = e.target.closest ? e.target.closest("a[data-calendly]") : null;\n'
  + '  if (!a || !window.Calendly || typeof window.Calendly.initPopupWidget !== "function") return;\n'
  + '  e.preventDefault();\n'
  + '  window.Calendly.initPopupWidget({ url: a.href });\n'
  + '});\n'
  + '</script>\n';

// logoCardStyle: the <style> block the stock propensity section emits (it
// carries the desktop "Your Brand" logo-card rules the dashboard frame needs).
function buildDirectMailSection(opts) {
  const o = opts || {};
  const assetBase = o.assetBase || '/signature-segments/';
  const logoText = o.logoText || 'Your Brand';
  const benefits = DM_BENEFITS.map((b) => ''
    + '<div class="dm-benefit">'
    +   '<h3 class="dm-benefit-title"><span class="dm-benefit-icon" aria-hidden="true">' + b.icon + '</span>' + dmEscape(b.title) + '</h3>'
    +   '<p class="dm-benefit-text">' + dmEscape(b.text) + '</p>'
    + '</div>').join('');
  return ''
    + (o.logoCardStyle || '')
    + DM_CSS
    + '<section class="propensity-section dm-section">\n'
    + '  <div class="propensity-inner">\n'
    + '    <div class="propensity-header">\n'
    + '      <p class="propensity-eyebrow">Outra &times; Zap Post</p>\n'
    + '      <h1 class="propensity-headline">Precision targeting meets <span class="gradient">direct&nbsp;mail excellence.</span></h1>\n'
    + '      <p class="propensity-desc">Outra identifies the households most likely to buy. Zap Post brings your brand to their doorstep with beautifully produced direct mail. Together, we help you reach the right homes with something worth opening.</p>\n'
    + '      ' + dmCtaHtml('') + '\n'
    + '    </div>\n'
    + '    <div class="dm-body">\n'
    + '      <div class="dm-grid">\n'
    + '        <div class="dm-left">\n'
    + '          <figure class="dm-mailer">\n'
    + '            <img src="' + assetBase + 'dm-mailer-hotel-chocolat.png" width="1371" height="854" decoding="async"'
    +                ' alt="Example personalised direct mail: front and back of a Hotel Chocolat mailer">\n'
    + '            <figcaption class="dm-caption">Illustrative mail format</figcaption>\n'
    + '          </figure>\n'
    + '          <div class="dm-benefits">' + benefits + '</div>\n'
    + '        </div>\n'
    + '        <div class="dm-map">\n'
    + '          <div class="propensity-video-frame">\n'
    + '            <video class="propensity-video-el" autoplay muted loop playsinline webkit-playsinline preload="auto" disablePictureInPicture onloadedmetadata="try{this.currentTime=3}catch(e){}" oncanplay="this.play().catch(function(){})">\n'
    + '              <source src="https://proposals.outra.vip/cala/p2b-recording.mp4" type=\'video/mp4; codecs="avc1.42E01E, mp4a.40.2"\'>\n'
    + '            </video>\n'
    + '            <img class="propensity-video-poster" src="' + assetBase + 'p2b-poster-mobile.jpg" alt="Household targeting dashboard" />\n'
    + '            <div class="propensity-video-logo-card">'
    +                '<span class="propensity-video-logo-img" style="font-weight:800;letter-spacing:-0.3px;line-height:1;white-space:nowrap;color:var(--outra-navy);">' + dmEscape(logoText) + '</span>'
    +                '<span class="propensity-video-logo-caption">Illustrative household volumes</span>'
    +            '</div>\n'
    + '          </div>\n'
    + '          <p class="dm-caption dm-map-caption">Illustrative household volumes</p>\n'
    + '        </div>\n'
    + '      </div>\n'
    + '    </div>\n'
    + '  </div>\n'
    + '</section>\n'
    + DM_CALENDLY_JS;
}

// The same CTA closing the audience chooser (g-search). It carries
// id="cta-section", which the chooser's "Activate" buttons scroll to.
function buildAudienceCta() {
  return '<div class="dm-audience-cta">' + dmCtaHtml('cta-section') + '</div>';
}

// The same CTA, closing the pricing (g-commercials) section.
function buildPricingCta() {
  return '<div class="dm-pricing-cta">' + dmCtaHtml('') + '</div>';
}

// Swap the rendered g-household block for the DirectMail section, keeping the
// SEC markers so later section moves still find it.
function replaceHouseholdSection(html) {
  const re = /(<!--\s*SEC_START:g-household\s*-->)([\s\S]*?)(<!--\s*SEC_END:g-household\s*-->)/;
  return html.replace(re, (m, start, block, end) => {
    const style = (block.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
    return start + '\n' + buildDirectMailSection({ logoCardStyle: style }) + end;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildDirectMailSection, buildAudienceCta, buildPricingCta, replaceHouseholdSection };
}
