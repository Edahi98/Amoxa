import { useId } from 'react';

export interface FieldIds {
  controlId: string;
  hintId: string;
  errorId: string;
  describedBy: string | undefined;
}

export function useFieldIds(id: string | undefined, hasHint: boolean, hasError: boolean): FieldIds {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const parts = [hasHint ? hintId : null, hasError ? errorId : null].filter(Boolean);
  return { controlId, hintId, errorId, describedBy: parts.length > 0 ? parts.join(' ') : undefined };
}
