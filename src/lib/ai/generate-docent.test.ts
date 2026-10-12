import { describe, expect, it } from 'vitest';
import { responses } from '@/test/helpers/docent-boundaries';
import { docentContext } from '@/test/fixtures/docent';
import { generateCourseDocent, generatePlaceDocent } from './generate-docent';

for (const mode of ['place', 'course'] as const) {
  describe(`${mode} generation`, () => {
    const generate = () => mode === 'place'
      ? generatePlaceDocent(docentContext(), 'ko')
      : generateCourseDocent([{ order: 1, context: docentContext() }], 'ko');
    it('uses Responses strict schema and trims valid strings', async () => {
      responses.mockResolvedValue({ output_text: '{"title":" 제목 ","narration":" 본문 \\n"}' });
      expect(await generate()).toEqual({ title: '제목', narration: '본문' });
      expect(responses).toHaveBeenCalledTimes(1);
      expect(responses.mock.calls[0][0]).toMatchObject({
        model: 'mock-docent-model', reasoning: { effort: 'low' }, store: false,
        max_output_tokens: mode === 'place' ? 700 : 1200,
        instructions: expect.stringContaining('natural Korean'),
        text: { format: { type: 'json_schema', name: `faveway_${mode}_docent`, strict: true,
          schema: { type: 'object', properties: { title: { type: 'string' }, narration: { type: 'string' } }, required: ['title', 'narration'], additionalProperties: false },
        } },
      });
      const input = JSON.parse(responses.mock.calls[0][0].input);
      expect(mode === 'place' ? input.verifiedEvidence : input.stops[0].verifiedEvidence).toEqual(docentContext().evidence);
    });
    it.each([
      '{}', '{"title":"t"}', '{"narration":"n"}',
      '{"title":1,"narration":"n"}', '{"title":"t","narration":[]}',
      '{"title":" ","narration":"n"}', '{"title":"t","narration":" \\n"}',
      '{', 'null', '[]',
    ])('rejects malformed output %s', async output_text => {
      responses.mockResolvedValue({ output_text });
      await expect(generate()).rejects.toThrow();
    });
    it.each([undefined, '', ' \n '])('rejects empty output %j', async output_text => {
      responses.mockResolvedValue({ output_text });
      await expect(generate()).rejects.toThrow(/empty/);
    });
    it('propagates SDK errors', async () => {
      const error = new Error('Mock SDK failure');
      responses.mockRejectedValue(error);
      await expect(generate()).rejects.toBe(error);
    });
  });
}
