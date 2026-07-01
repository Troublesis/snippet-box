import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  },
  // Apply Bootstrap's `.table` class to GFM tables so they pick up the
  // bootswatch theme styling defined in _bootswatch.scss.
  table({ node, ...props }) {
    return <table className="table" {...props} />;
  }
};

export const SnippetDocs = (props: Props): JSX.Element => {
  return (
    <div className="snippet-docs">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {props.markdown}
      </ReactMarkdown>
    </div>
  );
};
