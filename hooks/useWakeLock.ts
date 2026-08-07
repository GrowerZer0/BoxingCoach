'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseWakeLockOptions {
  onError?: (error: Error) => void;
  onActive?: () => void;
  onRelease?: () => void;
}

export const useWakeLock = (options: UseWakeLockOptions = {}) => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    if (document.visibilityState !== 'visible') return;

    try {
      const lock = await navigator.wakeLock.request('screen');
      setWakeLock(lock);
      setIsActive(true);
      options.onActive?.();

      lock.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
        options.onRelease?.();
      });
    } catch (err: any) {
      setIsActive(false); // Ensure isActive is false on any error
      // Silently ignore NotAllowedError as it's a common case where permission is denied by the browser
      // or user preferences, and not necessarily an app error.
      if (err.name !== 'NotAllowedError') {
        options.onError?.(err);
      }
    }
  }, [options]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch (err: any) {
        options.onError?.(err);
      } finally {
        setWakeLock(null);
        setIsActive(false);
      }
    }
  }, [wakeLock, options]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLock) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, wakeLock, requestWakeLock]);

  return { requestWakeLock, releaseWakeLock, isActive };
};
