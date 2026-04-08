const KEY = 'ss_low_bandwidth';

export function getLowBandwidthPreferred(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setLowBandwidthPreferred(value: boolean): void {
  try {
    window.localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

export function applyLowBandwidthClass(enabled: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('ss-low-bandwidth', enabled);
}
