import { useEffect } from 'react';
import { OfflineRuntime } from '@sdui-offline/offline-runtime';

export function useSyncAutoFlush(): void {
  useEffect(() => {
    const manager = OfflineRuntime.sync();
    const detach = manager.attach(window);
    manager.refresh();
    if (OfflineRuntime.isOnline() && OfflineRuntime.queue().count() > 0) {
      void manager.flush();
    }
    return detach;
  }, []);
}
