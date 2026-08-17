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

## Unified renderer — proposal sections leaking onto overview pages

File: `api/_render-helper.js`, `renderUnifiedHtml` (Steps 4 & 5).

Symptom: an `overview` microsite (e.g. Volkswagen) rendered fine in the
dashboard preview but the LIVE page showed "random stuff" — full proposal
sections (How Propensity to Buy Works, Cala ad mockups, propensity-map
video, etc.). Preview ≠ live is ALWAYS a data problem (both routes call the
same `renderHtml`); here the saved Airtable `Section Order` still listed
stale proposal IDs.

Root cause: `renderUnifiedHtml` composes a page from both legacy renderers,
then lifts "alien" SEC blocks from the non-shell template onto the shell.
- Step 4 lifted EVERY alien block, incl. proposal-only sections.
- Step 5's auto-hide only hid sections ABSENT from `Section Order`, so IDs
  the user's stale Section Order still listed were NOT hidden → they rendered.

Fix (2026-07-09): the visual shell (`Type`) is the intent signal. On an
overview shell (`visualStyle !== 'proposal'`):
- Step 4 filter: never lift `PROPOSAL_ONLY_SECTION_IDS`
  (g-video, g-how, g-commercials, g-oppsummary, g-crmseg, g-upstix, g-aiq,
  g-patch).
- Step 5 backstop: force-hide any of those still present, even if listed
  in `Section Order`.

A unified record that genuinely wants proposal sections must set
`Type='proposal'` (flips the shell). Overview-only bespoke sections
(`g-aji-case`, `g-commercials-beagle`) are NOT in the set, so they still
lift correctly. Don't add them to `PROPOSAL_ONLY_SECTION_IDS`.

## Header co-brand lockup — per-brand baseline nudge

File: `api/_render-helper.js`, inside `buildPropensitySectionHtml(record)`
(function opens ~line 755, scope runs to ~1002).

**Scope gotcha:** all the slug-gated header CSS (`headerLogoPillCss`,
`headerLogoNudgeCss`, `propensityLogoSlugCss`) lives inside
`buildPropensitySectionHtml`, so its `<style>` block ONLY ships on pages that
render the propensity section. Confirm the target slug renders it before
using this seam. There is no generic head/extra-style injection point
(grep for `HEAD_EXTRA|EXTRA_STYLE` returns nothing).

**Why logos look misaligned:** `.logo` uses `align-items: flex-end` and
`.logo-partner-img` adds `align-self: flex-end`, so children align by the
BOTTOM OF THE IMAGE BOX, not the typographic baseline. A wordmark with a
descender (the "g" in Bed Kingdom) leaves dead space under the letterforms
and reads as floating. Fix = negative `margin-bottom` on
`.logo-partner-img` so the baseline lines up and the descender overhangs.

`buildHeaderLogoHtml` (~line 437) emits inline
`style="height:38px;width:auto;display:block;object-fit:contain;"` — it does
NOT set `margin-bottom`, so a plain stylesheet rule wins with no
`!important`. Don't inline the nudge instead: it can't be media-queried.

**Correct breakpoints for `.logo-partner-img` (in `builder-template.html`):**

- base `height: 28px` (line ~466); inline style overrides to 38px
- `@media (max-width: 600px)` opens 3963 → `height: 26px !important` (3984)
- `@media (max-width: 380px)` opens 4370 → `height: 22px !important` (4380)

NOT 980px — the first 980px query is at 5347. Older notes had this wrong.
`headerLogoPillCss` already uses the same 600/599 boundary.

Shipped values for BedKingdom (`headerLogoNudgeCss`, commit `752aeec`):
-8px at `min-width: 600px`, -5px at `max-width: 599px`, -4px at
`max-width: 380px`.

`headerLogoPillCss` is gated to `slug === 'MatchesFashion'` only — its
`height: … !important` does not leak to other brands.

**Sandbox limit:** the Vercel Blob host
(`bn8qaseh6ryke25g.public.blob.vercel-storage.com`) is NOT in the network
allowlist — `curl` returns `(56) CONNECT tunnel failed, response 403`. You
cannot measure a processed logo PNG from here, so nudge values are estimates
and must be visually confirmed by the user.

Related: `outra-api/api/branded-pages-process-logo.js` is supposed to trim
whitespace at upload time, but `sharp` is lazily required in a try/catch and
set to `null` on failure (`if (!sharp || !buffer) return buffer;`). If the
native binding is missing on Vercel the trim silently no-ops and the raw
upload's padding survives — a likely cause of unexpected logo whitespace.

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

