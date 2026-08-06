// hooks/useWakeLock.ts
import { useEffect, useState, useCallback } from 'react';

interface WakeLockOptions {
  onError?: (error: Error) => void;
  onRelease?: () => void;
  onActive?: () => void;
}

export function useWakeLock(options: WakeLockOptions = {}) {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const requestWakeLock = useCallback(async () => {
    try {
      if (!('wakeLock' in navigator)) {
        setIsSupported(false);
        console.warn('Wake Lock API not supported');
        return null;
      }

      // Check if already active
      if (wakeLock) {
        return wakeLock;
      }

      const lock = await navigator.wakeLock.request('screen');
      setWakeLock(lock);
      setIsActive(true);
      options.onActive?.();

      // Listen for release
      lock.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
        options.onRelease?.();
      });

      return lock;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Wake Lock request failed');
      options.onError?.(error);
      console.error('Wake Lock error:', error);
      return null;
    }
  }, [wakeLock, options]);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
        setIsActive(false);
      }
    } catch (err) {
      console.error('Error releasing wake lock:', err);
    }
  }, [wakeLock]);

  // Auto-request wake lock when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        // Re-request if we lost it due to page hide
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, requestWakeLock]);

  // Auto-release on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    requestWakeLock,
    releaseWakeLock,
    isActive,
    isSupported,
  };
}