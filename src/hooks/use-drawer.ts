import { useCallback, useState } from 'react';

export function useDrawer(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => setOpen((current) => !current), []);

  return {
    open,
    setOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
