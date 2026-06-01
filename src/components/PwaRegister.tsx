'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PwaRegister() {
  const router = useRouter();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('SW registered:', reg.scope),
        (err) => console.log('SW registration failed:', err)
      );

      // Listen for navigation messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'navigate' && event.data?.url) {
          router.push(event.data.url);
        }
      });
    }
  }, [router]);

  return null;
}
