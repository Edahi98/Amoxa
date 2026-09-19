import type { ReactNode } from 'react';
import type { ComponentType } from '@sdui-model/sdui-enums';
import type { RenderContext } from '@sdui-registry/render-context';

export type ComponentKind = 'container' | 'display' | 'control' | 'pressable' | 'custom';

export interface ComponentDescriptor {
  readonly type: ComponentType;
  readonly kind: ComponentKind;
  readonly component: string;
  readonly render: (context: RenderContext) => ReactNode;
}
