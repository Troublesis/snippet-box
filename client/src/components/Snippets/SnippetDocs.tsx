import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Mermaid } from './Mermaid';

interface Props {
  markdown: string;
}

// Extend the default sanitization schema to preserve className (needed for
// mermaid language-* detection, highlight.js, and Bootstrap) and style
// attributes on inline HTML.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style']
  }
};

// Route fenced ```mermaid blocks to the Mermaid renderer; everything else
// falls through to react-markdown's default rendering.
// rehype-raw parses inline HTML (<br>, <span style="…">, etc.) embedded in
// the markdown after remark has processed it.  rehype-sanitize strips any
// dangerous tags/attributes (XSS-safe) while preserving className + style
// per the custom schema above.
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        components={components}
      >
        {props.markdown}
      </ReactMarkdown>
    </div>
  );
};
