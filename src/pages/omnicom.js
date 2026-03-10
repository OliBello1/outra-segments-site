module.exports = {
  outputFile: 'omnicom.html',

  PAGE_TITLE: 'Outra x Omnicom - Signature Audiences',

  HERO_HEADING: 'Signature Audiences for <span class="gradient">Omnicom</span>',

  HERO_BULLETS: `<li>Household-level precision audiences built on 75bn+ verified UK data signals, privacy-first and GDPR compliant</li>
        <li>Ready to activate across programmatic, paid social and addressable TV for your clients</li>`,

  MAXI_SEARCH_TITLE: 'Try it with your clients \u2014 find their highest converting audience',

  SEARCH_CHIPS: `<div class="maxi-search-chips op-logo-chips" id="maxiChips">
      <button type="button" class="maxi-chip op-logo-chip" data-query="Consumer packaged goods and household products"><img src="Omnicom Logos/Kimberly Clark.svg" alt="Kimberly Clark"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Digital bank and personal finance app"><img src="Omnicom Logos/Monzo.png" alt="Monzo"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Video games publisher and interactive entertainment"><img src="Omnicom Logos/2K Games.png" alt="2K Games"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Global bakery and snacks manufacturer"><img src="Omnicom Logos/Grupo Bimbo.png" alt="Grupo Bimbo"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Cholesterol-lowering health food brand"><img src="Omnicom Logos/Benecol.webp" alt="Benecol"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Canned meat and food brand"><img src="Omnicom Logos/Spam.png" alt="Spam"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Peanut butter and spreads brand"><img src="Omnicom Logos/Skippy.png" alt="Skippy"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Premium cocktail mixers and ready-to-drink brand"><img src="Omnicom Logos/Funkin Cocktails.png" alt="Funkin Cocktails"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Home care and elderly care services"><img src="Omnicom Logos/Home Instead.jpg" alt="Home Instead"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Global drinks and spirits company"><img src="Omnicom Logos/Diageo.png" alt="Diageo"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Premium whisky brand and visitor experience"><img src="Omnicom Logos/Johnnie Walker.png" alt="Johnnie Walker Princes Street"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Online marketplace for unique and personalised gifts"><img src="Omnicom Logos/Not On The High Street.png" alt="Not On The High Street"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Supermarket and grocery retail"><img src="Omnicom Logos/Sainsburys.png" alt="Sainsbury's"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Global food and beverage manufacturer"><img src="Omnicom Logos/PepsiCo.png" alt="PepsiCo"></button>
      <button type="button" class="maxi-chip op-logo-chip" data-query="Online sports betting and gaming"><img src="Omnicom Logos/BetMGM.avif" alt="BetMGM"></button>
    </div>`,

  CHIP_STYLES: `/* \u2500\u2500 OMNICOM LOGO CHIPS \u2500\u2500 */
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

  SEARCH_HANDLE_LOGIC: `// On Omnicom page, keep logo chips visible; on main page, hide them
    var isOpenPartners = chips && chips.classList.contains('op-logo-chips');
    if (chips && !isOpenPartners) chips.style.display = 'none';`,
};
