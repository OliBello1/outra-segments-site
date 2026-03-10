module.exports = {
  outputFile: 'open-partners.html',

  PAGE_TITLE: 'Outra x Open Partners - Signature Audiences',

  HERO_HEADING: 'Signature Audiences for <span class="gradient">Open Partners</span>',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals, privacy-first and GDPR compliant</li>
        <li>Ready to activate across programmatic, paid social and addressable TV for your clients</li>`,

  MAXI_SEARCH_TITLE: 'Try it with your clients \u2014 find their highest converting audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips op-logo-chips" id="maxiChips">
      <button type="button" class="maxi-chip op-logo-chip" data-query="Online mattress and bed retailer"><img src="Open Partners Logos/Happy Beds.svg" alt="Happy Beds"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Online car marketplace and automotive retail"><img src="Open Partners Logos/Autotrader.svg" alt="Autotrader"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Natural health food and supplements brand"><img src="Open Partners Logos/Hunter and Gather.webp" alt="Hunter &amp; Gather"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Animal health and veterinary products"><img src="Open Partners Logos/Virbac.png" alt="Virbac"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Travel agency and holiday booking"><img src="Open Partners Logos/Travel Counsellors.png" alt="Travel Counsellors"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Airport and air travel"><img src="Open Partners Logos/London Luton Airport.png" alt="London Luton Airport"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Housebuilder selling new-build homes"><img src="Open Partners Logos/Taylor Wimpey.png" alt="Taylor Wimpey"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Premium automotive dealership group"><img src="Open Partners Logos/Sytner.png" alt="Sytner"></button>
    </div>`,

  CHIP_STYLES: `/* \u2500\u2500 OPEN PARTNERS LOGO CHIPS \u2500\u2500 */
.op-logo-chips {
  gap: 10px;
  margin-top: 18px;
}
.op-logo-chip {
  padding: 0;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 52px;
}
.op-logo-chip img {
  max-height: 36px;
  max-width: 120px;
  width: auto;
  height: auto;
  object-fit: contain;
  transition: all 0.25s;
}
.op-logo-chip:hover {
  background: rgba(77,97,244,0.06);
  border-color: rgba(77,97,244,0.25);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.op-logo-chip.op-selected {
  background: rgba(77,97,244,0.08);
  border-color: var(--outra-blue);
  box-shadow: 0 0 0 2px rgba(77,97,244,0.15);
  transform: translateY(-1px);
}`,

  CHIP_STYLES_MOBILE: `.op-logo-chip { padding: 0; width: 110px; height: 44px; }
  .op-logo-chip img { max-height: 28px; max-width: 96px; }`,

  CHIP_SELECTED_CLASS: 'op-selected',

  SEARCH_HANDLE_LOGIC: `// On Open Partners page, keep logo chips visible; on main page, hide them
    var isOpenPartners = chips && chips.classList.contains('op-logo-chips');
    if (chips && !isOpenPartners) chips.style.display = 'none';`,
};
