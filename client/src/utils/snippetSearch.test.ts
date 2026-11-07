import { Snippet, SearchQuery } from '../typescript/interfaces';
import { snippetSearch } from './snippetSearch';

const make = (overrides: Partial<Snippet>): Snippet => ({
  id: 1,
  title: '',
  description: '',
  language: 'text',
  code: '',
  docs: '',
  isPinned: false,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

const esp = make({
  id: 1,
  title: 'ESP32-S3 双 Type-C 接口区别与使用指南',
  description: 'Board guide',
  language: 'Markdown',
  code: 'void setup() {}',
  docs: 'Use the UART port for flashing',
  tags: ['esp32', 'hardware']
});

const react = make({
  id: 2,
  title: 'Card component',
  description: 'Reusable card',
  language: 'TypeScript',
  code: 'export const Card = () => null',
  docs: 'Wrap in a grid',
  tags: ['ui', 'react']
});

const snippets = [esp, react];
const q = (query: string, extra: Partial<SearchQuery> = {}): SearchQuery => ({
  query,
  tags: [],
  languages: [],
  ...extra
});
const ids = (list: Snippet[]) => list.map(s => s.id);

describe('snippetSearch', () => {
  it('returns nothing for an empty query without filters', () => {
    expect(snippetSearch(snippets, q(''), 'all', true)).toEqual([]);
  });

  it('default scope matches title and description only (case-insensitive)', () => {
    expect(ids(snippetSearch(snippets, q('CARD'), 'default', false))).toEqual([
      2
    ]);
    expect(ids(snippetSearch(snippets, q('board'), 'default', false))).toEqual([
      1
    ]);
    expect(snippetSearch(snippets, q('uart'), 'default', false)).toEqual([]);
  });

  it('strict mode requires the whole phrase', () => {
    expect(snippetSearch(snippets, q('s3 type'), 'title', false)).toEqual([]);
    expect(ids(snippetSearch(snippets, q('ESP32-S3'), 'title', false))).toEqual(
      [1]
    );
  });

  it('lazy mode matches tokens in any order and position', () => {
    expect(ids(snippetSearch(snippets, q('s3 type'), 'title', true))).toEqual([
      1
    ]);
    expect(ids(snippetSearch(snippets, q('type s3'), 'title', true))).toEqual([
      1
    ]);
    expect(snippetSearch(snippets, q('s3 card'), 'title', true)).toEqual([]);
  });

  it('lazy mode matches CJK text and tolerates extra whitespace', () => {
    expect(ids(snippetSearch(snippets, q('  接口   指南 '), 'title', true))).toEqual(
      [1]
    );
  });

  it('searches documentation', () => {
    expect(ids(snippetSearch(snippets, q('flashing'), 'docs', false))).toEqual([
      1
    ]);
    expect(ids(snippetSearch(snippets, q('uart flash'), 'docs', true))).toEqual([
      1
    ]);
    expect(snippetSearch(snippets, q('flashing'), 'title', false)).toEqual([]);
  });

  it('searches tags, language and code scopes', () => {
    expect(ids(snippetSearch(snippets, q('react'), 'tags', false))).toEqual([2]);
    expect(ids(snippetSearch(snippets, q('typescr'), 'language', false))).toEqual(
      [2]
    );
    expect(ids(snippetSearch(snippets, q('setup'), 'code', false))).toEqual([1]);
  });

  it('"all" scope lets lazy tokens match across different fields', () => {
    // "hardware" is a tag, "type" is in the title
    expect(ids(snippetSearch(snippets, q('hardware type'), 'all', true))).toEqual(
      [1]
    );
    expect(snippetSearch(snippets, q('hardware type'), 'all', false)).toEqual([]);
  });

  it('applies tags:/lang: filters on top of the text query', () => {
    expect(
      ids(snippetSearch(snippets, q('', { tags: ['UI'] }), 'default', false))
    ).toEqual([2]);
    expect(
      ids(
        snippetSearch(snippets, q('', { languages: ['markdown'] }), 'default', false)
      )
    ).toEqual([1]);
    expect(
      snippetSearch(snippets, q('card', { tags: ['hardware'] }), 'default', false)
    ).toEqual([]);
  });

  it('does not mutate its input', () => {
    const copy = [...snippets];
    snippetSearch(snippets, q('card'), 'all', true);
    expect(snippets).toEqual(copy);
  });
});
