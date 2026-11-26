import { useMemo, type ElementType } from 'react';
import { renderMarkdown } from '../markdown';
import { useContent } from '../store';

/** Render human-written markdown. `inline` for titles and one-liners. */
export function Md({ source, atlas, inline, as, className }: { source: string; atlas?: string; inline?: boolean; as?: ElementType; className?: string }) {
  const content = useContent();
  const html = useMemo(() => renderMarkdown(source, content, { atlas, inline }), [source, content, atlas, inline]);
  const Tag = as ?? (inline ? 'span' : 'div');
  return <Tag className={className ?? (inline ? undefined : 'prose')} dangerouslySetInnerHTML={{ __html: html }} />;
}
