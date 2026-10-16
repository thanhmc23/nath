import React from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split content by inline LaTeX markers $...$
  const parts = content.split(/(\$[^$]+\$)/g);

  return (
    <span className={`inline-block leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1);
          return (
            <code
              key={index}
              className="inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono text-[0.93em] bg-indigo-50/80 text-indigo-900 border border-indigo-200/60 font-semibold"
            >
              {formula}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
