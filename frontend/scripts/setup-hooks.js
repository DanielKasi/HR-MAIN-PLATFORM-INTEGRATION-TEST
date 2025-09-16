#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  const gitRoot = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
    cwd: __dirname
  }).trim();

  const frontendDir = path.resolve(__dirname, '..');
  const huskyPath = path.relative(gitRoot, path.join(frontendDir, '.husky'));

  execSync(`git config core.hooksPath "${huskyPath}"`, {
    cwd: gitRoot,
    stdio: 'inherit'
  });

  console.log('✅ Git hooks configured successfully!');
  console.log(`🔧 Hooks path set to: ${huskyPath}`);

} catch (error) {
  console.log('⚠️  Could not configure git hooks automatically.');
  console.log('💡 Please run: git config core.hooksPath frontend/.husky');
  process.exit(0);
}