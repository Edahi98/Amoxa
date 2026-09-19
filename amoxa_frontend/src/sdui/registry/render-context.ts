import type { ReactNode } from 'react';
import type { ComponentModel } from '@sdui-model-component/component.model';
import type { SyncSnapshot } from '@sdui-offline/sync-manager';

export type ChangeTiming = 'immediate' | 'typing';

export interface RenderContext {
  node: ComponentModel;
  props: Readonly<Record<string, unknown>>;
  value: unknown;
  error: string | undefined;
  required: boolean;
  disabled: boolean;
  busy: boolean;
  sync: SyncSnapshot;
  visibleChildren: readonly ComponentModel[];
  setValue(next: unknown, timing?: ChangeTiming): void;
  press(extraParams?: Record<string, unknown>): void;
  hasPress(): boolean;
  actionAllowed(): boolean;
  renderChild(child: ComponentModel): ReactNode;
  renderChildren(): ReactNode[];
}
