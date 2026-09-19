import { useEffect, useRef } from 'react';
import { Banner } from '@molecules-feedback/Banner.js';
import { FieldFocus } from '@sdui-runtime-focus/field-focus';
import { RulePresentation } from '@sdui-runtime-validation/rule-presentation';
import type { RuleSummaryEntry } from '@sdui-runtime-validation/validation-presenter';

export interface RuleBannersProps {
  summary: readonly RuleSummaryEntry[];
  focusToken: number;
}

export function RuleBanners({ summary, focusToken }: RuleBannersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousToken = useRef(focusToken);

  useEffect(() => {
    if (focusToken !== previousToken.current) {
      previousToken.current = focusToken;
      containerRef.current?.focus();
    }
  }, [focusToken]);

  const groups = RulePresentation.groups(summary);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      aria-label="Resumen de validación"
      className="flex min-w-0 flex-col gap-3 rounded-xl focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {groups.map((group) => (
        <Banner
          key={group.severity}
          tone={group.tone}
          title={group.title}
          message={group.message}
          action={
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {group.entries.map(({ rule, targetId }) => (
                <li key={rule.id}>
                  {targetId === undefined ? (
                    rule.message
                  ) : (
                    <a
                      href={`#${targetId}`}
                      onClick={(event) => {
                        event.preventDefault();
                        FieldFocus.focus(targetId);
                      }}
                      className="font-medium underline underline-offset-2 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {rule.message}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          }
        />
      ))}
    </div>
  );
}
