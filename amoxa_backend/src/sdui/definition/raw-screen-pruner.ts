import type { RawComponent, RawScreen } from '@sdui-builder/raw-json.types.js';

export class RawScreenPruner {
  public static prune(screen: RawScreen, denied: ReadonlySet<string>): RawScreen {
    if (denied.size === 0) return screen;

    const actions = Object.fromEntries(Object.entries(screen.actions).filter(([id]) => !denied.has(id)));
    const pruned: RawScreen = { ...screen, actions, root: RawScreenPruner.pruneComponent(screen.root, denied) };
    if (screen.state_machine?.transitions !== undefined) {
      pruned.state_machine = {
        ...screen.state_machine,
        transitions: screen.state_machine.transitions.filter((transition) => !denied.has(transition.action)),
      };
    }
    return pruned;
  }

  private static pruneComponent(component: RawComponent, denied: ReadonlySet<string>): RawComponent {
    if (component.children === undefined) return component;

    return {
      ...component,
      children: component.children
        .filter((child) => !RawScreenPruner.referencesDenied(child, denied))
        .map((child) => RawScreenPruner.pruneComponent(child, denied)),
    };
  }

  private static referencesDenied(component: RawComponent, denied: ReadonlySet<string>): boolean {
    return Object.values(component.on ?? {}).some((actionId) => denied.has(actionId));
  }
}
