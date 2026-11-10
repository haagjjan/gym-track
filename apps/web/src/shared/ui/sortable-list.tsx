"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

export function SortableList({
  children,
  disabled = false,
  ids,
  onReorder,
  orientation = "vertical"
}: {
  children: ReactNode;
  disabled?: boolean;
  ids: string[];
  onReorder: (activeId: string, overId: string) => void;
  orientation?: "horizontal" | "vertical";
}): ReactNode {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function finish(event: DragEndEvent): void {
    if (event.over && event.active.id !== event.over.id) {
      onReorder(String(event.active.id), String(event.over.id));
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={finish}
      sensors={sensors}
    >
      <SortableContext
        disabled={disabled}
        items={ids}
        strategy={orientation === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  children,
  disabled = false,
  id,
  label
}: {
  children: (state: { dragHandle: ReactNode; isDragging: boolean }) => ReactNode;
  disabled?: boolean;
  id: string;
  label: string;
}): ReactNode {
  const sortable = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging ? 50 : undefined
  };
  const dragHandle = (
    <button
      {...sortable.attributes}
      {...sortable.listeners}
      aria-label={`Drag to reorder ${label}. Use the arrow keys while focused to move it.`}
      className="flex size-11 flex-none touch-none items-center justify-center rounded-[var(--radius-sm)] text-text-muted active:bg-surface-raised disabled:opacity-40"
      disabled={disabled}
      ref={sortable.setActivatorNodeRef}
      type="button"
    >
      <span aria-hidden className="grid grid-cols-2 gap-[3px]">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="size-[3px] rounded-full bg-current" key={index} />
        ))}
      </span>
    </button>
  );

  return (
    <div
      className={sortable.isDragging ? "relative opacity-80 shadow-lg" : ""}
      ref={sortable.setNodeRef}
      // Callers wrap the list in role="list"; each item must be a listitem.
      role="listitem"
      style={style}
    >
      {children({ dragHandle, isDragging: sortable.isDragging })}
    </div>
  );
}
