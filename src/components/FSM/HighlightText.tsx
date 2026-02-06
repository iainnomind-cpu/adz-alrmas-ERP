interface HighlightTextProps {
  text: string;
  searchTerm?: string;
  className?: string;
}

export function HighlightText({ text, searchTerm, className = '' }: HighlightTextProps) {
  if (!searchTerm || !text.toLowerCase().includes(searchTerm.toLowerCase())) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, idx) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <span key={idx} className="bg-yellow-300 font-bold">{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
}
