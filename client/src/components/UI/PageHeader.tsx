import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props<T> {
  title: string;
  prevDest?: string;
  prevState?: T;
  children?: ReactNode;
}

export const PageHeader = <T,>(props: Props<T>): JSX.Element => {
  const { title, prevDest, prevState, children } = props;

  return (
    <div className='col-12'>
      {children ? (
        <div className='d-flex align-items-center flex-wrap mb-2'>
          <h4 className='mb-0'>{title}</h4>
          {children}
        </div>
      ) : (
        <h4>{title}</h4>
      )}
      {prevDest && (
        <h6>
          <Link
            to={{
              pathname: prevDest,
              state: prevState
            }}
            className='text-decoration-none text-light'
          >
            &lt;- Go back
          </Link>
        </h6>
      )}
    </div>
  );
};
