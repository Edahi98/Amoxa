import { useState } from 'react';
import { ArrowDown, ArrowUp, DotsSixVertical } from '@phosphor-icons/react';
import { Button } from '@atoms-button/Button.js';
import { ListReorder } from '@utils-list/ListReorder.js';
import { ClassNames } from '@utils-style/cn.js';

export interface SortableItem {
  id: string;
  title: string;
  description?: string;
}

export interface SortableListProps {
  label: string;
  items: SortableItem[];
  onItemsChange: (items: SortableItem[]) => void;
  emptyText?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function SortableList({ label, items, onItemsChange, emptyText = 'No hay elementos.', hint, disabled, className }: SortableListProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const move = (from: number, to: number) => {
    const next = ListReorder.move(items, from, to);
    if (ListReorder.sameOrder(items, next)) return;
    onItemsChange(next);
    setAnnouncement(`${items[from].title} ahora está en la posición ${to + 1} de ${items.length}.`);
  };

  const finishDrag = () => {
    setDragging(null);
    setOver(null);
  };

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-2', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable={!disabled}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
                setDragging(index);
              }}
              onDragOver={(event) => {
                if (dragging === null) return;
                event.preventDefault();
                setOver(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging !== null) move(dragging, index);
                finishDrag();
              }}
              onDragEnd={finishDrag}
              className={ClassNames.merge(
                'flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors duration-200',
                dragging === index && 'opacity-50',
                over === index && dragging !== index && 'border-primary bg-primary-muted',
                !disabled && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <DotsSixVertical size={20} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-foreground">{item.title}</p>
                {item.description ? <p className="break-words text-sm text-muted-foreground">{item.description}</p> : null}
              </div>
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" icon={ArrowUp} disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label={`Subir: ${item.title}`} />
                <Button
                  variant="ghost"
                  icon={ArrowDown}
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={`Bajar: ${item.title}`}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
