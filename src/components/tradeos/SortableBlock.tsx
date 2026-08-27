import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, EyeOff } from 'lucide-react';
import { BlockId } from '@/lib/tradeOSRoles';

export function SortableBlock({
  id,
  customizing,
  onHide,
  children,
}: {
  id: BlockId;
  customizing: boolean;
  onHide: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !customizing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${customizing ? 'outline-dashed outline-1 outline-tradeos-line-strong outline-offset-4 rounded-lg' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      {customizing && (
        <div className="absolute -top-3 right-2 z-10 flex gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-tradeos-line-strong bg-tradeos-surface text-tradeos-ink-2 shadow-sm active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onHide}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-tradeos-line-strong bg-tradeos-surface text-tradeos-ink-2 shadow-sm hover:border-tradeos-crit hover:text-tradeos-crit"
            aria-label="Hide this card"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
