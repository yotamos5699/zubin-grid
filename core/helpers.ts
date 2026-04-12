import type { Grid, GridState } from "./types/grid.types.js";
import type { GridHead } from "./types/head.types.js";

export function reorderRow<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  activeRowId: TRowId | string,
  overRowId: TRowId | string,
) {
  const currentRowIds = currentGrid.rowHeaders;
  const nextOrderedRowIds = reorderAxisIds(currentRowIds, activeRowId, overRowId);

  if (nextOrderedRowIds === currentRowIds) {
    return false;
  }

  nextOrderedRowIds.forEach((rowId, index) => {
    currentGrid.updateRowHead(rowId, (currentHead): TRowHead => {
      return currentHead.order === index
        ? currentHead
        : {
            ...currentHead,
            order: index,
          };
    });
  });

  return true;
}

export function reorderColumn<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  activeColumnId: TColumnId | string,
  overColumnId: TColumnId | string,
) {
  const currentColumnIds = currentGrid.colHeaders;
  const nextOrderedColumnIds = reorderAxisIds(
    currentColumnIds,
    activeColumnId,
    overColumnId,
  );

  if (nextOrderedColumnIds === currentColumnIds) {
    return false;
  }

  nextOrderedColumnIds.forEach((columnId, index) => {
    currentGrid.updateColumnHead(columnId, (currentHead): TColumnHead => {
      return currentHead.order === index
        ? currentHead
        : {
            ...currentHead,
            order: index,
          };
    });
  });

  return true;
}

function reorderAxisIds<TId extends string>(
  items: readonly TId[],
  activeId: TId | string,
  overId: TId | string,
) {
  const fromIndex = items.findIndex((item) => item === activeId);
  const toIndex = items.findIndex((item) => item === overId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return items;
  }

  const nextItems = items.slice();
  const movedItem = nextItems[fromIndex];

  nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);

  return nextItems;
}
