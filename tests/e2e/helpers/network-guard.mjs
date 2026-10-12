// Loaded only by the E2E server, including Next.js child processes.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
function check(input) {
  const url = new URL(typeof input === 'string' ? input : input.url || input.href);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  const font = process.env.FAVEWAY_E2E_BUILD === '1' &&
    ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
  if (local || font) return;
  fs.appendFileSync(process.env.FAVEWAY_E2E_AUDIT, JSON.stringify({ blocked: url.origin }) + '\n');
  throw new Error('E2E blocked external server request: ' + url.origin);
}
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, options) {
  check(input);
  return originalFetch.call(this, input, options);
};
for (const [transport, protocol] of [[http, 'http:'], [https, 'https:']]) {
  for (const method of ['request', 'get']) {
    const original = transport[method];
    transport[method] = function (input, ...args) {
      check(typeof input === 'string' || input instanceof URL ? input :
        `${input.protocol || protocol}//${input.hostname || input.host || 'localhost'}`);
      return original.call(this, input, ...args);
    };
  }
}
syncBuiltinESMExports();
