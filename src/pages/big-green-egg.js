module.exports = {
  outputFile: 'big-green-egg.html',

  CHANNELS_SUBTITLE: 'Big Green Egg audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, and CRM platforms.',

  PAGE_TITLE: 'Outra x Big Green Egg - Signature Audiences',

  HEADER_LOGO_HTML: '<span class="logo-partner-text">x</span><img src="big-green-egg-logo.png" alt="Big Green Egg" class="logo-partner-img">',

  RESTRICTED_MAP_SECTION: '',

  HERO_HEADING: '<span class="nowrap">Signature Audiences</span><br>for <span class="gradient">Big Green Egg</span>',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals. Privacy-first and GDPR compliant.</li>
        <li>Reach outdoor cooking enthusiasts, premium home garden owners and high purchasing power households ready to invest in a Big Green Egg.</li>
        <li>Ready to activate across programmatic, paid social and addressable TV to drive EGG sales, accessory attach rate and lifetime value.</li>`,

  MAXI_SEARCH_TITLE: 'Find your highest-converting Big Green Egg audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips" id="maxiChips">
      <button type="button" class="maxi-chip" data-query="Households with high or ultra-high purchasing power living in owner-occupied homes with gardens who entertain outdoors">&#127795;&ensp;Affluent Homes with Gardens</button>
      <button type="button" class="maxi-chip" data-query="Families with high or ultra-high purchasing power with pre-school, primary school and secondary school children at home, living in owner-occupied homes with gardens">&#128106;&ensp;Affluent Families</button>
      <button type="button" class="maxi-chip" data-query="Early career households and established professionals without children, aged 25 to 40, with high or ultra-high purchasing power, living in suburban and rural areas outside big cities">&#128188;&ensp;Young Professionals Outside Big Cities</button>
      <button type="button" class="maxi-chip" data-query="Just moved and recently settling-in households with high or ultra-high purchasing power in owner-occupied homes with gardens, decorating and furnishing outdoor living spaces">&#127969;&ensp;New Home Movers with Gardens</button>
      <button type="button" class="maxi-chip" data-query="Households with high or ultra-high purchasing power living in owner-occupied homes with gardens in urban and city areas">&#127961;&#65039;&ensp;Affluent Urban with Gardens</button>
    </div>`,

  CHIP_STYLES: `.maxi-chip.chip-selected {
  background: rgba(77,97,244,0.08);
  border-color: var(--outra-blue);
  color: var(--outra-blue);
  box-shadow: 0 0 0 2px rgba(77,97,244,0.15);
}
/* \u2500\u2500 HIDE CTA / GET IN TOUCH ON BGE PAGE \u2500\u2500 */
.cta-section,
.header-cta,
.card-activate-btn,
.timeline-card-activate {
  display: none !important;
}
/* \u2500\u2500 SCALE BGE LOGO TO MATCH OUTRA LOGO \u2500\u2500 */
/* Logo is 540x355 (wide aspect) so height is slightly taller to balance optically */
.logo-partner-img { height: 44px; width: auto; }
@media (max-width: 768px) {
  .logo-partner-img { height: 36px; }
}
/* First-party data card logo: keep it on transparent background, no white card fill */
.csf-entry-logo {
  background: transparent !important;
  max-height: 48px;
  width: auto;
  object-fit: contain;
}
/* \u2500\u2500 SEARCH + ADS SIDE-BY-SIDE LAYOUT \u2500\u2500 */
.bge-search-flex {
  display: flex;
  gap: 56px;
  align-items: center;
  justify-content: center;
  max-width: 1280px;
  margin: 0 auto;
}
.bge-search-flex .maxi-search-inner {
  margin: 0;
  text-align: center;
  flex: 0 1 560px;
}
.bge-ads-panel {
  flex: 0 0 360px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}
.bge-ads-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.bge-ad-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
}
@media (max-width: 1100px) {
  .bge-search-flex {
    flex-direction: column;
    gap: 32px;
    max-width: 100%;
    padding: 0;
  }
  .bge-ads-panel {
    order: -1;
    flex: 0 0 auto;
    width: 100%;
    max-width: 560px;
    align-items: center;
    text-align: center;
    margin: 0 auto;
  }
  .bge-search-flex .maxi-search-inner {
    flex: 0 0 auto;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
  }
}
/* \u2500\u2500 PHONES (<=600px): ads side-by-side scaled down, chips wrap \u2500\u2500 */
@media (max-width: 600px) {
  .bge-search-flex { gap: 24px; }
  .bge-ads-panel { max-width: 360px; padding: 0 8px; }
  .bge-ads-panel-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .maxi-search-chips {
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    justify-content: center;
    gap: 6px;
    padding: 0 12px;
  }
  .maxi-chip {
    padding: 7px 12px !important;
    font-size: 12px !important;
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
/* \u2500\u2500 REMOVE GREY STRIP BELOW FOOTER \u2500\u2500 */
html { background: var(--surface); }
body { background: var(--surface); }
.site-footer { background: var(--surface); }
/* \u2500\u2500 MOBILE: make footer visually tall so you can't scroll past it \u2500\u2500 */
@media (max-width: 768px) {
  .site-footer {
    padding-top: 48px;
    padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px));
  }
}
@media (max-width: 600px) {
  .site-footer {
    padding-top: 40px;
    padding-bottom: calc(200px + env(safe-area-inset-bottom, 0px));
  }
}`,

  CHIP_STYLES_MOBILE: '',

  CHIP_SELECTED_CLASS: 'chip-selected',

  SEARCH_HANDLE_LOGIC: '// Keep chips visible, show clear button',
};
