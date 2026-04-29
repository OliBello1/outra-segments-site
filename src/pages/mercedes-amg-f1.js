module.exports = {
  outputFile: 'mercedes-amg-f1.html',

  CHANNELS_SUBTITLE: 'Mercedes-AMG Petronas F1 Team audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, and CRM platforms.',

  PAGE_TITLE: 'Outra x Mercedes-AMG Petronas F1 Team - Signature Audiences',

  HEADER_LOGO_HTML: '<span class="logo-partner-text">x</span><img src="mercedes-amg-f1-logo.png" alt="Mercedes-AMG Petronas F1 Team" class="logo-partner-img">',

  RESTRICTED_MAP_SECTION: '',

  HERO_HEADING: '<span class="nowrap">Signature Audiences</span><br>for <span class="gradient">Mercedes-AMG Petronas F1 Team</span>',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals. Reach Fanware buyers, next generation F1 fans and high end car owning households, privacy-first and GDPR compliant.</li>
        <li>Ready to activate across programmatic, paid social and addressable TV to drive merchandise sales and grow brand reach.</li>`,

  MAXI_SEARCH_TITLE: 'Find your highest-converting Mercedes-AMG F1 audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips" id="maxiChips">
      <button type="button" class="maxi-chip" data-query="Premium F1 team kit and fanware for adult supporters">&#128084;&ensp;Fanware (Adults)</button>
      <button type="button" class="maxi-chip" data-query="Junior and children's F1 fanware and team merchandise for affluent households with young children aged 0 to 11 and high or ultra-high purchasing power, not teenagers">&#129489;&#8205;&#128658;&ensp;Fanware (Kids)</button>
      <button type="button" class="maxi-chip" data-query="Young adult F1 fans aged 18 to 29, students in full-time education and early career professionals renting without children, with rising income engaging with motorsport and streetwear">&#128200;&ensp;Rising Income Fans</button>
      <button type="button" class="maxi-chip" data-query="Next generation F1 fans aged 10 to 18, households with primary school children aged 5 to 11, secondary school teens aged 11 to 15 and older teenagers aged 16 to 18 growing up as F1 supporters">&#127934;&ensp;Next Generation Fans</button>
      <button type="button" class="maxi-chip" data-query="Affluent family F1 fans with high or ultra-high purchasing power and children of all ages at home, including pre-school, primary school, secondary school teens and older teenagers">&#128106;&ensp;Family Fans</button>
      <button type="button" class="maxi-chip" data-query="Luxury car owners and multi-car households with high or ultra-high purchasing power living in detached and large homes">&#128663;&ensp;Luxury Car Owners</button>
    </div>`,

  CHIP_STYLES: `.maxi-chip.chip-selected {
  background: rgba(77,97,244,0.08);
  border-color: var(--outra-blue);
  color: var(--outra-blue);
  box-shadow: 0 0 0 2px rgba(77,97,244,0.15);
}
/* \u2500\u2500 HIDE CTA / GET IN TOUCH ON MERCEDES PAGE \u2500\u2500 */
.cta-section,
.header-cta,
.card-activate-btn,
.timeline-card-activate {
  display: none !important;
}
/* \u2500\u2500 SCALE MERCEDES LOGO TO MATCH OUTRA LOGO \u2500\u2500 */
.logo-partner-img { height: 38px; }
@media (max-width: 768px) {
  .logo-partner-img { height: 32px; }
}
/* \u2500\u2500 SEARCH + ADS SIDE-BY-SIDE LAYOUT \u2500\u2500 */
.mercedes-search-flex {
  display: flex;
  gap: 56px;
  align-items: center;
  justify-content: center;
  max-width: 1280px;
  margin: 0 auto;
}
.mercedes-search-flex .maxi-search-inner {
  margin: 0;
  text-align: center;
  flex: 0 1 560px;
}
.mercedes-ads-panel {
  flex: 0 0 360px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}
.mercedes-ads-panel-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--outra-blue);
  line-height: 1.35;
}
.mercedes-ads-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.mercedes-ad-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
}
@media (max-width: 1100px) {
  /* Stack vertically \u2014 ads FIRST, search below \u2014 so mobile order is: ads \u2192 title \u2192 bar \u2192 chips */
  .mercedes-search-flex {
    flex-direction: column;
    gap: 32px;
    max-width: 100%;
    padding: 0;
  }
  .mercedes-ads-panel {
    order: -1; /* ads above search on narrow screens */
    flex: 0 0 auto;
    width: 100%;
    max-width: 560px;
    align-items: center;
    text-align: center;
    margin: 0 auto;
  }
  .mercedes-search-flex .maxi-search-inner {
    flex: 0 0 auto;
    width: 100%;
    max-width: 720px; /* restore the native search-inner max-width */
    margin: 0 auto;
  }
}
/* \u2500\u2500 PHONES (<=600px): keep ads side-by-side but scaled down, wrap chips into 2 rows \u2500\u2500 */
@media (max-width: 600px) {
  .mercedes-search-flex { gap: 24px; }
  /* Ads: side-by-side 2 columns, scaled narrower so each ad fits comfortably */
  .mercedes-ads-panel { max-width: 360px; padding: 0 8px; }
  .mercedes-ads-panel-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .mercedes-ads-panel-label { text-align: center; }
  /* Chips wrap into 2 uneven rows \u2014 no horizontal scroll, shrink padding/font to fit */
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
/* Set the html root bg to match the footer's surface colour so any area
   beyond the footer (overscroll on mobile, or if content is shorter than
   the viewport) doesn't show the warm neutral body bg. */
html { background: var(--surface); }
.site-footer { background: var(--surface); }`,

  CHIP_STYLES_MOBILE: '',

  CHIP_SELECTED_CLASS: 'chip-selected',

  SEARCH_HANDLE_LOGIC: '// Keep chips visible, show clear button',
};
