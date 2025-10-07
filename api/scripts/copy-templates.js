#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../src/templates');
const targetDir = path.resolve(__dirname, '../dist/templates');

function copyTemplates() {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    fs.copyFileSync(sourcePath, targetPath);
  }
}

try {
  copyTemplates();
  console.log('[build] Templates copied to dist/templates');
} catch (error) {
  console.error('[build] Failed to copy templates:', error);
  process.exitCode = 1;
}
