module.exports = {
  outputFile: 'index.html',

  PAGE_TITLE: 'Outra - Signature Segments',

  HERO_HEADING: '<span class="nowrap">Signal-Led Audiences,</span><br>Built for <span class="gradient">Precision</span>.',

  HERO_BULLETS: `<li>Every record tied to a verified UK household for true granular targeting, privacy-first and GDPR compliant</li>
        <li>Deploy instantly across programmatic, paid social and addressable TV with no engineering lift</li>`,

  MAXI_SEARCH_TITLE: 'Find your highest converting audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips" id="maxiChips">
      <button type="button" class="maxi-chip" data-query="We sell mattresses">&#128716;&ensp;Mattresses</button>
      <button type="button" class="maxi-chip" data-query="Solar panel installation">&#9728;&#65039;&ensp;Solar panels</button>
      <button type="button" class="maxi-chip" data-query="Car insurance">&#128663;&ensp;Car insurance</button>
      <button type="button" class="maxi-chip" data-query="Children's clothing brand">&#128090;&ensp;Children's clothing</button>
      <button type="button" class="maxi-chip" data-query="Estate agent">&#127968;&ensp;Estate agents</button>
      <button type="button" class="maxi-chip" data-query="Luxury fashion retailer">&#128142;&ensp;Luxury retail</button>
      <button type="button" class="maxi-chip" data-query="Broadband provider">&#128225;&ensp;Broadband</button>
      <button type="button" class="maxi-chip" data-query="Garden furniture store">&#127793;&ensp;Garden &amp; outdoor</button>
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
