import { WORKFLOWS } from '@shared-workflow/workflows.js';

export type NavState = 'abierta' | 'bloqueada' | 'oculta';

export class NavGate {
  public static readonly LOCKED_AHEAD = 2;
  public static readonly FLOW_ID = 'ciclo-auditoria';

  public static key(screenId: string): string {
    return screenId.replace(/[^A-Za-z0-9]/g, '_');
  }

  public static stepOf(screenId: string): number | undefined {
    const index = WORKFLOWS[NavGate.FLOW_ID].steps.findIndex((step) => (step.screens as readonly string[]).includes(screenId));
    return index === -1 ? undefined : index;
  }

  public static isGated(screenId: string): boolean {
    return NavGate.stepOf(screenId) !== undefined;
  }

  public static stateOf(stepIndex: number, currentIndex: number): NavState {
    if (stepIndex <= currentIndex) return 'abierta';
    return stepIndex <= currentIndex + NavGate.LOCKED_AHEAD ? 'bloqueada' : 'oculta';
  }

  public static states(screenIds: readonly string[], currentIndex: number): Record<string, NavState> {
    const result: Record<string, NavState> = {};
    for (const screenId of screenIds) {
      const step = NavGate.stepOf(screenId);
      if (step !== undefined) result[NavGate.key(screenId)] = NavGate.stateOf(step, currentIndex);
    }
    return result;
  }

  public static allScreens(): string[] {
    return WORKFLOWS[NavGate.FLOW_ID].steps.flatMap((step) => [...step.screens]);
  }
}
