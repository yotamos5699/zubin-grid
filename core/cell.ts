import { useCallback, useSyncExternalStore } from "react";

import type { Grid, GridPosition } from "./grid.js";
import type { GridHead } from "./head.js";

export type Subscriber = () => void;

type CellInitializer<TCell> = () => TCell | Promise<TCell>;

export type Updater<TValue> = TValue | ((currentValue: TValue) => TValue);

export interface Cell<TCell> {
  get: () => TCell;
  set: (newValue: TCell) => void;
  subscribe: (callback: Subscriber) => () => void;
  _subscribers: () => number;
}

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
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  position: GridPosition<TColumnId, TRowId>,
): readonly [TCell, (newValue: TCell) => void];
export function useCell<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  rowId: TRowId,
  columnId: TColumnId,
): readonly [TCell, (newValue: TCell) => void];
export function useCell<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  cellOrGrid: Cell<TCell> | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
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
          cellOrGrid.setValue(resolvedRowId, resolvedColumnId, newValue)
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
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  position: GridPosition<TColumnId, TRowId>,
): TCell;
export function useCellValue<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  rowId: TRowId,
  columnId: TColumnId,
): TCell;
export function useCellValue<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  cellOrGrid: Cell<TCell> | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
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
>(
  cellOrGrid: Cell<TCell> | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
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
>(
  value: Cell<TCell> | Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
): value is Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead> {
  return "getCell" in value;
}
