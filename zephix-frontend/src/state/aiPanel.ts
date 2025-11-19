import { useEffect, useState } from 'react';

const KEY = 'zephix.aiPanel'; // 'open' | 'closed'

export function useAiPanelState() {
  const [open, setOpen] = useState<boolean>(() => {
    const v = sessionStorage.getItem(KEY);
    return v ? v === 'open' : false;
  });

  useEffect(() => {
    sessionStorage.setItem(KEY, open ? 'open' : 'closed');
  }, [open]);

  return { open, setOpen };
}
