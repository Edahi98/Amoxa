import type { ApiDownload } from '@utils-api/ApiDownload.js';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import type { SyncResult } from '@sdui-offline/sync-manager';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ActionEnvironment {
  navigate(screenId: string, params: Record<string, unknown>): void;
  reload(): void;
  openModal(screenId: string, params: Record<string, unknown>): void;
  closeModal(): void;
  toast(message: string, tone: ToastTone): void;
  confirm(text: string): Promise<boolean>;
  logout(): void;
  syncNow(): Promise<SyncResult>;
  captureMedia(params: Record<string, unknown>): Promise<boolean>;
  getContext(): ScreenContextModel;
  setData(path: string, value: unknown): void;
  getToken(): string | null;
  isOnline(): boolean;
  notifyBlocked(): void;
  download(file: ApiDownload): void;
}
