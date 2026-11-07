export interface SearchQuery {
  query: string;
  tags: string[];
  languages: string[];
}

export type SearchScope =
  | 'default'
  | 'title'
  | 'description'
  | 'tags'
  | 'language'
  | 'code'
  | 'docs'
  | 'all';

export interface SearchOptions {
  scope: SearchScope;
  lazy: boolean;
}
