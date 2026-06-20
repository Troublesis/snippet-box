import { useEffect, useState } from 'react';
import mermaid from 'mermaid';

// Initialize once at module load. `startOnLoad` is disabled because we render
// each diagram explicitly. The remaining defaults are already what we want:
// `securityLevel: 'strict'` (sanitizes diagram-supplied HTML) and
// `theme: 'default'`.
mermaid.initialize({
  startOnLoad: false
});

interface Props {
  chart: string;
}

// Module-level counter guarantees a unique DOM id per render call, which
// Mermaid v8 requires for the temporary element it mounts while drawing.
let diagramId = 0;

export const Mermaid = ({ chart }: Props): JSX.Element => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    diagramId += 1;
    const id = `mermaid-diagram-${diagramId}`;

    try {
      mermaid.render(id, chart, (renderedSvg: string) => {
        if (isMounted) {
          setSvg(renderedSvg);
          setError('');
        }
      });
    } catch (err) {
      // On a parse error Mermaid leaves an orphaned node behind — clean it up.
      const orphan = document.getElementById(`d${id}`);
      if (orphan) {
        orphan.remove();
      }

      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Invalid Mermaid diagram');
        setSvg('');
      }
    }

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <pre className='mermaid-error'>
        <code>Mermaid render error: {error}</code>
      </pre>
    );
  }

  return (
    <div
      className='mermaid-diagram'
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
