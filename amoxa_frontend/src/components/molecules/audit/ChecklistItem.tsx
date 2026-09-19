import { useId, type ReactNode } from 'react';
import { CheckCircle, MinusCircle, Warning, XCircle } from '@phosphor-icons/react';
import { RadioGroup, type RadioOption } from '@atoms-form/RadioGroup.js';
import { Textarea } from '@atoms-form/Textarea.js';
import { Badge } from '@atoms-display/Badge.js';
import { ClauseTag } from '@atoms-display/ClauseTag.js';
import { ClassNames } from '@utils-style/cn.js';

export type ChecklistResult = 'conforme' | 'no_conforme' | 'no_aplica';
export type ChecklistCriterion = 'norma' | 'procedimiento';

export interface ChecklistValue {
  result?: ChecklistResult;
  comment?: string;
}

export interface ChecklistItemProps {
  question: string;
  clause?: string;
  criterion?: ChecklistCriterion;
  value?: ChecklistValue;
  onValueChange: (value: ChecklistValue) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export class ChecklistModel {
  public static readonly OPTIONS: RadioOption[] = [
    { value: 'conforme', label: 'Conforme', icon: <CheckCircle size={18} weight="fill" aria-hidden="true" /> },
    { value: 'no_conforme', label: 'No conforme', icon: <XCircle size={18} weight="fill" aria-hidden="true" /> },
    { value: 'no_aplica', label: 'No aplica', icon: <MinusCircle size={18} weight="fill" aria-hidden="true" /> },
  ];

  public static criterionLabel(criterion: ChecklistCriterion): string {
    return criterion === 'norma' ? 'Criterio: norma' : 'Criterio: procedimiento propio';
  }
}

export function ChecklistItem({ question, clause, criterion, value, onValueChange, disabled, id, className, children }: ChecklistItemProps) {
  const generatedId = useId();
  const itemId = id ?? generatedId;
  const current = value ?? {};

  return (
    <article
      id={id}
      className={ClassNames.merge('flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4', className)}
    >
      {clause || criterion ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {clause ? <ClauseTag clause={clause} standard="ISO 9001" /> : null}
          {criterion ? <Badge label={ChecklistModel.criterionLabel(criterion)} tone="neutral" /> : null}
        </div>
      ) : null}
      <RadioGroup
        id={`${itemId}-result`}
        label={question}
        options={ChecklistModel.OPTIONS}
        value={current.result ?? ''}
        variant="segmented"
        direction="row"
        disabled={disabled}
        onValueChange={(next) => onValueChange({ ...current, result: next as ChecklistResult })}
      />
      {current.result === 'no_conforme' ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-warning-muted px-3 py-2 text-sm font-medium text-on-warning-muted"
        >
          <Warning size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            Una no conformidad requiere evidencia
            {clause ? ` vinculada a la cláusula ${clause}` : ''}. Adjúntala antes de continuar.
          </span>
        </p>
      ) : null}
      <Textarea
        id={`${itemId}-comment`}
        label="Comentario"
        rows={2}
        disabled={disabled}
        value={current.comment ?? ''}
        onValueChange={(comment) => onValueChange({ ...current, comment })}
      />
      {children}
    </article>
  );
}