The repo lives at `/Users/OBello/ClaudeCode/outra-segments-site` (NOT
`/Users/OBello/Claude/Projects/...` — that path does not exist).

Deploy path is **Vercel git integration**: commit + `git push origin main`
and Vercel auto-builds and aliases to outra.vip. The `vercel --prod` CLI
does NOT work from the sandbox (it needs network to `vercel.com`, which is
blocked, and its update-notifier can't write to `~/Library/Caches`).

```
cd /Users/OBello/ClaudeCode/outra-segments-site
git add <files> && git commit -F <msgfile> && git push origin main
```

Sandbox notes: heredocs are blocked (`operation not permitted`), so write
the commit message to a file via the Write tool and use `git commit -F`.

After push, verify the new deployment aliased to outra.vip before calling
anything "live" — confirm with a curl to a known page like
`https://outra.vip/signature-segments/EON`, and check the served byte
count / section markers changed as expected.

The static `deploy-live.sh` script only copies prebuilt brand pages
(open-partners, dentsu, mercedes-amg-f1 etc.) into the ecc-outra-event
repo — it does NOT deploy the dynamic Airtable-backed renderer. The
renderer ships via Vercel only.

## DIAGNOSTIC (2026-07-14) — RESOLVED 2026-08-12, kept for history
## outra.vip/signature-segments/:slug served by a DIFFERENT/OLDER deployment

**RESOLVED.** As of 2026-08-12 the `outra.vip` alias tracks Production
normally. Proof: commit `752aeec` (BedKingdom header nudge) pushed to `main`
changed the live BedKingdom payload 444,424 → 444,729 bytes, and the three
new `.logo .logo-partner-img { margin-bottom: … }` rules are present in the
served HTML (lines 8052/8055/8058). Do NOT go hunting for a Vercel domain
pin. Everything below is the original 2026-07-14 write-up.

Symptom: hid First-Party on SkyBroadband. Preview correct, dashboard save
path fixed (outra-dashboard `de02a5b`), and the Airtable record
`recJ0UcxsAGvVVnDD` patched directly (`Section Hidden=["g-firstparty"]`,
`Section Order=["g-household"]`, Status=Published). BUT the live page
`outra.vip/signature-segments/SkyBroadband` still shows First-Party and
still HIDES Household — the exact INVERSE of the current record (i.e. the
pre-edit state).

Proof it is NOT a code/data bug:
- Running this repo's `renderHtml(record)` locally against the exact record
  strips the section cleanly (~401,784 chars, no `g-firstparty`,
  `applySectionStructure` removes the SEC_START..SEC_END block).
- `applySectionStructure` IS defined + called on the published path at HEAD
  `163cf8d` (= origin/main), which the Vercel dashboard shows as promoted
  Production/Ready.

Proof the live response is NOT this repo's `render.js`:
- Live success response header is bare `cache-control: public`. EVERY
  success path in this repo's `api/render.js` sets either
  `public, s-maxage=300, stale-while-revalidate=86400` (line 236) or
  `private, no-store`. `api/render.js` has only ONE commit in history
  (`9178c87`) and was born with the s-maxage header — a bare-`public`
  version never existed here.
- Live output still contains the raw `SEC_START:` / `FIRST_PARTY_START`
  comment markers unstripped → `applySectionStructure` never ran on the
  served response.
- `x-vercel-cache: MISS`, `age: 0` rule out CDN staleness — it's a fresh
  response from an OLD function build.

UPDATE (screenshots from user): `outra.vip` apex IS connected to the
`outra-segments-site` project (Domain → Connected Projects confirms it), and
the Vercel UI shows `163cf8d` as promoted Production/Ready. So it is NOT a
different project. Yet the served output is still the OLD function build
(unstripped `SEC_START:` markers, bare `cache-control: public`, 412318 bytes
vs the current renderer's 404060 bytes locally).

Forcing a rebuild did NOT fix it: pushed empty commit `72d534f` on top of
`163cf8d`; after the build the live page is byte-for-byte the same stale
output. This means the `outra.vip` production alias is PINNED to a specific
OLDER deployment (Vercel lets you assign a domain to a fixed deployment,
which overrides auto-promotion — new pushes build but the domain keeps
serving the pinned build).

Conclusion / fix (must be done in Vercel UI — vercel.com blocked from
sandbox): outra-segments-site → Settings → Domains → `outra.vip`. If it shows
"Assigned to a specific deployment" instead of "Production", re-point it to
Production (or redeploy the latest and click "Promote to Production" +
re-assign the domain). After that, re-verify: live SkyBroadband HTML must be
~404KB, contain NO `SEC_START:` markers, NO First-Party section, and DO show
Household.
