import { TokenStorage } from '@utils-storage/tokenStorage.js';
import { BrowserStorage } from '@sdui-offline-storage/browser-storage';
import { OfflineQueue } from '@sdui-offline-queue/offline-queue';
import { SyncManager } from '@sdui-offline/sync-manager';

export class OfflineRuntime {
  private static queueInstance: OfflineQueue | null = null;
  private static syncInstance: SyncManager | null = null;

  public static queue(): OfflineQueue {
    if (!OfflineRuntime.queueInstance) {
      OfflineRuntime.queueInstance = new OfflineQueue(new BrowserStorage());
    }
    return OfflineRuntime.queueInstance;
  }

  public static sync(): SyncManager {
    if (!OfflineRuntime.syncInstance) {
      OfflineRuntime.syncInstance = new SyncManager(OfflineRuntime.queue(), {
        getToken: () => TokenStorage.getStored(),
        isOnline: () => OfflineRuntime.isOnline(),
      });
    }
    return OfflineRuntime.syncInstance;
  }

  public static isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }
}
