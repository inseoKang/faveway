import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
if (process.version !== 'v24.21.0') throw new Error('Use Node.js 24.21.0 (nvm use).');
const audit = resolve('.e2e-network.jsonl');
writeFileSync(audit, '');
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SECRET_KEY: '',
  TMAP_APP_KEY: '', OPENAI_API_KEY: '', ENABLE_OPENAI_DOCENT: 'false',
  NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY: '',
  FAVEWAY_E2E_AUDIT: audit,
  NODE_OPTIONS: `--import=${JSON.stringify(resolve('tests/e2e/helpers/network-guard.mjs'))}`,
};
let child;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { child?.kill(signal); });
}
async function run(args, build = false) {
  return new Promise((resolveCode, reject) => {
    child = spawn(build ? 'npm' : process.execPath, build ? ['run', 'build'] : ['node_modules/next/dist/bin/next', ...args], {
      stdio: 'inherit', env: { ...env, FAVEWAY_E2E_BUILD: build ? '1' : '0' },
    });
    child.on('error', reject);
    child.on('exit', code => resolveCode(code ?? 1));
  });
}
const built = await run(['build'], true);
if (built !== 0) process.exit(built);
process.exit(await run(['start', '--hostname', '127.0.0.1', '--port', '43100']));
