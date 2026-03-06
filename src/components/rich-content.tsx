import DOMPurify from 'dompurify';

export function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: {
      html: true,
    },
  });

  return (
    <div
      className={className ?? 'rich-content text-sm text-slate-800'}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
