'use client';

import { useState, useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch('/api/push/subscribe');
      const data = await res.json();
      setEnabled(data.subscribed);
    } catch {
      // API unreachable
    }
    setLoading(false);
  }

  async function toggleNotifications() {
    if (enabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }

  async function subscribe() {
    setLoading(true);
    setError('');

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setError('Push notifications not supported in this browser');
        setLoading(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission denied');
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Fetch VAPID public key
        const keyRes = await fetch('/api/push/subscribe', { method: 'GET' });
        // Public key is embedded in the page — use the hardcoded one
        const vapidPublicKey = 'BLEL2SkBz9b9cHfMd5-vkhFIh_CTI7508_UzqkpQqUQiMDLxckKuijBMwWe518lsM8HHJ416ywcmysQMI1WDFvc';

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setEnabled(true);
    } catch (e: any) {
      setError(e.message || 'Failed to enable notifications');
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      setEnabled(false);
    } catch (e: any) {
      setError(e.message || 'Failed to disable notifications');
    }
    setLoading(false);
  }

  if (loading && !enabled) {
    return <div className="text-sm text-gray-500">Checking notification status...</div>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Push Notifications
        </label>
        <button
          onClick={toggleNotifications}
          disabled={loading}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'}
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Get reminded 10 minutes before timed tasks are due.
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
