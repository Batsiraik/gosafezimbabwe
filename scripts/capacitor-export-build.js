/**
 * Build Next.js static export for Capacitor (offline-first app).
 * Next.js static export cannot include API routes, so we temporarily move
 * src/app/api out of the way during the build, then restore it.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const appDir = path.join(__dirname, '..', 'src', 'app');
const apiDir = path.join(appDir, 'api');
const apiHiddenDir = path.join(appDir, '_api_hidden_for_export');

function restore() {
  if (fs.existsSync(apiHiddenDir)) {
    fs.renameSync(apiHiddenDir, apiDir);
    console.log('Restored src/app/api');
  }
}

try {
  if (!fs.existsSync(apiDir)) {
    console.error('src/app/api not found');
    process.exit(1);
  }
  fs.renameSync(apiDir, apiHiddenDir);
  console.log('Temporarily moved src/app/api for static export');

  const result = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, BUILD_FOR_CAPACITOR: '1' },
  });

  restore();
  process.exit(result.status);
} catch (err) {
  console.error(err);
  restore();
  process.exit(1);
}
