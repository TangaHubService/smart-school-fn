import { useEffect, useRef, useCallback, type KeyboardEvent } from 'react';

interface SecurePdfViewerProps {
  secureUrl: string;
  title?: string;
  className?: string;
}

export function SecurePdfViewer({ secureUrl, title, className = '' }: SecurePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const preventDefaults = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const events = [
      'contextmenu', 'copy', 'cut', 'paste',
      'dragstart', 'dragover', 'drop',
      'selectstart',
    ];

    events.forEach((event) => {
      container.addEventListener(event, preventDefaults, true);
    });

    return () => {
      events.forEach((event) => {
        container.removeEventListener(event, preventDefaults, true);
      });
    };
  }, [preventDefaults]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // Block Ctrl+S, Ctrl+P, Ctrl+C, Ctrl+Shift+I, F12
    if (
      (e.ctrlKey && ['s', 'p', 'c', 'u'].includes(e.key.toLowerCase())) ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
      e.key === 'F12'
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`}
      onKeyDown={handleKeyDown}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      role="region"
      aria-label={title ?? 'PDF viewer'}
    >
      {/* Print protection via CSS */}
      <style>{`
        @media print {
          .secure-pdf-container { display: none !important; }
          body * { visibility: hidden; }
        }
        .secure-pdf-container embed::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="secure-pdf-container">
        <iframe
          src={`${secureUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          title={title ?? 'PDF document'}
          className="h-full w-full min-h-[500px] border-0"
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
        />
      </div>

      {/* Overlay to intercept click events on the iframe */}
      <div
        className="absolute inset-0 z-10"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
}
