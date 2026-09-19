import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useControllableState } from '@hooks/useControllableState.js';
import { KeyboardNav } from '@utils-interaction/KeyboardNav.js';
import { ClassNames } from '@utils-style/cn.js';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, value, onValueChange, id, className }: TabsProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const [selected, setSelected] = useControllableState<string>(value, defaultTab ?? tabs[0]?.id ?? '', onValueChange);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === selected),
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = KeyboardNav.next(event.key, index, tabs.length, 'horizontal');
    if (target === null) {
      return;
    }
    event.preventDefault();
    setSelected(tabs[target].id);
    buttons.current[target]?.focus();
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-4', className)}>
      <div role="tablist" aria-orientation="horizontal" className="flex min-w-0 gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setSelected(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={ClassNames.merge(
                '-mb-px h-11 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
                isActive
                  ? 'border-primary text-on-primary-muted'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== activeIndex}
          tabIndex={0}
          className="min-w-0 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {index === activeIndex ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
