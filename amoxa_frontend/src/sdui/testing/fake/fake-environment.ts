import { PathTokenizer } from '@sdui-path/path-tokenizer';
import { PathWriter } from '@sdui-path/path-writer';
import { ScreenContextFactory } from '@sdui-runtime-screen/screen-context-factory';
import type { ActionEnvironment, ToastTone } from '@sdui-actions/action-environment';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import type { SyncResult } from '@sdui-offline/sync-manager';
import type { ApiDownload } from '@utils-api/ApiDownload.js';

export class FakeEnvironment implements ActionEnvironment {
  public readonly navigations: Array<{ screenId: string; params: Record<string, unknown> }> = [];
  public readonly modals: Array<{ screenId: string; params: Record<string, unknown> }> = [];
  public readonly toasts: Array<{ message: string; tone: ToastTone }> = [];
  public readonly confirmations: string[] = [];
  public readonly captures: Array<Record<string, unknown>> = [];
  public readonly downloads: ApiDownload[] = [];
  public reloads = 0;
  public closes = 0;
  public logouts = 0;
  public syncs = 0;
  public blocked = 0;
  public online = true;
  public token: string | null = 'token-123';
  public confirmAnswer = true;
  public captureResult = true;
  public syncResult: SyncResult = { synced: 0, discarded: 0, conflicts: 0, failed: 0, remaining: 0, offline: false };
  public data: Record<string, unknown>;

  private readonly base: ScreenContextModel;
  private readonly writer = new PathWriter(new PathTokenizer());

  constructor(base: ScreenContextModel) {
    this.base = base;
    this.data = base.data ?? {};
  }

  public navigate(screenId: string, params: Record<string, unknown>): void {
    this.navigations.push({ screenId, params });
  }

  public reload(): void {
    this.reloads += 1;
  }

  public openModal(screenId: string, params: Record<string, unknown>): void {
    this.modals.push({ screenId, params });
  }

  public closeModal(): void {
    this.closes += 1;
  }

  public toast(message: string, tone: ToastTone): void {
    this.toasts.push({ message, tone });
  }

  public confirm(text: string): Promise<boolean> {
    this.confirmations.push(text);
    return Promise.resolve(this.confirmAnswer);
  }

  public logout(): void {
    this.logouts += 1;
  }

  public syncNow(): Promise<SyncResult> {
    this.syncs += 1;
    return Promise.resolve(this.syncResult);
  }

  public captureMedia(params: Record<string, unknown>): Promise<boolean> {
    this.captures.push(params);
    return Promise.resolve(this.captureResult);
  }

  public getContext(): ScreenContextModel {
    return ScreenContextFactory.withData(this.base, this.data);
  }

  public setData(path: string, value: unknown): void {
    this.data = this.writer.set(this.data, path, value);
  }

  public getToken(): string | null {
    return this.token;
  }

  public isOnline(): boolean {
    return this.online;
  }

  public notifyBlocked(): void {
    this.blocked += 1;
  }

  public download(file: ApiDownload): void {
    this.downloads.push(file);
  }
}
