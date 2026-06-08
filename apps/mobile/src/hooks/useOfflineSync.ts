/**
 * @fileoverview useOfflineSync — monitors connectivity and flushes the offline queue.
 *
 * Usage in _layout.tsx:
 *   const { isOnline, pendingCount } = useOfflineSync(myExecutor);
 *
 * Dependencies: @react-native-community/netinfo (or expo-network)
 *   pnpm --filter @geocampo/mobile add @react-native-community/netinfo
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { OfflineQueue, type QueuedAction } from '@/lib/offlineQueue';

export type QueueExecutor = (action: QueuedAction) => Promise<void>;

interface OfflineSyncState {
  /** Is the device currently online? (best-effort, defaults to true) */
  isOnline:    boolean;
  /** Number of actions waiting to be flushed */
  pendingCount: number;
  /** Manually trigger a flush */
  flush:       () => Promise<void>;
}

/**
 * Polls the queue count and flushes when the app comes to the foreground.
 * Pass an `executor` that knows how to process each action type.
 */
export function useOfflineSync(executor: QueueExecutor): OfflineSyncState {
  const [isOnline, setIsOnline]       = useState(true);
  const [pendingCount, setPending]    = useState(0);
  const executorRef = useRef(executor);
  executorRef.current = executor;

  const refreshCount = useCallback(async () => {
    const n = await OfflineQueue.count();
    setPending(n);
  }, []);

  const flush = useCallback(async () => {
    if (!isOnline) return;
    const { succeeded } = await OfflineQueue.flush(
      (action) => executorRef.current(action)
    );
    if (succeeded > 0) await refreshCount();
  }, [isOnline, refreshCount]);

  // Try to dynamically import @react-native-community/netinfo if available
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    import('@react-native-community/netinfo')
      .then((NetInfo) => {
        unsubscribe = NetInfo.addEventListener((state) => {
          const online = state.isConnected === true && state.isInternetReachable !== false;
          setIsOnline(online);
          if (online) flush();
        });
      })
      .catch(() => {
        // netinfo not installed — assume online
        setIsOnline(true);
      });
    return () => { unsubscribe?.(); };
  }, [flush]);

  // Flush on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') { flush(); refreshCount(); }
    });
    refreshCount(); // initial
    return () => subscription.remove();
  }, [flush, refreshCount]);

  return { isOnline, pendingCount, flush };
}
