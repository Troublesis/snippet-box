import { SearchOptions as Options, SearchScope } from '../typescript/interfaces';
import { SEARCH_SCOPES } from '../utils';

interface Props {
  options: Options;
  onChange: (options: Options) => void;
}

export const SearchOptions = (props: Props): JSX.Element => {
  const { options, onChange } = props;

  return (
    <div className='d-flex align-items-center ms-3'>
      <select
        id='searchScope'
        className='form-select form-select-sm w-auto me-3'
        aria-label='Search in'
        value={options.scope}
        onChange={e =>
          onChange({ ...options, scope: e.target.value as SearchScope })
        }
      >
        {SEARCH_SCOPES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div
        className='form-check mb-0'
        title='Match every word in any order, e.g. "s3 type" finds "ESP32-S3 Type-C"'
      >
        <input
          type='checkbox'
          className='form-check-input'
          id='lazySearch'
          checked={options.lazy}
          onChange={e => onChange({ ...options, lazy: e.target.checked })}
        />
        <label className='form-check-label text-muted' htmlFor='lazySearch'>
          Lazy search
        </label>
      </div>
    </div>
  );
};
