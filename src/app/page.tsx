'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [Layout, setLayout] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Dynamically import Layout only on client side
    import('@/components/Layout').then((module) => {
      setLayout(() => module.default);
      setMounted(true);
    });
  }, []);

  if (!mounted || !Layout) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading The Docket...</div>
      </div>
    );
  }

  return <Layout />;
}
