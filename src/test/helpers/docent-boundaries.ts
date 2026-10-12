import { afterEach, beforeEach, expect, vi } from 'vitest';
import http from 'node:http';
import https from 'node:https';
import { docentTables, type Row } from '../fixtures/docent';

const boundary = vi.hoisted(() => ({ db: vi.fn(), ai: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: boundary.db }));
vi.mock('@/lib/ai/openai', () => ({ createOpenAIClient: boundary.ai, getDocentModel: () => 'mock-docent-model' }));

export type Query = { table: string; columns: string; filters: Array<{ column: string; op: 'eq' | 'in'; value: unknown }> };
type Result = { data: Row | Row[] | null; error: { message: string } | null };
export class FakeDocentDb {
  tables = docentTables();
  queries: Query[] = [];
  errorTable: string | null = null;

  from(table: string) {
    if (!(table in this.tables)) throw new Error(`Unexpected table: ${table}`);
    const query: Query = { table, columns: '*', filters: [] };
    this.queries.push(query);
    let single = false;
    const execute = (): Result => {
      if (this.errorTable === table) return { data: null, error: { message: 'Mock database error' } };
      const rows = this.tables[table].filter(row => query.filters.every(filter =>
        filter.op === 'eq' ? row[filter.column] === filter.value : (filter.value as unknown[]).includes(row[filter.column]),
      )).map(row => query.columns === '*' ? { ...row } : Object.fromEntries(query.columns.split(',').map(key => [key, row[key]])));
      return { data: single ? rows[0] ?? null : rows, error: null };
    };
    const builder = {
      select(columns: string) { query.columns = columns; return builder; },
      eq(column: string, value: unknown) { query.filters.push({ column, op: 'eq', value }); return builder; },
      in(column: string, value: unknown[]) { query.filters.push({ column, op: 'in', value }); return builder; },
      maybeSingle() { single = true; return builder; },
      then<T = Result, E = never>(ok?: ((value: Result) => T | PromiseLike<T>) | null, fail?: ((reason: unknown) => E | PromiseLike<E>) | null): Promise<T | E> {
        return Promise.resolve(execute()).then(ok, fail);
      },
    };
    return builder;
  }
}

type AIRequest = { input: string; instructions: string; [key: string]: unknown };
export const responses = vi.fn<(request: AIRequest) => Promise<{ output_text?: string }>>();
export const dbFactory = boundary.db;
export let db: FakeDocentDb;
let networkAttempts: string[];

beforeEach(() => {
  db = new FakeDocentDb();
  boundary.db.mockReset().mockReturnValue(db);
  boundary.ai.mockReset().mockReturnValue({ responses: { create: responses } });
  responses.mockReset().mockResolvedValue({ output_text: JSON.stringify({ title: '생성 제목', narration: '생성 본문' }) });
  networkAttempts = [];
  const deny = (transport: string) => () => {
    networkAttempts.push(transport);
    throw new Error('Unexpected network request in Docent test');
  };
  vi.stubGlobal('fetch', vi.fn(deny('fetch')));
  for (const transport of [http, https]) {
    vi.spyOn(transport, 'request').mockImplementation(deny('http(s).request'));
    vi.spyOn(transport, 'get').mockImplementation(deny('http(s).get'));
  }
  vi.stubEnv('ENABLE_OPENAI_DOCENT', 'true');
  for (const key of ['OPENAI_API_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'TMAP_APP_KEY']) vi.stubEnv(key, '');
});

afterEach(() => {
  try {
    // Even if production catches a blocked request, the test must still fail.
    expect(networkAttempts, 'No real fetch or Node HTTP(S) call is allowed').toEqual([]);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
