import { Snippet, SearchQuery, SearchScope } from '../typescript/interfaces';

type FieldGetter = (snippet: Snippet) => string;

const FIELDS: Record<'title' | 'description' | 'tags' | 'language' | 'code' | 'docs', FieldGetter> = {
  title: s => s.title,
  description: s => s.description ?? '',
  tags: s => (s.tags ?? []).join(' '),
  language: s => s.language,
  code: s => s.code,
  docs: s => s.docs ?? ''
};

const SCOPE_FIELDS: Record<SearchScope, FieldGetter[]> = {
  default: [FIELDS.title, FIELDS.description],
  title: [FIELDS.title],
  description: [FIELDS.description],
  tags: [FIELDS.tags],
  language: [FIELDS.language],
  code: [FIELDS.code],
  docs: [FIELDS.docs],
  all: Object.values(FIELDS)
};

export const SEARCH_SCOPES: { value: SearchScope; label: string }[] = [
  { value: 'default', label: 'Title & description' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'tags', label: 'Tags' },
  { value: 'language', label: 'Language' },
  { value: 'code', label: 'Code' },
  { value: 'docs', label: 'Documentation' },
  { value: 'all', label: 'Everything' }
];

const normalize = (text: string): string => text.toLowerCase();

const matchesFilter = (value: string, filters: string[]): boolean =>
  filters.length === 0 || filters.some(f => normalize(f) === normalize(value));

/**
 * Client-side snippet search.
 *
 * - strict (lazy = false): the whole query must appear as a substring.
 * - lazy: the query is split on whitespace and every word must appear
 *   somewhere in the searched fields, in any order ("s3 type" finds
 *   "ESP32-S3 Type-C guide").
 *
 * `tags:` / `lang:` filters from the parsed query are always applied.
 */
export const snippetSearch = (
  snippets: Snippet[],
  { query, tags, languages }: SearchQuery,
  scope: SearchScope,
  lazy: boolean
): Snippet[] => {
  const text = normalize(query.trim());

  if (!text && !tags.length && !languages.length) {
    return [];
  }

  const getters = SCOPE_FIELDS[scope];
  const terms = !text ? [] : lazy ? text.split(/\s+/) : [text];

  return snippets.filter(snippet => {
    if (!matchesFilter(snippet.language, languages)) return false;
    if (tags.length && !(snippet.tags ?? []).some(t => matchesFilter(t, tags))) {
      return false;
    }

    const haystacks = getters.map(get => normalize(get(snippet)));

    return terms.every(term => haystacks.some(h => h.includes(term)));
  });
};
