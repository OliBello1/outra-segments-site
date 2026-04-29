module.exports = {
  outputFile: 'rathbones.html',

  CHANNELS_SUBTITLE: 'Outra Signature Audiences are ready to activate across leading programmatic, paid social, addressable TV, audio, and CRM platforms.',

  PAGE_TITLE: 'Outra x Rathbones - Signature Audiences',

  HEADER_LOGO_HTML: '<span class="logo-partner-text">x</span><img src="rathbones-logo.svg" alt="Rathbones" class="logo-partner-img">',

  RESTRICTED_MAP_SECTION: `<section class="restricted-map-section" id="restrictedMap">
  <div class="restricted-map-inner">
    <div class="restricted-map-header">
      <div class="restricted-map-eyebrow">Restricted Category Advantage</div>
      <h2 class="restricted-map-title">Platform targeting doesn't need to be such a<br><span class="gradient-warm">high investment.</span></h2>
      <p class="restricted-map-desc"><span class="gradient-green">Precision</span> reach, not <span class="gradient-warm">waste</span>.</p>
    </div>
    <div class="restricted-map-grid">
      <div class="map-panel" id="mapPanelBroad">
        <div class="map-panel-label">
          <span class="map-panel-dot broad"></span>
          <span class="map-panel-name">Meta Broad Category Targeting</span>
          <span class="map-city-label" id="cityLabelBroad">Manchester</span>
        </div>
        <div class="map-container" id="mapBroad"></div>
      </div>
      <div class="map-panel" id="mapPanelPrecise">
        <div class="map-panel-label">
          <span class="map-panel-dot precise"></span>
          <span class="map-panel-name">Outra High-Net-Worth Targeting</span>
          <span class="map-city-label" id="cityLabelPrecise">Manchester</span>
        </div>
        <div class="map-container" id="mapPrecise"></div>
      </div>
    </div>
    <div class="restricted-map-stats">
      <div class="rms-stat">
        <div class="rms-stat-val broad">~2.3M</div>
        <div class="rms-stat-label">Households reached indiscriminately</div>
      </div>
      <div class="rms-divider"></div>
      <div class="rms-stat">
        <div class="rms-stat-val precise">~45,200</div>
        <div class="rms-stat-label">HNW households identified</div>
      </div>
    </div>
  </div>
</section>`,

  HERO_HEADING: '<span class="nowrap"><span class="gradient">Signal-Led</span> Audiences.</span><br>Precise <span class="gradient">Investor</span> Targeting.',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals. Reach mid and high net worth individuals ready for their first investment portfolio.</li>
        <li>Regional profiling and geo-targeting for events, media and addressable activation. Privacy-first and GDPR compliant.</li>`,

  MAXI_SEARCH_TITLE: 'Find your highest-converting investor audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips" id="maxiChips">
      <button type="button" class="maxi-chip" data-query="Wealth management and investment advisory">&#127974;&ensp;Wealth management</button>
      <button type="button" class="maxi-chip" data-query="First-time investors looking to build a portfolio">&#128200;&ensp;First-time investors</button>
      <button type="button" class="maxi-chip" data-query="High net worth homeowners with significant property assets">&#127968;&ensp;High net worth homeowners</button>
      <button type="button" class="maxi-chip" data-query="Professional services and high income households">&#128188;&ensp;Professional services</button>
      <button type="button" class="maxi-chip" data-query="Retirement planning and pension drawdown">&#9749;&ensp;Retirement planning</button>
    </div>`,

  CHIP_STYLES: `.maxi-chip.chip-selected {
  background: rgba(4,56,176,0.08);
  border-color: #0438B0;
  color: #0438B0;
  box-shadow: 0 0 0 2px rgba(4,56,176,0.15);
}`,

  CHIP_STYLES_MOBILE: '',

  CHIP_SELECTED_CLASS: 'chip-selected',

  SEARCH_HANDLE_LOGIC: '// Keep chips visible, show clear button',
};
