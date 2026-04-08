import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  applyLowBandwidthClass,
  getLowBandwidthPreferred,
  setLowBandwidthPreferred,
} from '../utils/low-bandwidth-preference';

export function LowBandwidthToggle() {
  const { t } = useTranslation('common');
  const [on, setOn] = useState(() => getLowBandwidthPreferred());
  const [bandwidth, setBandwidth] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    applyLowBandwidthClass(on);
  }, [on]);

  useEffect(() => {
    const nav = navigator as Navigator & {
      connection?: {
        downlink?: number;
        effectiveType?: string;
        addEventListener?: (type: string, listener: EventListener) => void;
        removeEventListener?: (type: string, listener: EventListener) => void;
      };
    };
    const update = () => {
      const conn = nav.connection;
      if (!conn) {
        setBandwidth(null);
        return;
      }
      const downlink = typeof conn.downlink === 'number' ? `${conn.downlink.toFixed(1)}Mbps` : null;
      const kind = conn.effectiveType ? String(conn.effectiveType).toUpperCase() : null;
      setBandwidth([kind, downlink].filter(Boolean).join(' · ') || null);
    };

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    update();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    nav.connection?.addEventListener?.('change', update as EventListener);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      nav.connection?.removeEventListener?.('change', update as EventListener);
    };
  }, []);

  const title = `${t('lowBandwidth.hint')} ${bandwidth ? `(${bandwidth})` : ''}`.trim();

  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        const next = !on;
        setLowBandwidthPreferred(next);
        setOn(next);
        applyLowBandwidthClass(next);
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
        on
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }`}
      aria-label={title}
    >
      {online ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
    </button>
  );
}
