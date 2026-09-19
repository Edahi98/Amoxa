import { ComponentTraverser } from '@sdui-traversal/component-traverser';
import { FieldFocus } from '@sdui-runtime-focus/field-focus';
import type { ComponentModel } from '@sdui-model-component/component.model';

export class MediaCaptureFocus {
  public static targetId(root: ComponentModel, params: Readonly<Record<string, unknown>>): string | undefined {
    const requested = params['componentId'];
    if (typeof requested === 'string') return requested;

    let found: string | undefined;
    new ComponentTraverser().walk(root, (component) => {
      if (found === undefined && component.type === 'evidence_capture') found = component.id;
    });
    return found;
  }

  public static focus(root: ComponentModel, params: Readonly<Record<string, unknown>>): boolean {
    const id = MediaCaptureFocus.targetId(root, params);
    return id === undefined ? false : FieldFocus.focus(id);
  }
}
