import { test as base, expect, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { places, routeResponse, type RouteStop } from '../fixtures/course';
export const test = base.extend<{ network: { requests: RouteStop[][]; walking?: (route: Route, stops: RouteStop[]) => Promise<void> } }>({
  network: [async ({ context }, use, testInfo) => {
    const unexpected: string[] = [];
    const network: { requests: RouteStop[][]; walking?: (route: Route, stops: RouteStop[]) => Promise<void> } = { requests: [] };
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:43100') {
        unexpected.push(url.origin); return route.abort('blockedbyclient');
      }
      if (url.pathname === '/api/contents' && route.request().method() === 'GET') {
        return route.fulfill({ json: { data: [{ id: 9000, title: '가짜 작품' }] } });
      }
      if (url.pathname === '/api/contents/9000/places' && route.request().method() === 'GET') {
        return route.fulfill({ json: { data: [places[0], places[3], places[3]].map(places => ({
          relation_type: 'FILMING_LOCATION', verification_status: 'VERIFIED', verified_fact: null, places,
        })) } });
      }
      if (url.pathname === '/api/routes/walking' && route.request().method() === 'POST') {
        const { stops } = route.request().postDataJSON() as { stops: RouteStop[] };
        network.requests.push(stops);
        if (network.walking) return network.walking(route, stops);
        return route.fulfill({ json: routeResponse(stops) });
      }
      if (url.pathname.startsWith('/api/')) {
        unexpected.push(url.pathname); return route.abort('blockedbyclient');
      }
      await route.continue();
    });
    await use(network);
    const serverAudit = readFileSync('.e2e-network.jsonl', 'utf8');
    await testInfo.attach('network-audit', { body: JSON.stringify({ unexpected, serverAudit, mockedRouteRequests: network.requests.length }), contentType: 'application/json' });
    expect(unexpected, 'Unexpected browser requests were blocked').toEqual([]);
    expect(serverAudit, 'Unexpected server HTTP requests were blocked').toBe('');
  }, { auto: true }],
});
export { expect };
export const stopNames = (page: Page) => page.getByRole('region', { name: '이 순서로 만나보세요' }).getByRole('heading', { level: 3 });
export async function latestCourse(page: Page, names = ['테스트 B', '테스트 A', '테스트 C']) {
  await expect(stopNames(page)).toHaveText(names);
  const summary = page.getByRole('region', { name: '코스 요약' });
  await expect(summary.locator('dl > div').filter({ has: page.getByText('도보 시간', { exact: true }) }).locator('dd')).toHaveText('14분');
  await expect(summary.locator('dl > div').filter({ has: page.getByText('이동 거리', { exact: true }) }).locator('dd')).toHaveText('1km');
  // These labels require a matching non-fallback segment for each current adjacent pair.
  await expect(page.getByRole('region', { name: '이 순서로 만나보세요' }).getByText('실제 도보 경로 기준', { exact: true })).toHaveCount(2);
}
