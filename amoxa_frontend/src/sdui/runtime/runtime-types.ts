import type { ToastTone } from '@sdui-actions/action-environment';

export interface RuntimeHost {
  navigate(screenId: string, params: Record<string, unknown>): void;
  logout(): void;
  getToken(): string | null;
  reload(): void;
  closeModal?(): void;
}

export interface ModalState {
  screenId: string;
  params: Record<string, unknown>;
}

export interface ConfirmRequest {
  text: string;
  resolve(accepted: boolean): void;
}

export interface RuntimeToast {
  id: string;
  message: string;
  tone: ToastTone;
}
