module.exports = {
  outputFile: 'emma-sleep.html',

  CHANNELS_SUBTITLE: 'Emma audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, and CRM platforms.',

  PAGE_TITLE: 'Outra x Emma Sleep - Signature Audiences',

  HEADER_LOGO_HTML: '<span class="logo-partner-text">x</span><span class="logo-partner-emma">Emma Sleep</span>',

  RESTRICTED_MAP_SECTION: '',

  HERO_HEADING: '<span class="nowrap">Signature Audiences</span><br>for <span class="gradient">Emma Sleep</span>',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals. Reach home movers, high-affluence families and multi-bedroom households actively in the market for a new mattress, privacy-first and GDPR compliant.</li>
        <li>Ready to activate across programmatic, paid social and addressable TV to drive mattress sales and grow brand reach.</li>`,

  MAXI_SEARCH_TITLE: 'Find your highest-converting Emma Sleep audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips" id="maxiChips">
      <button type="button" class="maxi-chip" data-query="Home movers actively moving house, currently moving and just moved households setting up new bedrooms and bedding">&#128235;&ensp;Home Movers</button>
      <button type="button" class="maxi-chip" data-query="High-affluence families with high or ultra-high purchasing power and children of all ages at home, including pre-school, primary school, secondary school teens and older teenagers needing quality mattresses">&#128106;&ensp;High Affluence Families</button>
      <button type="button" class="maxi-chip" data-query="Multi buy households with high or ultra-high purchasing power living in homes with three or more bedrooms, including detached, semi-detached and large homes likely to need multiple mattresses">&#128715;&ensp;Multi Buy</button>
    </div>`,

  CHIP_STYLES: `.maxi-chip.chip-selected {
  background: rgba(77,97,244,0.08);
  border-color: var(--outra-blue);
  color: var(--outra-blue);
  box-shadow: 0 0 0 2px rgba(77,97,244,0.15);
}
/* \u2500\u2500 HIDE CTA / GET IN TOUCH ON EMMA SLEEP PAGE \u2500\u2500 */
.cta-section,
.header-cta,
.card-activate-btn,
.timeline-card-activate {
  display: none !important;
}
/* \u2500\u2500 EMMA SLEEP HEADER WORDMARK (no logo file yet) \u2500\u2500 */
.logo-partner-emma {
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.5px;
  color: #ff6347;
  align-self: flex-end;
  line-height: 1;
  margin-bottom: -1px;
}
@media (max-width: 768px) {
  .logo-partner-emma { font-size: 18px; }
}
/* \u2500\u2500 SEARCH + ADS SIDE-BY-SIDE LAYOUT \u2500\u2500 */
.emma-search-flex {
  display: flex;
  gap: 56px;
  align-items: center;
  justify-content: center;
  max-width: 1280px;
  margin: 0 auto;
}
.emma-search-flex .maxi-search-inner {
  margin: 0;
  text-align: center;
  flex: 0 1 560px;
}
.emma-ads-panel {
  flex: 0 0 360px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}
.emma-ads-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.emma-ad-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
}
@media (max-width: 1100px) {
  /* Stack vertically \u2014 ads FIRST, search below \u2014 so mobile order is: ads \u2192 title \u2192 bar \u2192 chips */
  .emma-search-flex {
    flex-direction: column;
    gap: 32px;
    max-width: 100%;
    padding: 0;
  }
  .emma-ads-panel {
    order: -1;
    flex: 0 0 auto;
    width: 100%;
    max-width: 560px;
    align-items: center;
    text-align: center;
    margin: 0 auto;
  }
  .emma-search-flex .maxi-search-inner {
    flex: 0 0 auto;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
  }
}
/* \u2500\u2500 PHONES (<=600px): keep ads side-by-side scaled down, wrap chips into 2 rows \u2500\u2500 */
@media (max-width: 600px) {
  .emma-search-flex { gap: 24px; }
  .emma-ads-panel { max-width: 360px; padding: 0 8px; }
  .emma-ads-panel-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
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
.site-footer { background: var(--surface); }`,

  CHIP_STYLES_MOBILE: '',

  CHIP_SELECTED_CLASS: 'chip-selected',

  SEARCH_HANDLE_LOGIC: '// Keep chips visible, show clear button',
};
