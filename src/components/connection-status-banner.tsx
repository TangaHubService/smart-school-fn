import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getPendingLessonIds } from '../utils/offline-learning-cache';

/**
 * Surfaces offline state so learners know drafts may not sync (low / no connectivity).
 */
export function ConnectionStatusBanner() {
  const [online, setOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  );
  const [pendingLessons, setPendingLessons] = useState(0);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (online) {
      setPendingLessons(0);
      return;
    }
    const tick = () => setPendingLessons(getPendingLessonIds().length);
    tick();
    const id = window.setInterval(tick, 3000);
    return () => window.clearInterval(id);
  }, [online]);

  if (online) {
    return null;
  }

  const queueHint =
    pendingLessons > 0
      ? ` ${pendingLessons} lesson completion${pendingLessons === 1 ? '' : 's'} will sync when you are back online.`
      : ' Quiz drafts on open tests are saved on this device until you reconnect.';

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[60] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-lg items-center gap-2 rounded-t-xl border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-950 shadow-lg">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          You are offline. Reconnect to submit quizzes and sync progress.
          {queueHint}
        </span>
      </div>
    </div>
  );
}
