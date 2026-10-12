import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, dbFactory, responses } from './docent-boundaries';

type Mode = 'place' | 'course';
export function docentRouteSuite(mode: Mode, POST: (request: NextRequest) => Promise<Response>) {
  const stop = { contentId: 9000, placeId: 9101, order: 1 };
  const valid = () => mode === 'place' ? { contentId: 9000, placeId: 9101, language: 'ko' } : { stops: [stop], language: 'ko' };
  const request = (body: unknown, raw = false) => new NextRequest(`http://localhost/api/docents/${mode}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: raw ? String(body) : JSON.stringify(body),
  });
  async function errorResponse(body: unknown, status: number, code: string, raw = false) {
    const result = await POST(request(body, raw));
    expect(result.status).toBe(status);
    expect(await result.json()).toMatchObject({ code, message: expect.any(String) });
  }
  const noGeneration = () => expect(responses).not.toHaveBeenCalled();

  describe(`${mode} POST with real context, prompt and output validation`, () => {
    it('returns 503 before DB or OpenAI when disabled', async () => {
      vi.stubEnv('ENABLE_OPENAI_DOCENT', 'false');
      await errorResponse(valid(), 503, 'DOCENT_NOT_ENABLED');
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
    it.each([null, true, false, 1, 'text', [], {}].map(body => ({ body })))('rejects JSON $body without DB or OpenAI', async ({ body }) => {
      await errorResponse(body, 400, 'INVALID_DOCENT_REQUEST');
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
    it('rejects malformed JSON without downstream calls', async () => {
      await errorResponse('{', 400, 'INVALID_DOCENT_REQUEST', true);
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
    it.each(['ja', null])('rejects unsupported language %j', async language => {
      await errorResponse({ ...valid(), language }, 400, 'INVALID_DOCENT_REQUEST');
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
    it.each([0, -1, 1.5, '9000', Number.MAX_SAFE_INTEGER + 1])('rejects invalid ID %j', async contentId => {
      const body = mode === 'place' ? { ...valid(), contentId } : { ...valid(), stops: [{ ...stop, contentId }] };
      await errorResponse(body, 400, 'INVALID_DOCENT_REQUEST');
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
    it('returns 404 for a missing context without generation', async () => {
      db.tables.places = [];
      await errorResponse(valid(), 404, 'DOCENT_CONTEXT_NOT_FOUND'); noGeneration();
    });
    it('returns 422 for unverified facts without meaningful scenes', async () => {
      db.tables.scenes[0].description = ' \n ';
      db.tables.place_relations[0].verification_status = 'UNVERIFIED';
      await errorResponse(valid(), 422, 'DOCENT_CONTEXT_INSUFFICIENT'); noGeneration();
    });
    it.each(['scene only', 'fact only'])('generates with %s', async source => {
      if (source === 'scene only') db.tables.place_relations = [];
      else db.tables.scene_places = [];
      const result = await POST(request(valid()));
      expect(result.status).toBe(200);
      const { data } = await result.json();
      expect(data).toMatchObject({ type: mode, language: 'ko', title: '생성 제목', narration: '생성 본문' });
      expect(responses).toHaveBeenCalledTimes(1);
      const origin = mode === 'place' ? data.generatedFrom : data.generatedFrom.stops[0];
      expect(origin).toMatchObject({ sceneIds: source === 'scene only' ? [9201] : [], hasVerifiedFact: source === 'fact only' });
    });
    it('ignores client narrative data and uses server DB context', async () => {
      const injected = { title: 'CLIENT_ONLY', scenes: [{ description: 'CLIENT_ONLY' }], verifiedFact: 'CLIENT_ONLY', evidence: ['CLIENT_ONLY'] };
      const body = mode === 'place' ? { ...valid(), ...injected } : { ...valid(), ...injected, stops: [{ ...stop, ...injected }] };
      expect((await POST(request(body))).status).toBe(200);
      const input = responses.mock.calls[0][0].input;
      expect(input).not.toContain('CLIENT_ONLY');
      expect(input).toContain('DB 장소 A');
      expect(input).toContain('DB 작품');
      expect(input).toContain('DB 장면 설명');
      expect(input).toContain('DB 촬영 관계 사실');
      expect(input).not.toContain('다른 작품 장면');
    });
    it('maps a DB error to 500 without invoking OpenAI', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      db.errorTable = 'places';
      await errorResponse(valid(), 500, 'DOCENT_GENERATION_FAILED'); noGeneration();
    });
    it.each([429, 500])('maps SDK status %i to the existing 500 response', async status => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      responses.mockRejectedValue(Object.assign(new Error('Mock SDK error'), { status }));
      await errorResponse(valid(), 500, 'DOCENT_GENERATION_FAILED');
      expect(responses).toHaveBeenCalledTimes(1);
    });
    it.each(['{}', '{', '', '{"title":"t","narration":" "}'])('maps invalid generated output %j to 500', async output_text => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      responses.mockResolvedValue({ output_text });
      await errorResponse(valid(), 500, 'DOCENT_GENERATION_FAILED');
      expect(responses).toHaveBeenCalledTimes(1);
    });
  });

  if (mode === 'course') describe('Course-specific eligibility', () => {
    it('requires every context even if another stop has evidence', async () => {
      await errorResponse({ stops: [stop, { ...stop, placeId: 9999, order: 2 }], language: 'ko' }, 404, 'DOCENT_CONTEXT_NOT_FOUND');
      noGeneration();
    });
    it('sorts stops and allows an unsupported stop if another has narrative context', async () => {
      const result = await POST(request({ stops: [{ ...stop, placeId: 9102, order: 2 }, stop], language: 'en' }));
      expect(result.status).toBe(200);
      const input = JSON.parse(responses.mock.calls[0][0].input);
      expect(input.stops.map((item: { order: number }) => item.order)).toEqual([1, 2]);
      expect(input.stops.map((item: { place: { id: number } }) => item.place.id)).toEqual([9101, 9102]);
      expect(input.stops[1]).toMatchObject({ scenes: [], verifiedEvidence: [] });
      expect(responses.mock.calls[0][0].instructions).toContain('mention only its name and the work selected for that stop');
      expect(responses.mock.calls[0][0].instructions).toContain('natural English');
      const { data } = await result.json();
      expect(data.generatedFrom.stops.map((item: { hasVerifiedFact: boolean }) => item.hasVerifiedFact)).toEqual([true, false]);
    });
    it('rejects a whole course with no narrative context', async () => {
      db.tables.scene_places = [];
      db.tables.place_relations.forEach(row => { row.verification_status = 'UNVERIFIED'; });
      await errorResponse({ stops: [stop, { ...stop, placeId: 9102, order: 2 }], language: 'ko' }, 422, 'DOCENT_CONTEXT_INSUFFICIENT');
      noGeneration();
    });
    it.each([0, 11])('rejects %i stops before DB queries', async count => {
      await errorResponse({ stops: Array.from({ length: count }, (_, i) => ({ ...stop, order: i + 1 })), language: 'ko' }, 400, 'INVALID_DOCENT_REQUEST');
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
    it('accepts the upper limit of 10 valid stops', async () => {
      expect((await POST(request({ stops: Array.from({ length: 10 }, (_, i) => ({ ...stop, order: i + 1 })), language: 'ko' }))).status).toBe(200);
      expect(JSON.parse(responses.mock.calls[0][0].input).stops).toHaveLength(10);
    });
    it.each([null, { ...stop, order: 0 }, { ...stop, placeId: '9101' }])('rejects malformed stop %j', async invalid => {
      await errorResponse({ stops: [invalid], language: 'ko' }, 400, 'INVALID_DOCENT_REQUEST');
      expect(dbFactory).not.toHaveBeenCalled(); noGeneration();
    });
  });
}
