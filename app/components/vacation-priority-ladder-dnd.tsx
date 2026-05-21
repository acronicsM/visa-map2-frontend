"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useState, type KeyboardEvent } from "react";
import type { VacationDimensionKey } from "../types/map";
import {
  VACATION_SLOT_WEIGHTS,
  VACATION_TYPE_META,
  type VacationLadderItem,
} from "../lib/vacation-fit";

type VacationPriorityLadderDnDProps = {
  ladder: VacationLadderItem[];
  /** insertAt — индекс зазора вставки (0…length). */
  onReorder: (fromIndex: number, insertAt: number) => void;
  onMoveUp: (slotIndex: number) => void;
  onMoveDown: (slotIndex: number) => void;
  onToggleEnabled: (slotIndex: number) => void;
};

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="7" r="1.35" />
      <circle cx="15" cy="7" r="1.35" />
      <circle cx="9" cy="12" r="1.35" />
      <circle cx="15" cy="12" r="1.35" />
      <circle cx="9" cy="17" r="1.35" />
      <circle cx="15" cy="17" r="1.35" />
    </svg>
  );
}

function LadderToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`toggle-switch shrink-0 origin-center scale-90 ${disabled ? "pointer-events-none opacity-80" : ""}`}
      title={checked ? "Выключить" : "Включить"}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

type SortableLadderRowProps = {
  item: VacationLadderItem;
  slotIndex: number;
  ladderLength: number;
  onReorder: (fromIndex: number, insertAt: number) => void;
  onMoveUp: (slotIndex: number) => void;
  onMoveDown: (slotIndex: number) => void;
  onToggleEnabled: (slotIndex: number) => void;
  isDragging?: boolean;
};

function SortableLadderRow({
  item,
  slotIndex,
  ladderLength,
  onReorder,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  isDragging = false,
}: SortableLadderRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.key });

  const slotWeight = VACATION_SLOT_WEIGHTS[slotIndex] ?? 0;
  const meta = VACATION_TYPE_META[item.key as VacationDimensionKey];
  const effectiveWeight = item.enabled ? slotWeight : 0;
  const label = meta?.label ?? item.key;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          onMoveUp(slotIndex);
          break;
        case "ArrowDown":
          e.preventDefault();
          onMoveDown(slotIndex);
          break;
        case "Home":
          if (slotIndex > 0) {
            e.preventDefault();
            // Переместить на первую позицию (insertAt = 0)
            onReorder(slotIndex, 0);
          }
          break;
        case "End":
          if (slotIndex < ladderLength - 1) {
            e.preventDefault();
            // Переместить на последнюю позицию (insertAt = ladderLength)
            onReorder(slotIndex, ladderLength);
          }
          break;
        default:
          break;
      }
    },
    [slotIndex, ladderLength, onMoveUp, onMoveDown, onReorder]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-0.5 rounded-md border px-1 py-0.5 transition-all ${
        item.enabled
          ? "border-outline-variant/80 bg-white"
          : "border-transparent bg-black/3 opacity-70"
      } ${isSortableDragging ? "opacity-40" : ""} ${isDragging ? "shadow-lg ring-2 ring-primary/30 z-10" : ""}`}
      role="listitem"
      aria-label={label}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <span
        className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-outline touch-none"
        aria-hidden
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon className="h-3.5 w-3.5" />
      </span>
      <span
        className="w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums text-outline"
        title={`Слот ${slotIndex + 1}, вес ${slotWeight}`}
      >
        {effectiveWeight}
      </span>
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: meta?.color ?? "#94a3b8" }}
      />
      <span
        className={`min-w-0 flex-1 truncate text-[12px] leading-tight ${
          item.enabled ? "text-on-surface" : "text-outline"
        }`}
        title={label}
      >
        {label}
      </span>
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={isDragging || slotIndex === 0}
          onClick={() => onMoveUp(slotIndex)}
          className="flex h-4 w-7 shrink-0 items-center justify-center rounded text-outline hover:bg-black/5 disabled:pointer-events-none disabled:opacity-25"
          aria-label={`Поднять: ${label}`}
          tabIndex={isDragging ? -1 : 0}
        >
          <ChevronUpIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={isDragging || slotIndex >= ladderLength - 1}
          onClick={() => onMoveDown(slotIndex)}
          className="flex h-4 w-7 shrink-0 items-center justify-center rounded text-outline hover:bg-black/5 disabled:pointer-events-none disabled:opacity-25"
          aria-label={`Опустить: ${label}`}
          tabIndex={isDragging ? -1 : 0}
        >
          <ChevronDownIcon className="h-3 w-3" />
        </button>
      </div>
      <LadderToggle
        checked={item.enabled}
        onChange={() => onToggleEnabled(slotIndex)}
        label={label}
        disabled={isDragging}
      />
    </div>
  );
}

function DragOverlayRow({ item, slotIndex }: { item: VacationLadderItem; slotIndex: number }) {
  const slotWeight = VACATION_SLOT_WEIGHTS[slotIndex] ?? 0;
  const meta = VACATION_TYPE_META[item.key as VacationDimensionKey];
  const effectiveWeight = item.enabled ? slotWeight : 0;
  const label = meta?.label ?? item.key;

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-outline-variant/80 bg-white px-1 py-0.5 shadow-lg ring-2 ring-primary/30">
      <span className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-outline">
        <DragHandleIcon className="h-3.5 w-3.5" />
      </span>
      <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-outline">
        {effectiveWeight}
      </span>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta?.color ?? "#94a3b8" }}
      />
      <span className="min-w-0 flex-1 truncate text-[12px] leading-tight text-on-surface">
        {label}
      </span>
      <div className="flex shrink-0 flex-col opacity-25">
        <button
          type="button"
          disabled
          className="flex h-4 w-7 shrink-0 items-center justify-center rounded text-outline"
        >
          <ChevronUpIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled
          className="flex h-4 w-7 shrink-0 items-center justify-center rounded text-outline"
        >
          <ChevronDownIcon className="h-3 w-3" />
        </button>
      </div>
      <LadderToggle checked={item.enabled} onChange={() => {}} label={label} disabled />
    </div>
  );
}

export default function VacationPriorityLadderDnD({
  ladder,
  onReorder,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
}: VacationPriorityLadderDnDProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Порог активации drag (в пикселях)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = ladder.findIndex((item) => item.key === active.id);
        const newIndex = ladder.findIndex((item) => item.key === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Конвертируем toIndex в insertAt для совместимости с текущим API
          const insertAt = newIndex > oldIndex ? newIndex + 1 : newIndex;
          onReorder(oldIndex, insertAt);
        }
      }
    },
    [ladder, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeItem = activeId ? ladder.find((item) => item.key === activeId) : null;
  const activeIndex = activeItem ? ladder.findIndex((item) => item.key === activeId) : -1;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={ladder.map((item) => item.key)}>
          <div
            className="flex flex-col gap-px"
            role="list"
            aria-label="Расставьте интересы по важности в поездке. Зажмите строку и перетащите для смены порядка."
          >
            {ladder.map((item, index) => (
              <SortableLadderRow
                key={item.key}
                item={item}
                slotIndex={index}
                ladderLength={ladder.length}
                onReorder={onReorder}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onToggleEnabled={onToggleEnabled}
                isDragging={activeId === item.key}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem && activeIndex !== -1 ? (
            <DragOverlayRow item={activeItem} slotIndex={activeIndex} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}