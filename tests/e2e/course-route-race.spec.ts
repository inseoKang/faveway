import type { Page } from '@playwright/test';
import { test, expect, latestCourse, stopNames } from './helpers/course-mocks';
import { courseUrl, storageKey, routeResponse, type RouteStop } from './fixtures/course';

test('native fetch cancels the superseded route request', async ({ page, network }) => {
  network.walking = async (route, stops) => {
    if (stops[0].placeId === 9001) return; // Held until the browser aborts it.
    await route.fulfill({ json: routeResponse(stops) });
  };
  await page.goto(courseUrl);
  await expect.poll(() => network.requests.length).toBe(1);
  const aborted = page.waitForEvent('requestfailed', request => request.url().endsWith('/api/routes/walking'));
  await page.getByRole('button', { name: '테스트 B을 이전 순서로 이동' }).click();
  expect((await aborted).failure()?.errorText).toMatch(/abort|cancel/i);
  await latestCourse(page);
  await expect(page.getByRole('status')).toContainText('실제 도보 경로 기준');
});

// Test-only transport: deliberately deliver completions despite AbortSignal.
// This exercises response guards which native fetch cancellation would hide.
type Pending = { stops: RouteStop[]; signal?: AbortSignal | null; resolve: (response: Response) => void; reject: (error: Error) => void };
declare global {
  interface Window { __routeRace: Pending[] }
}
async function installRaceTransport(page: Page) {
    await page.addInitScript(() => {
      const original = window.fetch.bind(window);
      window.__routeRace = [];
      window.fetch = (input, init) => {
        if (typeof input === 'string' && input === '/api/routes/walking') {
          return new Promise<Response>((resolve, reject) => {
            const pending = { stops: JSON.parse(String(init?.body)).stops, signal: init?.signal, resolve, reject };
            window.__routeRace.push(pending);
          });
        }
        return original(input, init);
      };
    });
}
for (const outcome of ['success', 'http-error', 'network-error'] as const) {
  test(`late ${outcome} cannot overwrite the latest course or route status`, async ({ page }) => {
    await installRaceTransport(page);
    await page.goto(courseUrl);
    await expect.poll(() => page.evaluate(() => window.__routeRace.length)).toBe(1);
    await page.getByRole('button', { name: '테스트 B을 이전 순서로 이동' }).click();
    await expect.poll(() => page.evaluate(() => window.__routeRace.length)).toBe(2);
    expect(await page.evaluate(() => window.__routeRace[0].signal?.aborted)).toBe(true);
    const stops = await page.evaluate(() => window.__routeRace[1].stops);
    expect(stops.map(stop => stop.placeId)).toEqual([9002, 9001, 9003]);
    await page.evaluate(body => window.__routeRace[1].resolve(new Response(JSON.stringify(body))), routeResponse(stops));
    await latestCourse(page);
    await expect(page.getByRole('status')).toContainText('실제 도보 경로 기준');
    const oldStops = await page.evaluate(() => window.__routeRace[0].stops);
    await page.evaluate(({ outcome, body }) => {
      const pending = window.__routeRace[0];
      if (outcome === 'network-error') pending.reject(new TypeError('Simulated network failure'));
      else pending.resolve(new Response(JSON.stringify(body), { status: outcome === 'success' ? 200 : 500 }));
      // Flush promise handlers and give React a rendering opportunity.
      return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }, { outcome, body: routeResponse(oldStops, 30) });
    await latestCourse(page);
    await expect(page.getByRole('status')).toContainText('실제 도보 경로 기준');
    await expect(page.getByText('현재 예상 경로를 사용하고 있어요.', { exact: true })).toHaveCount(0);
  });
}

for (const outcome of ['http-error', 'network-error'] as const) {
  test(`latest ${outcome} preserves edits and uses Haversine fallback`, async ({ page, network }) => {
    network.walking = async (route, stops) => {
      if (stops[0].placeId === 9001) {
        await route.fulfill({ json: routeResponse(stops) });
      } else if (outcome === 'http-error') {
        await route.fulfill({ status: 500, json: { message: 'Mock HTTP failure' } });
      } else {
        await route.abort('failed');
      }
    };
    await page.goto(courseUrl);
    await expect(page.getByRole('status')).toContainText('실제 도보 경로 기준');
    await page.getByRole('button', { name: '테스트 B을 이전 순서로 이동' }).click();
    await expect(page.getByRole('status')).toContainText('현재 예상 경로를 사용하고 있어요.');
    await expect(stopNames(page)).toHaveText(['테스트 B', '테스트 A', '테스트 C']);
    const summary = page.getByRole('region', { name: '코스 요약' });
    // Fixed fixture: B→A is ~88m and A→C is ~176m; rounded distances 0.09 + 0.18.
    await expect(summary.locator('dl > div').filter({ has: page.getByText('도보 시간', { exact: true }) }).locator('dd')).toHaveText('6분');
    await expect(summary.locator('dl > div').filter({ has: page.getByText('이동 거리', { exact: true }) }).locator('dd')).toHaveText('0.27km');
    await expect(page.getByRole('region', { name: '이 순서로 만나보세요' }).getByText('직선거리 기반 예상치', { exact: true })).toHaveCount(2);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stops.map((stop: { placeId: number }) => stop.placeId), storageKey)).toEqual([9002, 9001, 9003]);
  });
}

test('consecutive edits keep the last route despite older mixed completions', async ({ page }) => {
  await installRaceTransport(page);
  await page.goto(courseUrl);
  await expect.poll(() => page.evaluate(() => window.__routeRace.length)).toBe(1);
  for (const [index, name] of ['테스트 B', '테스트 C', '테스트 C'].entries()) {
    await page.getByRole('button', { name: `${name}을 이전 순서로 이동` }).click();
    await expect.poll(() => page.evaluate(() => window.__routeRace.length)).toBe(index + 2);
  }
  expect(await page.evaluate(() => window.__routeRace.slice(0, 3).every(request => request.signal?.aborted))).toBe(true);
  const stops = await page.evaluate(() => window.__routeRace[3].stops);
  expect(stops.map(stop => stop.placeId)).toEqual([9003, 9002, 9001]);
  await page.evaluate(body => window.__routeRace[3].resolve(new Response(JSON.stringify(body))), routeResponse(stops));
  await latestCourse(page, ['테스트 C', '테스트 B', '테스트 A']);
  for (const index of [1, 0, 2]) {
    const oldStops = await page.evaluate(index => window.__routeRace[index].stops, index);
    await page.evaluate(({ index, body }) => {
      const pending = window.__routeRace[index];
      if (index === 2) pending.reject(new TypeError('Mock old network failure'));
      else pending.resolve(new Response(JSON.stringify(body), { status: index === 0 ? 500 : 200 }));
      return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }, { index, body: routeResponse(oldStops, 30) });
    await latestCourse(page, ['테스트 C', '테스트 B', '테스트 A']);
    await expect(page.getByRole('status')).toContainText('실제 도보 경로 기준');
  }
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stops.map((stop: { placeId: number }) => stop.placeId), storageKey)).toEqual([9003, 9002, 9001]);
});
