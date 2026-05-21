/**
 * Перестановка элементов лесенки приоритетов отдыха.
 * `toIndex` — финальная позиция элемента после перемещения (0…length-1).
 * `insertAt` — индекс зазора вставки в исходном списке (0…length):
 *   0 — перед первой строкой, length — после последней.
 */

export function reorderLadderItems<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const len = items.length;
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= len ||
    toIndex >= len ||
    fromIndex === toIndex
  ) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Конвертирует gap-индекс DnD в финальный `toIndex`; null — drop на себя. */
export function insertAtToTargetIndex(
  fromIndex: number,
  insertAt: number,
  length: number,
): number | null {
  if (
    fromIndex < 0 ||
    insertAt < 0 ||
    fromIndex >= length ||
    insertAt > length
  ) {
    return null;
  }
  if (insertAt === fromIndex || insertAt === fromIndex + 1) {
    return null;
  }
  return insertAt > fromIndex ? insertAt - 1 : insertAt;
}
