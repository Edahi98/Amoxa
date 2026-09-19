import { WORKFLOWS, type WorkflowDefinition } from '@shared-workflow/workflows.js';

export interface WorkflowSummary {
  id: string;
  title: string;
  summary: string;
  steps: number;
}

export class WorkflowCatalog {
  public static ids(): string[] {
    return Object.keys(WORKFLOWS);
  }

  public static find(id: string | undefined): WorkflowDefinition | undefined {
    return id !== undefined && Object.hasOwn(WORKFLOWS, id) ? (WORKFLOWS as Record<string, WorkflowDefinition>)[id] : undefined;
  }

  public static summaries(): WorkflowSummary[] {
    return WorkflowCatalog.ids().map((id) => {
      const workflow = WorkflowCatalog.find(id)!;
      return { id, title: workflow.title, summary: workflow.summary, steps: workflow.steps.length };
    });
  }
}
