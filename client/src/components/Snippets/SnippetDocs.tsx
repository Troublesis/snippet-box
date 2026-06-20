import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';
import { Mermaid } from './Mermaid';

interface Props {
  markdown: string;
}

// Route fenced ```mermaid blocks to the Mermaid renderer; everything else
// falls through to react-markdown's default <code> rendering.
const components: Components = {
  code({ node, inline, className, children, ...rest }) {
    const isMermaid = /language-mermaid/.test(className || '');

    if (!inline && isMermaid) {
      return <Mermaid chart={String(children).replace(/\n$/, '')} />;
    }

    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }
};

export const SnippetDocs = (props: Props): JSX.Element => {
  return (
    <div>
      <ReactMarkdown components={components}>{props.markdown}</ReactMarkdown>
    </div>
  );
};
