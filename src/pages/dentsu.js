module.exports = {
  outputFile: 'dentsu.html',

  PAGE_TITLE: 'Outra x Dentsu - Signature Audiences',

  HERO_HEADING: 'Signature Audiences for <span class="gradient">Dentsu</span>',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals, privacy-first and GDPR compliant</li>
        <li>Ready to activate across programmatic, paid social and addressable TV for your clients</li>`,

  MAXI_SEARCH_TITLE: 'Try it with your clients \u2014 find their highest converting audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips op-logo-chips" id="maxiChips">
      <button type="button" class="maxi-chip op-logo-chip" data-query="Co-operative food retail and convenience stores"><img src="Dentsu Logos/Co-op.png" alt="Co-op"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Health food and wellness supplements retail"><img src="Dentsu Logos/Holland and Barrett.png" alt="Holland &amp; Barrett"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Home improvement and DIY retail"><img src="Dentsu Logos/Wickes.png" alt="Wickes"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Bakery chain and food-on-the-go retail"><img src="Dentsu Logos/Greggs.png" alt="Greggs"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Heritage conservation and tourism in Scotland"><img src="Dentsu Logos/National Trust for Scotland.png" alt="National Trust for Scotland"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Breakfast cereal and snacks manufacturer"><img src="Dentsu Logos/Kelloggs.png" alt="Kelloggs"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Fitted kitchen and joinery retail"><img src="Dentsu Logos/Magnet.png" alt="Magnet Kitchens"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Housebuilder selling new-build homes"><img src="Dentsu Logos/Barratt Homes.jpg" alt="Barratt Homes"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Discount variety retail and homeware"><img src="Dentsu Logos/BM.jpg" alt="B&amp;M Retail"></button>
    </div>`,

  CHIP_STYLES: `/* \u2500\u2500 DENTSU LOGO CHIPS \u2500\u2500 */
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
  max-height: 24px;
  max-width: 100px;
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
  .op-logo-chip img { max-height: 20px; max-width: 80px; }`,

  CHIP_SELECTED_CLASS: 'op-selected',

  SEARCH_HANDLE_LOGIC: `// On Dentsu page, keep logo chips visible; on main page, hide them
    var isOpenPartners = chips && chips.classList.contains('op-logo-chips');
    if (chips && !isOpenPartners) chips.style.display = 'none';`,
};
