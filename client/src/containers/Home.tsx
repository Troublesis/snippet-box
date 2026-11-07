import { useEffect, useContext, useState, Fragment } from 'react';
import { SnippetsContext } from '../store';
import { Layout, PageHeader, EmptyState } from '../components/UI';
import { SnippetGrid } from '../components/Snippets/SnippetGrid';
import { SearchBar } from '../components/SearchBar';
import { SearchOptions } from '../components/SearchOptions';
import { SearchOptions as Options } from '../typescript/interfaces';

export const Home = (): JSX.Element => {
  const { snippets, getSnippets, searchResults } = useContext(SnippetsContext);

  const [options, setOptions] = useState<Options>({
    scope: 'default',
    lazy: false
  });

  useEffect(() => {
    getSnippets();
  }, []);

  return (
    <Layout>
      {snippets.length === 0 ? (
        <EmptyState />
      ) : (
        <Fragment>
          <PageHeader title='Search'>
            <SearchOptions options={options} onChange={setOptions} />
          </PageHeader>
          <SearchBar options={options} />
          <div className='col-12 mb-4'>
            <SnippetGrid snippets={searchResults} />
          </div>

          {snippets.some(s => s.isPinned) && (
            <Fragment>
              <PageHeader title='Pinned snippets' />
              <div className='col-12 mt-3'>
                <SnippetGrid snippets={snippets.filter(s => s.isPinned)} />
              </div>
            </Fragment>
          )}
        </Fragment>
      )}
    </Layout>
  );
};
