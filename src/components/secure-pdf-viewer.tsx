import { useEffect, useRef, useState, useCallback, type KeyboardEvent } from 'react';

import { fetchProtectedFileObjectUrl } from '../features/sprint4/lms.api';

interface SecurePdfViewerProps {
  assetId: string;
  accessToken: string;
  title?: string;
  className?: string;
}

/**
 * Renders a PDF learning resource without ever exposing a shareable file URL:
 * bytes are fetched through the authenticated /files/:id/stream endpoint and
 * shown via a short-lived blob: URL, plus best-effort deterrents against the
 * common copy/print/save/right-click/dev-tools shortcuts.
 */
export function SecurePdfViewer({ assetId, accessToken, title, className = '' }: SecurePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    setObjectUrl(null);
    setError(false);

    fetchProtectedFileObjectUrl(accessToken, assetId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        currentUrl = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [assetId, accessToken]);

  const preventDefaults = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const events = ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'dragover', 'drop', 'selectstart'];

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
    if (
      (e.ctrlKey && ['s', 'p', 'c', 'u'].includes(e.key.toLowerCase())) ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
      e.key === 'F12'
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  if (error) {
    return (
      <div className={`rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 ${className}`}>
        Could not load this document. Please refresh and try again.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`}
      onKeyDown={handleKeyDown}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      role="region"
      aria-label={title ?? 'PDF viewer'}
    >
      <style>{`
        @media print {
          .secure-pdf-container { display: none !important; }
          body * { visibility: hidden; }
        }
      `}</style>

      <div className="secure-pdf-container">
        {objectUrl ? (
          <iframe
            src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            title={title ?? 'PDF document'}
            className="h-full w-full min-h-[500px] border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex min-h-[500px] items-center justify-center text-sm text-slate-500">
            Loading document…
          </div>
        )}
      </div>
    </div>
  );
}
