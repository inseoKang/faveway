import { describe, expect, it } from 'vitest';
import { db } from '@/test/helpers/docent-boundaries';
import { docentContext } from '@/test/fixtures/docent';
import { hasEnoughPlaceDocentContext, loadPlaceDocentContext } from './docent-context';

describe('server Docent context', () => {
  it.each([
    ['PUBLIC_DATA', ' fact ', 'TEST', ['fact']],
    ['PUBLIC_DATA', '', 'TEST', []],
    ['PUBLIC_DATA', ' \n ', 'TEST', []],
    ['PUBLIC_DATA', null, 'TEST', []],
    ['UNVERIFIED', 'fact', 'TEST', []],
    ['VERIFIED', 'fact', 'TEST', []],
    [null, 'fact', 'PUBLIC_DATA', []],
    ['UNVERIFIED', 'fact', 'PUBLIC_DATA', []],
  ])('filters status=%s fact=%j source=%s', async (status, fact, source, expected) => {
    db.tables.place_relations = [{ content_id: 9000, place_id: 9101, verification_status: status, verified_fact: fact, source_type: source }];
    const context = await loadPlaceDocentContext(9000, 9101);
    expect(context?.evidence.map(item => item.verifiedFact)).toEqual(expected);
    expect(context?.scenes[0].description).toBe('DB 장면 설명');
  });

  it('queries exact IDs and excludes foreign-work scenes and evidence', async () => {
    db.tables.place_relations.push({ content_id: 9009, place_id: 9101, verification_status: 'PUBLIC_DATA', verified_fact: '외부 작품 근거' });
    const context = await loadPlaceDocentContext(9000, 9101);
    expect(context?.scenes.map(scene => scene.id)).toEqual([9201]);
    expect(context?.scenes[0].actors).toEqual([{ id: 9301, name: '가짜 배우' }]);
    expect(context?.evidence.map(item => item.verifiedFact)).toEqual(['DB 촬영 관계 사실']);
    const filters = (table: string) => db.queries.find(query => query.table === table)?.filters;
    expect(filters('places')).toEqual([{ column: 'id', op: 'eq', value: 9101 }]);
    expect(filters('contents')).toEqual([{ column: 'id', op: 'eq', value: 9000 }]);
    expect(filters('scene_places')).toEqual([{ column: 'place_id', op: 'eq', value: 9101 }]);
    expect(filters('place_relations')).toEqual([{ column: 'content_id', op: 'eq', value: 9000 }, { column: 'place_id', op: 'eq', value: 9101 }]);
    expect(filters('scenes')).toEqual([{ column: 'content_id', op: 'eq', value: 9000 }, { column: 'id', op: 'in', value: [9201, 9299] }]);
  });

  it.each(['missing place', 'inactive place', 'missing content', 'no relation'])('returns null for %s', async reason => {
    if (reason === 'missing place') db.tables.places = [];
    if (reason === 'inactive place') db.tables.places[0].is_active = false;
    if (reason === 'missing content') db.tables.contents = [];
    if (reason === 'no relation') { db.tables.scene_places = []; db.tables.place_relations = []; }
    expect(await loadPlaceDocentContext(9000, 9101)).toBeNull();
  });

  it.each(['places', 'contents', 'scene_places', 'place_relations', 'scenes', 'scene_actors', 'actors'])('propagates %s query errors', async table => {
    db.errorTable = table;
    await expect(loadPlaceDocentContext(9000, 9101)).rejects.toThrow();
  });
});

describe('Place narrative eligibility', () => {
  it.each([
    ['scene only', '장면', '', true],
    ['fact only', '', '사실', true],
    ['neither', '', '', false],
    ['whitespace', ' \n ', '\t', false],
    ['null scene', null, '', false],
  ])('%s', (_label, description, fact, expected) => {
    const context = docentContext();
    context.scenes[0].description = description;
    context.evidence[0].verifiedFact = fact;
    expect(hasEnoughPlaceDocentContext(context)).toBe(expected);
  });
});
