import { useCallback, useSyncExternalStore } from "react";

import { cell } from "./cell.js";

import type { Cell, Subscriber, Updater } from "./types/cell.types.js";
import type { Grid, GridPosition, GridState } from "./types/grid.types.js";
import type {
  GridHead,
  GridHeadHookResult,
  GridHeadId,
  GridHeadInput,
  GridHeadObject,
  ResolvedGridHead,
} from "./types/head.types.js";

export type {
  GridHead,
  GridHeadHookResult,
  GridHeadId,
  GridHeadInput,
  GridHeadObject,
  NormalizedGridHead,
  ResolvedGridHead,
} from "./types/head.types.js";

export function useRowHead<
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
): GridHeadHookResult<TRowHead>;
export function useRowHead<
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
): GridHeadHookResult<TRowHead>;
export function useRowHead<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  rowIdOrPosition: TRowId | GridPosition<TColumnId, TRowId>,
): GridHeadHookResult<TRowHead> {
  const resolvedRowId = Array.isArray(rowIdOrPosition)
    ? rowIdOrPosition[1]
    : rowIdOrPosition;
  const subscribe = useCallback(
    (callback: Subscriber) => currentGrid.subscribeRowHead(resolvedRowId, callback),
    [currentGrid, resolvedRowId],
  );
  const getSnapshot = useCallback(
    () => currentGrid.getRowHead(resolvedRowId),
    [currentGrid, resolvedRowId],
  );
  const head = useSyncExternalStore(subscribe, getSnapshot);
  const setHead = useCallback(
    (nextHead: Updater<TRowHead>) => {
      currentGrid.updateRowHead(resolvedRowId, nextHead);
    },
    [currentGrid, resolvedRowId],
  );
  const updateLabel = useCallback(
    (label: string) => {
      currentGrid.updateRowHead(resolvedRowId, (currentHead: TRowHead) => ({
        ...currentHead,
        label,
      }));
    },
    [currentGrid, resolvedRowId],
  );
  const updateOrder = useCallback(
    (order: number) => {
      currentGrid.updateRowHead(resolvedRowId, (currentHead: TRowHead) => ({
        ...currentHead,
        order,
      }));
    },
    [currentGrid, resolvedRowId],
  );

  return {
    head,
    setHead,
    updateLabel,
    updateOrder,
  };
}

export function useColumnHead<
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
): GridHeadHookResult<TColumnHead>;
export function useColumnHead<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  columnId: TColumnId,
): GridHeadHookResult<TColumnHead>;
export function useColumnHead<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  columnIdOrPosition: TColumnId | GridPosition<TColumnId, TRowId>,
): GridHeadHookResult<TColumnHead> {
  const resolvedColumnId = Array.isArray(columnIdOrPosition)
    ? columnIdOrPosition[0]
    : columnIdOrPosition;
  const subscribe = useCallback(
    (callback: Subscriber) => currentGrid.subscribeColumnHead(resolvedColumnId, callback),
    [currentGrid, resolvedColumnId],
  );
  const getSnapshot = useCallback(
    () => currentGrid.getColumnHead(resolvedColumnId),
    [currentGrid, resolvedColumnId],
  );
  const head = useSyncExternalStore(subscribe, getSnapshot);
  const setHead = useCallback(
    (nextHead: Updater<TColumnHead>) => {
      currentGrid.updateColumnHead(resolvedColumnId, nextHead);
    },
    [currentGrid, resolvedColumnId],
  );
  const updateLabel = useCallback(
    (label: string) => {
      currentGrid.updateColumnHead(resolvedColumnId, (currentHead: TColumnHead) => ({
        ...currentHead,
        label,
      }));
    },
    [currentGrid, resolvedColumnId],
  );
  const updateOrder = useCallback(
    (order: number) => {
      currentGrid.updateColumnHead(resolvedColumnId, (currentHead: TColumnHead) => ({
        ...currentHead,
        order,
      }));
    },
    [currentGrid, resolvedColumnId],
  );

  return {
    head,
    setHead,
    updateLabel,
    updateOrder,
  };
}

export const useColHead = useColumnHead;

export function normalizeGridHeads<THeadInput extends GridHeadInput>(
  heads: readonly THeadInput[],
) {
  return heads.map((head, index) =>
    normalizeGridHead(head, index),
  ) as readonly ResolvedGridHead<THeadInput>[];
}

export function createHeadCellMap<TId extends string, THead extends GridHead<TId>>(
  heads: readonly THead[],
) {
  return new Map<TId, Cell<THead>>(heads.map((head) => [head.id, cell<THead>(head)]));
}

export function createHeadOrderIndex<TId extends string, THead extends GridHead<TId>>(
  heads: readonly THead[],
) {
  return new Map<TId, number>(heads.map((head, index) => [head.id, index]));
}

export function getOrderedHeads<TId extends string, THead extends GridHead<TId>>(
  headCells: Map<TId, Cell<THead>>,
  fallbackOrder: Map<TId, number>,
) {
  return [...headCells.values()]
    .map((headCell) => headCell.get())
    .sort((leftHead, rightHead) => {
      return (
        leftHead.order - rightHead.order ||
        (fallbackOrder.get(leftHead.id) ?? 0) - (fallbackOrder.get(rightHead.id) ?? 0)
      );
    });
}

export function getHeadCell<TId extends string, THead extends GridHead<TId>>(
  headCells: Map<TId, Cell<THead>>,
  id: TId,
  axis: "row" | "column",
) {
  const currentHeadCell = headCells.get(id);

  if (!currentHeadCell) {
    throw new Error(`Missing ${axis} header "${id}".`);
  }

  return currentHeadCell;
}

export function assertHeadId(axis: "row" | "column", expectedId: string, nextId: string) {
  if (expectedId === nextId) return;

  throw new Error(
    `${axis === "row" ? "Row" : "Column"} header ids cannot change from "${expectedId}" to "${nextId}".`,
  );
}

function normalizeGridHead<THeadInput extends GridHeadInput>(
  head: THeadInput,
  index: number,
) {
  if (typeof head === "string") {
    return {
      id: head,
      label: head,
      order: index,
    } as ResolvedGridHead<THeadInput>;
  }

  const objectHead = head as Exclude<THeadInput, string> & GridHeadObject;

  return {
    ...objectHead,
    order: objectHead.order ?? index,
  } as unknown as ResolvedGridHead<THeadInput>;
}
