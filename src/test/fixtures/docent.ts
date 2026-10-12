import type { PlaceDocentContext } from '@/lib/ai/docent-types';

export type Row = Record<string, unknown>;
export function docentTables(): Record<string, Row[]> {
  return {
    places: [
      { id: 9101, name: 'DB 장소 A', address: '가짜 주소 A', is_active: true },
      { id: 9102, name: 'DB 장소 B', address: null, is_active: true },
    ],
    contents: [{ id: 9000, title: 'DB 작품' }, { id: 9009, title: '다른 작품' }],
    scene_places: [{ place_id: 9101, scene_id: 9201 }, { place_id: 9101, scene_id: 9299 }],
    scenes: [
      { id: 9201, content_id: 9000, episode: '2화', description: 'DB 장면 설명' },
      { id: 9299, content_id: 9009, episode: '1화', description: '다른 작품 장면' },
    ],
    scene_actors: [{ scene_id: 9201, actor_id: 9301 }],
    actors: [{ id: 9301, name: '가짜 배우' }],
    place_relations: [
      { content_id: 9000, place_id: 9101, verification_status: 'PUBLIC_DATA', source_type: 'TEST', verified_fact: ' DB 촬영 관계 사실 ' },
      { content_id: 9000, place_id: 9102, verification_status: 'UNVERIFIED', source_type: 'TEST', verified_fact: '사용하면 안 되는 사실' },
    ],
  };
}

export function docentContext(): PlaceDocentContext {
  return {
    content: { id: 9000, title: 'DB 작품' },
    place: { id: 9101, name: 'DB 장소 A', address: null },
    scenes: [{ id: 9201, episode: '2화', description: '별도 장면 기록', actors: [] }],
    evidence: [{ verificationStatus: 'PUBLIC_DATA', sourceType: 'TEST', verifiedFact: '공개 데이터 촬영 관계' }],
  };
}
