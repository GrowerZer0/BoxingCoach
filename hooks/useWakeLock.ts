import { useEffect, useRef, useState } from 'react';

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if (wakeLockRef.current) return;
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setIsActive(false);
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.warn('Wake Lock not available:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Error releasing wake lock:', err);
      }
      wakeLockRef.current = null;
      setIsActive(false);
    }
  };

  // Re‑acquire if visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  return { requestWakeLock, releaseWakeLock, isActive };
}