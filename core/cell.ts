import { useCallback, useSyncExternalStore } from "react";

import type { Cell, CellInitializer, Subscriber, Updater } from "./cell.types.js";
import type { Grid, GridPosition, GridState } from "./grid.types.js";
import type { GridHead } from "./head.types.js";

export type { Cell, Subscriber, Updater } from "./cell.types.js";

type GridWithCellSetter<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
> = Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState> & {
  __setCellValue: (rowId: TRowId, columnId: TColumnId, newValue: TCell) => void;
};

export function cell<TCell>(initialValue: TCell | CellInitializer<TCell>): Cell<TCell> {
  let value = typeof initialValue === "function" ? (null as TCell) : initialValue;

  const subscribers = new Set<Subscriber>();

  const notifySubscribers = () => {
    subscribers.forEach((callback) => callback());
  };

  const initializeValue = async () => {
    if (typeof initialValue !== "function") return;

    value = await (initialValue as CellInitializer<TCell>)();
    notifySubscribers();
  };

  void initializeValue();

  return {
    get: () => value,
    set: (newValue) => {
      value = newValue;
      notifySubscribers();
    },
    subscribe: (callback) => {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
    _subscribers: () => subscribers.size,
  };
}

export function useCell<TCell>(
  currentCell: Cell<TCell>,
): readonly [TCell, (newValue: TCell) => void];
export function useCell<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  position: GridPosition<TColumnId, TRowId>,
): readonly [TCell, (newValue: TCell) => void];
export function useCell<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  rowId: TRowId,
  columnId: TColumnId,
): readonly [TCell, (newValue: TCell) => void];
export function useCell<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  cellOrGrid:
    | Cell<TCell>
    | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  rowIdOrPosition?: TRowId | GridPosition<TColumnId, TRowId>,
  columnId?: TColumnId,
) {
  const { rowId: resolvedRowId, columnId: resolvedColumnId } = Array.isArray(
    rowIdOrPosition,
  )
    ? {
        rowId: rowIdOrPosition[1],
        columnId: rowIdOrPosition[0],
      }
    : {
        rowId: rowIdOrPosition,
        columnId,
      };
  const currentCell = resolveCell(cellOrGrid, resolvedRowId, resolvedColumnId);
  const subscribe = useCallback(
    (callback: Subscriber) => currentCell.subscribe(callback),
    [currentCell],
  );
  const getSnapshot = useCallback(() => currentCell.get(), [currentCell]);
  const setValue =
    isGrid(cellOrGrid) && resolvedRowId !== undefined && resolvedColumnId !== undefined
      ? (newValue: TCell) =>
          (
            cellOrGrid as GridWithCellSetter<
              TCell,
              TRowId,
              TColumnId,
              TRowHead,
              TColumnHead,
              TStateCell,
              TState
            >
          ).__setCellValue(resolvedRowId, resolvedColumnId, newValue)
      : currentCell.set;

  return [useSyncExternalStore(subscribe, getSnapshot), setValue] as const;
}

export function useCellValue<TCell>(currentCell: Cell<TCell>): TCell;
export function useCellValue<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  position: GridPosition<TColumnId, TRowId>,
): TCell;
export function useCellValue<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  rowId: TRowId,
  columnId: TColumnId,
): TCell;
export function useCellValue<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  cellOrGrid:
    | Cell<TCell>
    | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  rowIdOrPosition?: TRowId | GridPosition<TColumnId, TRowId>,
  columnId?: TColumnId,
) {
  const { rowId: resolvedRowId, columnId: resolvedColumnId } = Array.isArray(
    rowIdOrPosition,
  )
    ? {
        rowId: rowIdOrPosition[1],
        columnId: rowIdOrPosition[0],
      }
    : {
        rowId: rowIdOrPosition,
        columnId,
      };
  const currentCell = resolveCell(cellOrGrid, resolvedRowId, resolvedColumnId);
  const subscribe = useCallback(
    (callback: Subscriber) => currentCell.subscribe(callback),
    [currentCell],
  );
  const getSnapshot = useCallback(() => currentCell.get(), [currentCell]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

function resolveCell<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  cellOrGrid:
    | Cell<TCell>
    | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  rowId?: TRowId,
  columnId?: TColumnId,
) {
  if (!isGrid(cellOrGrid)) {
    return cellOrGrid;
  }

  if (!rowId || !columnId) {
    throw new Error("Grid cell hooks require both rowId and columnId.");
  }

  return cellOrGrid.getCell(rowId, columnId);
}

function isGrid<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  value:
    | Cell<TCell>
    | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
): value is Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState> {
  return "getCell" in value;
}
