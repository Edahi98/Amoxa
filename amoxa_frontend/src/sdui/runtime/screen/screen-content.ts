import type { ComponentModel } from '@sdui-model-component/component.model';

export class ScreenContent {
  private static readonly STRUCTURAL = ['container', 'section'];

  public static isEmpty(root: ComponentModel, isVisible: (node: ComponentModel) => boolean): boolean {
    if (!isVisible(root)) return true;
    if (!ScreenContent.STRUCTURAL.includes(root.type)) return false;
    return !root.children.some((child) => isVisible(child));
  }
}
