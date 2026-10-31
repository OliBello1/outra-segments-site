// Outra × Zap Post section for /signature-segments/DirectMail.
//
// Replaces the generic propensity ("Every purchase has an ideal customer")
// block via the DirectMail alias postRender hook in api/render.js. Reuses the
// template's propensity-* layout and styles (header, two-column body, green
// panel, dashboard video frame) and adds dm-* rules for the benefit cards,
// mailer visual and booking CTAs. No other page uses this file.
//
// Plain JS with no requires so a local mock can load it with <script src>.

// ── Configuration ────────────────────────────────────────────────────────
// Both "Discuss my campaign" buttons open this in a Calendly pop-up; the same
// URL is the href, so it still works as a normal link if the widget fails.
const DM_CALENDLY_URL = 'https://calendly.com/obello-outra/oli-meet';
// Oli's WhatsApp number in international format: digits only, no plus sign,
// spaces or leading zero (e.g. 447700900123). Empty = the "Prefer a quick
// chat? WhatsApp Oli." links are not rendered.
const DM_WHATSAPP_NUMBER = '';
// Prefilled for the visitor to send (wa.me never sends automatically).
const DM_WHATSAPP_TEXT = 'Hi%2C%20I%27m%20interested%20in%20a%20precision%20direct%20mail%20campaign';

function dmEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// `id` lets the category-guide "Activate" buttons (which scroll to
// #cta-section) land on a real CTA — this page has no Get in Touch section.
function dmCtaHtml(id) {
  const wa = /^[1-9]\d{6,14}$/.test(DM_WHATSAPP_NUMBER)
    ? '<a class="dm-cta-wa" href="https://wa.me/' + DM_WHATSAPP_NUMBER + '?text=' + DM_WHATSAPP_TEXT + '" target="_blank" rel="noopener">Prefer a quick chat? WhatsApp Oli.</a>'
    : '';
  return ''
    + '<div class="dm-cta"' + (id ? ' id="' + id + '"' : '') + '>'
    +   '<a class="dm-cta-btn" href="' + dmEscape(DM_CALENDLY_URL) + '" target="_blank" rel="noopener" data-calendly>Discuss my campaign</a>'
    +   '<p class="dm-cta-sub">Let’s explore your audience, mail format and costs.</p>'
    +   wa
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
  + '.dm-section .propensity-aud-label { text-wrap: balance; }\n'
  + '.dm-section .propensity-desc { max-width: 760px; }\n'
  // Desktop only: the template collapses .propensity-body to one column at
  // <=980px, and this selector would otherwise out-rank that rule.
  + '@media (min-width: 981px) {\n'
  + '  .dm-section .dm-body { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr); align-items: center; }\n'
  + '}\n'
  + '.dm-benefits { display: flex; flex-direction: column; gap: 10px; }\n'
  + '.dm-benefit { display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; background: #fff;'
  +   ' border: 1px solid rgba(20, 24, 60, 0.08); border-radius: 12px; box-shadow: 0 2px 10px rgba(20, 24, 60, 0.04); }\n'
  + '.dm-benefit-icon { flex: 0 0 36px; height: 36px; border-radius: 10px; background: var(--bg-cool, #F7F9FF);'
  +   ' display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }\n'
  + '.dm-benefit-title { margin: 0 0 3px; font-size: 16px; line-height: 1.3; font-weight: 800; color: #14143c; letter-spacing: -0.2px; }\n'
  + '.dm-benefit-text { margin: 0; font-size: 14px; line-height: 1.5; color: rgba(20, 24, 60, 0.72); }\n'
  + '.dm-section .dm-statement { display: block; padding: 18px 22px; }\n'
  + '.dm-statement-main { margin: 0; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.3; font-weight: 800; color: #0a4a18; letter-spacing: -0.2px; text-wrap: balance; }\n'
  + '.dm-statement-sub { margin: 4px 0 0; font-size: 13px; line-height: 1.4; font-weight: 500; color: rgba(10, 74, 24, 0.78); }\n'
  + '.dm-cta { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: clamp(18px, 2.6vh, 30px); scroll-margin-top: 120px; }\n'
  + '.dm-left .dm-cta { align-items: flex-start; margin-top: 6px; }\n'
  + '.dm-cta-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 34px;'
  +   ' border-radius: 100px; background: var(--outra-blue); color: #fff; font-size: 16px; font-weight: 700; letter-spacing: 0.2px;'
  +   ' text-decoration: none; box-sizing: border-box; transition: background 0.25s, transform 0.25s, box-shadow 0.25s; }\n'
  + '.dm-cta-btn:hover { background: var(--outra-navy); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(77, 97, 244, 0.3); }\n'
  + '.dm-cta-btn:focus-visible { outline: 3px solid rgba(77, 97, 244, 0.35); outline-offset: 3px; }\n'
  + '.dm-cta-sub { margin: 6px 0 0; font-size: 14px; line-height: 1.45; color: rgba(20, 24, 60, 0.65); text-wrap: balance; }\n'
  + '.dm-cta-wa { display: inline-block; padding: 8px 2px; font-size: 13px; color: rgba(20, 24, 60, 0.6);'
  +   ' text-decoration: underline; text-decoration-color: rgba(20, 24, 60, 0.25); text-underline-offset: 3px; }\n'
  + '.dm-cta-wa:hover { color: var(--outra-navy); }\n'
  // Mailer leads the visual; the dashboard is a smaller supporting crop below.
  + '.dm-mailer { margin: 0; }\n'
  + '.dm-mailer img { display: block; width: 100%; height: auto; }\n'
  + '.dm-caption { margin: 6px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;'
  +   ' color: rgba(20, 24, 60, 0.45); text-align: center; }\n'
  // Mailer caption sits under the front card (left) so it can't be read as
  // a label for the right-aligned dashboard below it.
  + '.dm-mailer .dm-caption { text-align: left; padding-left: 8%; }\n'
  + '.dm-targeting { width: 56%; margin: 6px 0 0 auto; }\n'
  // "Your Brand" placeholder scales with the smaller frame (was a fixed 26px).
  + '.dm-visual .propensity-video-logo-card .propensity-video-logo-img { font-size: clamp(8px, 1vw, 13px); top: 50% !important; transform: translate(-50%, -50%) !important; }\n'
  + '@media (max-width: 980px) {\n'
  + '  .dm-targeting { width: 72%; margin: 4px auto 0; }\n'
  + '  .dm-mailer .dm-caption { text-align: center; padding-left: 0; }\n'
  + '  .dm-left .dm-cta { align-items: center; text-align: center; }\n'
  + '}\n'
  + '@media (max-width: 540px) {\n'
  + '  .dm-section .propensity-headline { font-size: clamp(25px, 7.4vw, 30px); }\n'
  + '  .dm-targeting { width: 84%; }\n'
  + '  .dm-cta-btn { width: 100%; max-width: 340px; }\n'
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
    +   '<span class="dm-benefit-icon" aria-hidden="true">' + b.icon + '</span>'
    +   '<div><h3 class="dm-benefit-title">' + dmEscape(b.title) + '</h3>'
    +   '<p class="dm-benefit-text">' + dmEscape(b.text) + '</p></div>'
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
    + '    <div class="propensity-body dm-body">\n'
    + '      <div class="propensity-left dm-left">\n'
    + '        <p class="propensity-aud-label">From the right household to the right doorstep</p>\n'
    + '        <div class="dm-benefits">' + benefits + '</div>\n'
    + '        <div class="propensity-stats dm-statement">'
    +            '<p class="dm-statement-main">Audience selection. Print. Post. Measurement.</p>'
    +            '<p class="dm-statement-sub">One joined-up direct mail campaign.</p>'
    +          '</div>\n'
    + '        ' + dmCtaHtml('cta-section') + '\n'
    + '      </div>\n'
    + '      <div class="propensity-visual dm-visual">\n'
    + '        <figure class="dm-mailer">\n'
    + '          <img src="' + assetBase + 'dm-mailer-hotel-chocolat.png" width="1371" height="854" decoding="async"'
    +              ' alt="Example personalised direct mail: front and back of a Hotel Chocolat mailer">\n'
    + '          <figcaption class="dm-caption">Illustrative mail format</figcaption>\n'
    + '        </figure>\n'
    + '        <div class="dm-targeting">\n'
    + '          <div class="propensity-video-frame">\n'
    + '            <video class="propensity-video-el" autoplay muted loop playsinline webkit-playsinline preload="auto" disablePictureInPicture onloadedmetadata="try{this.currentTime=3}catch(e){}" oncanplay="this.play().catch(function(){})">\n'
    + '              <source src="https://proposals.outra.vip/cala/p2b-recording.mp4" type=\'video/mp4; codecs="avc1.42E01E, mp4a.40.2"\'>\n'
    + '            </video>\n'
    + '            <img class="propensity-video-poster" src="' + assetBase + 'p2b-poster-mobile.jpg" alt="Household targeting dashboard" />\n'
    + '            <div class="propensity-video-logo-card">'
    +                '<span class="propensity-video-logo-img" style="font-weight:800;letter-spacing:-0.3px;line-height:1;white-space:nowrap;color:var(--outra-navy);">' + dmEscape(logoText) + '</span>'
    +            '</div>\n'
    + '          </div>\n'
    + '          <p class="dm-caption">The household targeting behind the mail &middot; illustrative volumes</p>\n'
    + '        </div>\n'
    + '      </div>\n'
    + '    </div>\n'
    + '  </div>\n'
    + '</section>\n'
    + DM_CALENDLY_JS;
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
  module.exports = { buildDirectMailSection, replaceHouseholdSection };
}
