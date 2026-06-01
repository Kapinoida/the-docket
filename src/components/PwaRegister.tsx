'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('SW registered:', reg.scope),
        (err) => console.log('SW registration failed:', err)
      );
    }
  }, []);

  return null;
}
