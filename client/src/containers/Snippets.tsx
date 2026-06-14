import { useEffect, useContext, useState, useMemo, Fragment } from 'react';
import { SnippetsContext } from '../store';
import { SnippetGrid } from '../components/Snippets/SnippetGrid';
import { Button, Card, EmptyState, Layout } from '../components/UI';

type SortBy = 'updated' | 'created';
type SortDir = 'desc' | 'asc';

export const Snippets = (): JSX.Element => {
  const { snippets, tagCount, getSnippets, countTags } =
    useContext(SnippetsContext);

  const [filter, setFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    getSnippets();
    countTags();
  }, []);

  // Derive the displayed list from snippets + active tag filter + sort option.
  const displaySnippets = useMemo(() => {
    const base = filter
      ? snippets.filter(s => s.tags.includes(filter))
      : snippets;

    // Comparators are written newest-first (descending); `dir` flips them to
    // oldest-first (ascending) when requested.
    const dir = sortDir === 'asc' ? -1 : 1;

    return [...base].sort((a, b) => {
      if (sortBy === 'created') {
        return (
          dir * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      }

      // By last updated, with most recently created as the tiebreaker.
      const byUpdated =
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      const cmp =
        byUpdated !== 0
          ? byUpdated
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      return dir * cmp;
    });
  }, [snippets, filter, sortBy, sortDir]);

  const filterHandler = (tag: string) => {
    setFilter(tag);
  };

  const clearFilterHandler = () => {
    setFilter(null);
  };

  return (
    <Layout>
      {snippets.length === 0 ? (
        <EmptyState />
      ) : (
        <Fragment>
          <div className='col-12 col-md-4 col-lg-3'>
            <Card>
              <h5 className='card-title'>All snippets</h5>
              <div className='mb-3 d-flex justify-content-between'>
                <span>Total</span>
                <span>{snippets.length}</span>
              </div>
              <hr />

              <h5 className='card-title'>Filter by tags</h5>
              <Fragment>
                {tagCount.map((tag, idx) => {
                  const isActiveFilter = filter === tag.name;

                  return (
                    <div
                      key={idx}
                      className={`d-flex justify-content-between cursor-pointer ${
                        isActiveFilter && 'text-success'
                      }`}
                      onClick={() => filterHandler(tag.name)}
                    >
                      <span>{tag.name}</span>
                      <span>{tag.count}</span>
                    </div>
                  );
                })}
              </Fragment>
              <div className='d-grid mt-3'>
                <Button
                  text='Clear filters'
                  color='secondary'
                  small
                  outline
                  handler={clearFilterHandler}
                />
              </div>
            </Card>
          </div>
          <div className='col-12 col-md-8 col-lg-9'>
            <div className='d-flex justify-content-end align-items-center mb-3'>
              <label htmlFor='sortSnippets' className='me-2 text-muted'>
                Sort by
              </label>
              <select
                id='sortSnippets'
                className='form-select form-select-sm w-auto me-2'
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
              >
                <option value='updated'>Last updated</option>
                <option value='created'>Date created</option>
              </select>
              <select
                id='sortDir'
                className='form-select form-select-sm w-auto'
                value={sortDir}
                onChange={e => setSortDir(e.target.value as SortDir)}
                aria-label='Sort direction'
              >
                <option value='desc'>Recent first</option>
                <option value='asc'>Oldest first</option>
              </select>
            </div>
            <SnippetGrid snippets={displaySnippets} />
          </div>
        </Fragment>
      )}
    </Layout>
  );
};
