import { useCallback, useSyncExternalStore } from 'react';
import { OfflineRuntime } from '@sdui-offline/offline-runtime';
import type { SyncManager, SyncSnapshot } from '@sdui-offline/sync-manager';

export function useSyncSnapshot(manager: SyncManager = OfflineRuntime.sync()): SyncSnapshot {
  const subscribe = useCallback((listener: () => void) => manager.subscribe(listener), [manager]);
  const getSnapshot = useCallback(() => manager.getSnapshot(), [manager]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
