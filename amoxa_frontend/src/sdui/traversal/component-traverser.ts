import { ComponentModel } from '@sdui-model-component/component.model';

export class ComponentTraverser {
  public walk(root: ComponentModel, visit: (component: ComponentModel, depth: number) => void, depth = 0): void {
    visit(root, depth);
    root.children.forEach((child) => this.walk(child, visit, depth + 1));
  }

  public findById(root: ComponentModel, id: string): ComponentModel | undefined {
    if (root.id === id) return root;

    for (const child of root.children) {
      const found = this.findById(child, id);
      if (found) return found;
    }
    return undefined;
  }

  public collectBindPaths(root: ComponentModel): string[] {
    const paths: string[] = [];
    if (root.bind) paths.push(root.bind);
    root.children.forEach((child) => paths.push(...this.collectBindPaths(child)));
    return paths;
  }
}
