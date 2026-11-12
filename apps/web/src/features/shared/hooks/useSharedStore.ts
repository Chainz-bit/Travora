import { useState, useEffect } from 'react';
import { sharedStore } from '../services/sharedStore';

/**
 * Custom React hook untuk berlangganan perubahan Shared Local Mock Store pada browser lokal.
 * Menangani CustomEvent 'travora_store_changed' (dalam tab) dan 'storage' (sinkronisasi antar-tab).
 */
export function useSharedStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    function handleStoreChange() {
      setTick((prev) => prev + 1);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('travora_store_changed', handleStoreChange);
      window.addEventListener('storage', handleStoreChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('travora_store_changed', handleStoreChange);
        window.removeEventListener('storage', handleStoreChange);
      }
    };
  }, []);

  return sharedStore;
}

