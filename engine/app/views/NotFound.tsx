import { useEffect } from 'react';

/** `what` completes "There is no …", e.g. "atlas called “x”". */
export function NotFound({ what = 'page at this address' }: { what?: string }) {
  useEffect(() => {
    document.title = 'Not found';
  }, []);
  return (
    <div className="page narrow">
      <h1 className="page-title">Not found</h1>
      <p className="lede">There is no {what}. It may have been renamed in human/.</p>
      <p>
        <a href="/">Back to the atlases</a>
      </p>
    </div>
  );
}
