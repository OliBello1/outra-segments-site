# outra-segments-site — MEMORY

Persistent notes for the dynamic microsite renderer. Read this before
editing layout, Airtable field handling, or CTA logic.

## Microsite builder — propensity section brand-logo overlay

File: `api/_render-helper.js`, `.propensity-video-logo-img` rule
(~line 468). Mobile mirror in `builder-template.html` media query at
`max-width: 980px`.

**Layout rule (do not loosen without testing across brand logos):**

- `max-width: 95%` of the card
- `max-height: 58%` of the card
- `top: 14%` from card top
- `left: 50%` + `transform: translateX(-50%)` — horizontally centered
- `object-fit: contain` — preserves aspect ratio for any uploaded asset
- Parent `.propensity-video-logo-card` has `overflow: hidden` as the
  hard backstop so no logo can ever bleed past the card edge

Tested with wide horizontal wordmarks (E.ON Next, Bacardi), square marks
(Matches Fashion), and stacked logos. Works for any aspect ratio because
`object-fit: contain` scales until whichever max-dimension hits first.

**Why we don't use `right`/`bottom` insets:** combining insets with
`width:auto`/`height:auto` and `object-fit:contain` produced
inconsistent sizing across browsers — wide logos overflowed the card
right edge in some Chromium builds. Explicit `max-width`/`max-height`
caps with a single positioning anchor (top + transform-centered) is
the only reliable model.

## Microsite builder — "Challenges we solve" heading

File: `api/_render-helper.js` ~line 519.

- Default for the `Propensity Category` field is empty string.
- When empty, heading renders as `Challenges we solve`.
- When populated, heading renders as `Challenges we solve for {category}`.

The earlier behaviour hardcoded `'high-end fashion'` (or
`'premium spirits'` for Bacardi) as the default — users editing a new
microsite kept missing that field and shipping with the wrong category.

## CTA visibility — strict equality required

File: `api/_render-helper.js` ~lines 1082-1083.

```js
const headerCtaEnabled = record['Header CTA Enabled'] === true;
const bottomCtaEnabled = record['Bottom CTA Enabled'] === true;
```

- No fallback to `hasBrandedLayout(record)`.
- No fallback to the legacy `'Get In Touch Enabled'` field.
- A record must explicitly set both fields to `true` to show the CTA.

If a brand reports "I clicked Hide but the form still shows", check the
Airtable record fields directly — Hide in the dashboard writes `false`
on Save & Publish, but if the user toggled Hide without saving, the
field stays undefined and the form stays hidden (correct behaviour
under the new strict-equality rule).

## Deploy

```
cd /Users/OBello/Claude/Projects/outra-segments-site
vercel --prod --yes
```

After deploy, verify the new deployment aliased to outra.vip before
calling anything "live" — confirm with a curl to a known page like
`https://outra.vip/signature-segments/EON`.

The static `deploy-live.sh` script only copies prebuilt brand pages
(open-partners, dentsu, mercedes-amg-f1 etc.) into the ecc-outra-event
repo — it does NOT deploy the dynamic Airtable-backed renderer. The
renderer ships via Vercel only.
