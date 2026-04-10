import { useCallback, useEffect, useSyncExternalStore } from "react";

import { cell } from "./cell.js";

import type { Cell, Subscriber } from "./cell.js";
import type { Grid, GridPosition } from "./grid.js";
import type { GridHead } from "./head.js";

export interface GridAxisCell<TCell, TRowId extends string, TColumnId extends string> {
  id: string;
  rowId: TRowId;
  columnId: TColumnId;
  value: TCell;
  cell: Cell<TCell>;
}

export type GridAxisTailUpdater<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TTail,
> = (cells: readonly GridAxisCell<TCell, TRowId, TColumnId>[]) => TTail;

export interface GridTailState<TTail = unknown> {
  isReactive: boolean;
  value: TTail | null;
}

type GridTailHookValue<TTail> = [TTail] extends [void] ? void : TTail | undefined;

export function useRowTail<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TTail = void,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  position: GridPosition<TColumnId, TRowId>,
  onRowUpdate?: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
): GridTailHookValue<TTail>;
export function useRowTail<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TTail = void,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  rowId: TRowId,
  onRowUpdate?: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
): GridTailHookValue<TTail>;
export function useRowTail<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TTail = void,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  rowIdOrPosition: TRowId | GridPosition<TColumnId, TRowId>,
  onRowUpdate?: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
): GridTailHookValue<TTail> {
  const resolvedRowId = Array.isArray(rowIdOrPosition)
    ? rowIdOrPosition[1]
    : rowIdOrPosition;

  useEffect(() => {
    if (!onRowUpdate) return;

    return currentGrid.registerRowTail(resolvedRowId, onRowUpdate);
  }, [currentGrid, resolvedRowId, onRowUpdate]);

  const subscribe = useCallback(
    (callback: Subscriber) => currentGrid.subscribeRowTail(resolvedRowId, callback),
    [currentGrid, resolvedRowId],
  );
  const getSnapshot = useCallback(
    () => readReactiveTailValue(currentGrid.getRowTailState<TTail>(resolvedRowId)),
    [currentGrid, resolvedRowId],
  );
  const tail = useSyncExternalStore(subscribe, getSnapshot);

  return tail as GridTailHookValue<TTail>;
}

export function useColumnTail<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TTail = void,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  position: GridPosition<TColumnId, TRowId>,
  onColumnUpdate?: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
): GridTailHookValue<TTail>;
export function useColumnTail<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TTail = void,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  columnId: TColumnId,
  onColumnUpdate?: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
): GridTailHookValue<TTail>;
export function useColumnTail<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TTail = void,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  columnIdOrPosition: TColumnId | GridPosition<TColumnId, TRowId>,
  onColumnUpdate?: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
): GridTailHookValue<TTail> {
  const resolvedColumnId = Array.isArray(columnIdOrPosition)
    ? columnIdOrPosition[0]
    : columnIdOrPosition;

  useEffect(() => {
    if (!onColumnUpdate) return;

    return currentGrid.registerColumnTail(resolvedColumnId, onColumnUpdate);
  }, [currentGrid, resolvedColumnId, onColumnUpdate]);

  const subscribe = useCallback(
    (callback: Subscriber) => currentGrid.subscribeColumnTail(resolvedColumnId, callback),
    [currentGrid, resolvedColumnId],
  );
  const getSnapshot = useCallback(
    () => readReactiveTailValue(currentGrid.getColumnTailState<TTail>(resolvedColumnId)),
    [currentGrid, resolvedColumnId],
  );
  const tail = useSyncExternalStore(subscribe, getSnapshot);

  return tail as GridTailHookValue<TTail>;
}

export function createTailCellMap<TId extends string>(heads: readonly GridHead<TId>[]) {
  return new Map<TId, Cell<GridTailState<unknown>>>(
    heads.map((head) => [head.id, cell<GridTailState<unknown>>(createTailState())]),
  );
}

export function getTailCell<TId extends string>(
  tailCells: Map<TId, Cell<GridTailState<unknown>>>,
  id: TId,
  axis: "row" | "column",
) {
  const currentTailCell = tailCells.get(id);

  if (!currentTailCell) {
    throw new Error(`Missing ${axis} tail "${id}".`);
  }

  return currentTailCell;
}

export function setTailCellResult(
  tailCell: Cell<GridTailState<unknown>>,
  nextValue: unknown,
) {
  const currentTailState = tailCell.get();
  const nextTailState = createTailState(nextValue);

  if (isSameTailState(currentTailState, nextTailState)) {
    return;
  }

  tailCell.set(nextTailState);
}

export function readReactiveTailValue<TTail>(tailState: GridTailState<TTail>) {
  return tailState.isReactive ? tailState.value : undefined;
}

function createTailState(value?: unknown): GridTailState<unknown> {
  return value === undefined
    ? {
        isReactive: false,
        value: null,
      }
    : {
        isReactive: true,
        value,
      };
}

function isSameTailState(
  leftTailState: GridTailState<unknown>,
  rightTailState: GridTailState<unknown>,
) {
  return (
    leftTailState.isReactive === rightTailState.isReactive &&
    Object.is(leftTailState.value, rightTailState.value)
  );
}
