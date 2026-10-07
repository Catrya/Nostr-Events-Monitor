import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import { cn } from '@/lib/utils';

// Only JSON is ever highlighted: the full build bundles every Prism language
SyntaxHighlighter.registerLanguage('json', json);

interface JsonViewerProps {
  data: object;
  className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className={cn('json-container', className)}>
      <SyntaxHighlighter
        language="json"
        customStyle={{
          background: 'transparent',
          padding: 0,
          margin: 0,
          fontSize: '12px',
          lineHeight: '1.45',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
        }}
        codeTagProps={{
          className: 'json-viewer',
        }}
        useInlineStyles={false}
        className="json-viewer"
      >
        {jsonString}
      </SyntaxHighlighter>
    </div>
  );
}