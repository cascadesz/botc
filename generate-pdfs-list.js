#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const scriptDir = path.join(__dirname, 'script');
const outputPath = path.join(scriptDir, 'pdfs.json');

function generate() {
  if (!fs.existsSync(scriptDir)) {
    console.error(`Script directory not found: ${scriptDir}`);
    return;
  }

  const files = fs.readdirSync(scriptDir)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .sort(); // Sort alphabetically

  const content = { files };
  fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));

  console.log(`✅ Generated pdfs.json with ${files.length} PDF(s):`);
  files.forEach(f => console.log(`   - ${f}`));
}

// Basic CLI: run once, or use --watch to regenerate on changes
const args = process.argv.slice(2);
const watch = args.includes('--watch');

generate();

if (watch) {
  console.log('👀 Watching script/ for changes...');
  let timeout = null;
  fs.watch(scriptDir, { persistent: true }, (eventType, filename) => {
    // Ignore changes to the manifest file itself to avoid an infinite loop
    if (filename && String(filename).toLowerCase() === 'pdfs.json') return;

    // Debounce rapid events
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        console.log(`Change detected (${eventType}) -> regenerating pdfs.json`);
        generate();
      } catch (err) {
        console.error('Error regenerating pdfs.json:', err);
      }
    }, 150);
  });
}
