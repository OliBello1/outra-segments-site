module.exports = {
  outputFile: 'index.html',

  PAGE_TITLE: 'Outra - Signature Segments',

  HERO_HEADING: 'Signal-Led Audiences Built for <span>Precision</span>',

  HERO_BULLETS: `<li>Every record tied to a verified UK household for true granular targeting, privacy-first and GDPR compliant</li>
        <li>Deploy instantly across programmatic, paid social and addressable TV with no engineering lift</li>`,

  MAXI_SEARCH_TITLE: 'Find your highest converting audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips" id="maxiChips">
      <button type="button" class="maxi-chip" data-query="We sell mattresses">&#128716; Mattresses</button>
      <button type="button" class="maxi-chip" data-query="Solar panel installation">&#9728;&#65039; Solar panels</button>
      <button type="button" class="maxi-chip" data-query="Car insurance">&#128663; Car insurance</button>
      <button type="button" class="maxi-chip" data-query="Children's clothing brand">&#128090; Children's clothing</button>
      <button type="button" class="maxi-chip" data-query="Estate agent">&#127968; Estate agents</button>
      <button type="button" class="maxi-chip" data-query="Luxury fashion retailer">&#128142; Luxury retail</button>
      <button type="button" class="maxi-chip" data-query="Broadband provider">&#128225; Broadband</button>
      <button type="button" class="maxi-chip" data-query="Garden furniture store">&#127793; Garden &amp; outdoor</button>
    </div>`,

  CHIP_STYLES: `.maxi-chip.chip-selected {
  background: rgba(77,97,244,0.08);
  border-color: var(--outra-blue);
  color: var(--outra-blue);
  box-shadow: 0 0 0 2px rgba(77,97,244,0.15);
}`,

  CHIP_STYLES_MOBILE: '',

  CHIP_SELECTED_CLASS: 'chip-selected',

  SEARCH_HANDLE_LOGIC: '// Keep chips visible, show clear button',
};
