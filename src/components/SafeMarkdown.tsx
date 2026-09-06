import React from 'react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Safely parses and renders Markdown text (headings, bold, lists, code blocks, paragraphs)
 * using React elements directly. Never uses dangerouslySetInnerHTML to guarantee complete XSS safety.
 */
export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const formatInlineText = (text: string): React.ReactNode[] => {
    // Regex matches bold (**text**), italic (*text*), inline code (`code`)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={idx} className="font-semibold text-stone-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return <em key={idx} className="italic text-stone-700">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-stone-100 text-emerald-800 text-xs font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="p-3 my-2 text-xs font-mono rounded-lg bg-stone-900 text-stone-100 overflow-x-auto"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Blank line
    if (!trimmed) {
      elements.push(<div key={`blank-${index}`} className="h-2" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="mt-3 mb-1 text-sm font-semibold tracking-wide text-stone-900 uppercase">
          {formatInlineText(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${index}`} className="mt-3.5 mb-1.5 text-base font-semibold text-stone-900">
          {formatInlineText(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${index}`} className="mt-4 mb-2 text-lg font-bold text-stone-900">
          {formatInlineText(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    // Bullet list items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <li key={`bullet-${index}`} className="ml-4 list-disc text-stone-700 leading-relaxed text-sm">
          {formatInlineText(trimmed.slice(2))}
        </li>
      );
      return;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <li key={`num-${index}`} className="ml-4 list-decimal text-stone-700 leading-relaxed text-sm">
          {formatInlineText(numMatch[2])}
        </li>
      );
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${index}`} className="text-stone-700 leading-relaxed text-sm my-1">
        {formatInlineText(line)}
      </p>
    );
  });

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
