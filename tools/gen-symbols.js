#!/usr/bin/env node
/*
 * gen-symbols.js — regenerate SYMBOLS.md, the top-level navigation index for
 * the large shared microsite renderer files.
 *
 * WHY: microsites like /signature-segments/Loaf have NO file on disk. They are
 * rendered on demand: vercel.json's catch-all sends /signature-segments/:brand
 * to api/render.js, which looks the slug up in the Airtable "Branded Pages"
 * table and renders it through api/_render-helper.js + builder-template.html.
 *
 * So "edit the Loaf page" really means "edit ~16,600 lines of shared code":
 *   api/_render-helper.js   ~4,000 lines  (42 top-level builders)
 *   builder-template.html  ~12,600 lines  (63% of it one <style> block)
 *
 * Reading those whole, or cold-grepping them, burns the context window. This
 * index gives every top-level symbol, block boundary, markup id and CSS rule a
 * line number, so you can jump straight to a narrow offset/limit Read.
 *
 * WHEN TO RUN: after any edit to api/*.js or the builder templates.
 *
 * USAGE:  node tools/gen-symbols.js
 *   Run from the outra-segments-site repo root. Writes ./SYMBOLS.md.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "SYMBOLS.md");

// ---------------------------------------------------------------------------
// JS: top-level declarations only. Every pattern is anchored at column 0 (^ with
// no leading whitespace) so nested/indented declarations are skipped.
// ---------------------------------------------------------------------------
const JS_PATTERNS = [
  { re: /^(async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/,                                          name: m => m[2], kind: "fn"    },
  { re: /^(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(async\s*)?(\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/,  name: m => m[2], kind: "fn"    },
  { re: /^(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(async\s+)?function/,                         name: m => m[2], kind: "fn"    },
  { re: /^(const|let|var)\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*[\[{]/,                                  name: m => m[2], kind: "data"  },
  { re: /^class\s+([A-Za-z0-9_$]+)/,                                                             name: m => m[1], kind: "class" },
  { re: /^module\.exports\s*=/,                                                                  name: () => "module.exports", kind: "exp" },
];

function extractJs(rel) {
  const lines = fs.readFileSync(path.join(ROOT, rel), "utf8").split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const p of JS_PATTERNS) {
      const m = lines[i].match(p.re);
      if (m) {
        hits.push({ line: i + 1, kind: p.kind, name: p.name(m) });
        break;
      }
    }
  }
  return { total: lines.length, hits };
}

// ---------------------------------------------------------------------------
// HTML: three separate indexes, because the templates have three distinct
// problems — you either want a block boundary, a markup landmark, or a CSS rule.
// ---------------------------------------------------------------------------
function extractHtml(rel) {
  const lines = fs.readFileSync(path.join(ROOT, rel), "utf8").split("\n");
  const blocks = [];   // <style>/<script> open+close line ranges
  const markup = [];   // id="..." landmarks outside style/script
  const css = [];      // column-0 CSS selectors, @media, @keyframes

  let mode = null;       // "style" | "script" | null
  let modeStart = 0;
  let mediaDepth = 0;    // >0 means we're inside an @media/@supports block

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;

    if (mode === null) {
      const open = line.match(/<(style|script)\b([^>]*)>/i);
      if (open) {
        // Skip self-closing / src-only one-liners (e.g. <script src="...">).
        const closesOnSameLine = new RegExp(`</${open[1]}>`, "i").test(line);
        if (closesOnSameLine) {
          const src = line.match(/src="([^"]+)"/);
          blocks.push({ line: n, kind: open[1] === "style" ? "style" : "script",
                        name: src ? `(inline, src=${src[1]})` : "(inline, 1 line)" });
        } else {
          mode = open[1].toLowerCase();
          modeStart = n;
          mediaDepth = 0;
        }
        continue;
      }
      // Markup landmark: any element carrying an id.
      const id = line.match(/<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\bid="([^"]+)"/);
      if (id) markup.push({ line: n, kind: id[1].toLowerCase().slice(0, 5), name: "#" + id[2] });
      continue;
    }

    // Inside a <style> or <script> block.
    const close = new RegExp(`</${mode}>`, "i");
    if (close.test(line)) {
      blocks.push({ line: modeStart, kind: mode, name: `lines ${modeStart}-${n} (${n - modeStart + 1} lines)` });
      mode = null;
      continue;
    }

    if (mode === "style") {
      // Track @media / @supports nesting so we only record top-level rules.
      const at = line.match(/^@(media|supports|keyframes|font-face|import|charset)\b/);
      if (at) {
        css.push({ line: n, kind: "@" + at[1].slice(0, 4), name: line.trim().replace(/\s*\{\s*$/, "") });
        if (/\{\s*$/.test(line) && at[1] !== "font-face") mediaDepth++;
        continue;
      }
      if (mediaDepth > 0) {
        // Only track the closing brace of the wrapper, at column 0.
        if (/^\}/.test(line)) mediaDepth--;
        continue;
      }
      // Column-0 selector ending in { — a top-level rule.
      const sel = line.match(/^([.#:a-zA-Z][^{}]*?)\s*\{\s*$/);
      if (sel) css.push({ line: n, kind: "css", name: sel[1].trim() });
    }
  }

  if (mode !== null) {
    blocks.push({ line: modeStart, kind: mode, name: `lines ${modeStart}-EOF (UNCLOSED)` });
  }

  return { total: lines.length, blocks, markup, css };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------
// api/*.js — the .endsWith('.js') filter naturally excludes _render-helper.js.bak.
const JS_FILES = fs
  .readdirSync(path.join(ROOT, "api"))
  .filter(f => f.endsWith(".js"))
  .sort()
  .map(f => "api/" + f);

const HTML_FILES = fs
  .readdirSync(ROOT)
  .filter(f => /^builder-template.*\.html$/.test(f))
  .sort();

if (JS_FILES.length === 0 && HTML_FILES.length === 0) {
  console.error("gen-symbols: nothing to index in " + ROOT);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const row = h => String(h.line).padStart(6) + "  " + h.kind.padEnd(6) + " " + h.name + "\n";

function table(title, hits) {
  if (hits.length === 0) return "";
  let s = `\n**${title}** (${hits.length})\n\n\`\`\`\n`;
  for (const h of hits) s += row(h);
  return s + "```\n";
}

let out =
  "# SYMBOLS — outra-segments-site shared renderer (AUTO-GENERATED)\n\n" +
  "> Generated by `tools/gen-symbols.js`. **Do not hand-edit.** Regenerate after any\n" +
  "> edit to `api/*.js` or the builder templates: `node tools/gen-symbols.js`.\n\n" +
  "Most microsites (Loaf, and anything not listed explicitly in `vercel.json`) have\n" +
  "**no file on disk** — they render on demand through `api/render.js` →\n" +
  "`api/_render-helper.js` → `builder-template.html`. Editing one means editing these\n" +
  "shared files. Find the symbol here first, then `Read` with a narrow\n" +
  "`offset`/`limit` window. Never read these files whole.\n\n" +
  "Format: `LINE  kind  name`\n";

for (const f of JS_FILES) {
  const { total, hits } = extractJs(f);
  out += `\n## ${f} (${total} lines, ${hits.length} symbols)\n\n\`\`\`\n`;
  for (const h of hits) out += row(h);
  out += "```\n";
}

for (const f of HTML_FILES) {
  const { total, blocks, markup, css } = extractHtml(f);
  out += `\n## ${f} (${total} lines)\n`;
  out += table("Block structure", blocks);
  out += table("Markup landmarks (ids)", markup);
  out += table("CSS rules (top-level selectors)", css);
}

fs.writeFileSync(OUT, out);
console.log(
  "gen-symbols: wrote " + path.relative(ROOT, OUT) +
  " for " + [...JS_FILES, ...HTML_FILES].join(", ")
);
