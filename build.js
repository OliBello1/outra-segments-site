#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMPLATE_PATH = path.join(SRC_DIR, 'template.html');

// Read the master template
const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Discover all page configs
const pageFiles = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.js'));

console.log(`Building ${pageFiles.length} page(s)...`);

pageFiles.forEach(file => {
  const config = require(path.join(PAGES_DIR, file));
  let html = template;

  // Replace each {{PLACEHOLDER}} with its config value
  html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in config) return config[key];
    console.warn(`  Warning: placeholder ${match} has no value in ${file}, using empty string`);
    return '';
  });

  const outputPath = path.join(PUBLIC_DIR, config.outputFile);
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`  -> ${config.outputFile} (${(html.length / 1024).toFixed(0)} KB)`);
});

console.log('Build complete.');
