import type { Page, Route } from '@playwright/test';
import { test, expect, stopNames } from './helpers/course-mocks';
import { courseUrl } from './fixtures/course';

const generated = { data: { title: 'Mock 도슨트 제목', narration: 'Mock 서버가 반환한 도슨트 본문입니다.' } };
type Mode = 'place' | 'course';
const expectedBody = (mode: Mode) => mode === 'place'
  ? { contentId: 9000, placeId: 9001, language: 'ko' }
  : { stops: [9001, 9002, 9003].map((placeId, index) => ({ contentId: 9000, placeId, order: index + 1 })), language: 'ko' };

async function openDialog(page: Page, mode: Mode) {
  await page.goto(courseUrl);
  // Wait for the course response before opening; it legitimately changes stop props.
  await expect(page.getByRole('status')).toContainText('실제 도보 경로 기준');
  if (mode === 'course') await page.getByRole('button', { name: '▶ 이 코스 이야기 듣기', exact: true }).click();
  else await page.getByRole('region', { name: '이 순서로 만나보세요' }).getByRole('article').first().getByRole('button', { name: '▶ 현장에서 도슨트 듣기', exact: true }).click();
  return page.getByRole('dialog');
}
async function intactCourse(page: Page) {
  await expect(stopNames(page)).toHaveText(['테스트 A', '테스트 B', '테스트 C']);
  await page.getByRole('button', { name: 'AI 도슨트 닫기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '브라우저 테스트', exact: true })).toBeVisible();
}

for (const mode of ['place', 'course'] as const) {
  test.describe(`${mode} DocentDialog`, () => {
    test('Loading → Success sends only IDs, order and language', async ({ page, network }) => {
      let pending: Route | undefined;
      network.docent = async (route, requestedMode) => {
        expect(requestedMode).toBe(mode);
        pending = route;
      };
      const dialog = await openDialog(page, mode);
      await expect(dialog.getByRole('status')).toContainText('AI 도슨트를 준비하고 있어요.');
      await expect.poll(() => network.docentRequests.length).toBe(1);
      expect(network.docentRequests).toEqual([{ mode, body: expectedBody(mode) }]);
      await pending!.fulfill({ json: generated });
      await expect(dialog.getByRole('heading', { name: generated.data.title })).toBeVisible();
      await expect(dialog.getByText(generated.data.narration, { exact: true })).toBeVisible();
      await expect(dialog.getByRole('status')).toHaveCount(0);
      await intactCourse(page);
    });

    test('insufficient context is Empty, with no retry', async ({ page, network }) => {
      network.docent = async route => { await route.fulfill({ status: 422, json: { code: 'DOCENT_CONTEXT_INSUFFICIENT', message: 'Mock insufficient context' } }); };
      const dialog = await openDialog(page, mode);
      await expect(dialog.getByText('아직 들려드릴 이야기가 충분하지 않아요.', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('alert')).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
      await intactCourse(page);
    });

    for (const [status, code] of [[404, 'DOCENT_CONTEXT_NOT_FOUND'], [500, 'DOCENT_GENERATION_FAILED'], [503, 'DOCENT_NOT_ENABLED']] as const) {
      test(`${status} is Error with Retry and leaves Course intact`, async ({ page, network }) => {
        network.docent = async route => { await route.fulfill({ status, json: { code, message: `Mock error ${status}` } }); };
        const dialog = await openDialog(page, mode);
        await expect(dialog.getByRole('alert')).toContainText(`Mock error ${status}`);
        await expect(dialog.getByRole('button', { name: '다시 시도' })).toBeVisible();
        await intactCourse(page);
      });
    }

    test('network failure is Error and leaves Course intact', async ({ page, network }) => {
      network.docent = async route => { await route.abort('failed'); };
      const dialog = await openDialog(page, mode);
      await expect(dialog.getByRole('alert')).toContainText('도슨트를 준비하지 못했어요.');
      await expect(dialog.getByRole('button', { name: '다시 시도' })).toBeVisible();
      await intactCourse(page);
    });

    test('Error → Retry → Loading → Success repeats the same minimal request', async ({ page, network }) => {
      let retry: Route | undefined;
      network.docent = async route => {
        if (network.docentRequests.length === 1) await route.fulfill({ status: 500, json: { message: 'Mock first failure' } });
        else retry = route;
      };
      const dialog = await openDialog(page, mode);
      await expect(dialog.getByRole('alert')).toContainText('Mock first failure');
      await dialog.getByRole('button', { name: '다시 시도' }).click();
      await expect(dialog.getByRole('status')).toContainText('AI 도슨트를 준비하고 있어요.');
      await expect(dialog.getByRole('alert')).toHaveCount(0);
      await expect.poll(() => network.docentRequests.length).toBe(2);
      expect(network.docentRequests).toEqual([{ mode, body: expectedBody(mode) }, { mode, body: expectedBody(mode) }]);
      await retry!.fulfill({ json: generated });
      await expect(dialog.getByRole('heading', { name: generated.data.title })).toBeVisible();
      await intactCourse(page);
    });

    for (const [label, body] of [['missing narration', '{"data":{"title":"only title"}}'], ['invalid JSON', '{']] as const) {
      test(`malformed response: ${label}`, async ({ page, network }) => {
        network.docent = async route => { await route.fulfill({ status: 200, contentType: 'application/json', body }); };
        const dialog = await openDialog(page, mode);
        await expect(dialog.getByRole('alert')).toContainText('응답을 확인하지 못했습니다.');
        await expect(dialog.getByRole('button', { name: '다시 시도' })).toBeVisible();
        await intactCourse(page);
      });
    }
  });
}
