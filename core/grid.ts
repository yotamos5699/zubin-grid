import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { cell } from "./cell.js";
import { createGridPersistController, defaultGridPersistAdapter } from "./persist.js";

import type { Cell, Subscriber, Updater } from "./types/cell.types.js";
import type {
  AnyGrid,
  BroadSchemaColumnHead,
  BroadSchemaRowHead,
  BroadSchemaSnapshot,
  CreateSubGridOptions,
  Grid,
  GridAxisIds,
  GridColumnIdOf,
  GridColumnHeadOf,
  GridInitialCellEntry,
  GridPersistOption,
  GridPosition,
  GridRecord,
  GridRowIdOf,
  GridRowHeadOf,
  GridSchemaOptions,
  GridSetMode,
  GridState,
  GridStateAdapter,
  GridStateCell,
  InternalGridCellSetter,
  ParentSubGrid,
  ParentSubGridOptions,
  ParentSubGridState,
  GridStateInitializer,
  GridSubscriber,
  GridUpdateDiff,
  GridUpsertHead,
  SchemaCell,
  SchemaCellValue,
  SchemaColumn,
  SchemaColumnHead,
  SchemaColumnId,
  SchemaRow,
  SchemaRowHead,
  SchemaRowId,
  SchemaSnapshot,
  SubGrid,
  SubGridState,
  UseGridOptions,
} from "./types/grid.types.js";

import {
  assertHeadId,
  createHeadCellMap,
  createHeadOrderIndex,
  getHeadCell,
  getOrderedHeads,
} from "./head.js";
import { createTailCellMap, getTailCell, setTailCellResult } from "./tail.js";

import type { GridHead } from "./types/head.types.js";
import type { GridAxisCell, GridAxisTailUpdater, GridTailState } from "./types/tail.types.js";

export type {
  CreateSubGridOptions,
  Grid,
  GridAxisIds,
  GridPersistAdapter,
  GridPersistOption,
  GridPosition,
  GridRows,
  GridSchemaOptions,
  GridSetMode,
  GridState,
  GridStateCell,
  GridStateInitializer,
  GridSubscriber,
  GridUpdateAction,
  GridUpdateDiff,
  GridUpdateSource,
  GridUpdateType,
  GridUpsertHead,
  SubGrid,
  SubGridState,
  UseGridOptions,
} from "./types/grid.types.js";

export function grid<TState extends GridState<GridRecord, GridRecord, GridRecord>>(
  source: GridStateInitializer<TState>,
  options: GridSchemaOptions<
    TState,
    keyof SchemaRow<TState> & string,
    keyof SchemaColumn<TState> & string,
    keyof SchemaCell<TState> & string,
    keyof SchemaCell<TState> & string,
    BroadSchemaSnapshot<TState>
  >,
): Grid<
  SchemaCell<TState>,
  string,
  string,
  BroadSchemaRowHead<TState>,
  BroadSchemaColumnHead<TState>,
  SchemaCell<TState>,
  BroadSchemaSnapshot<TState>
>;

export function grid<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TRowHeadIdKey extends keyof SchemaRow<TState> & string,
  TColumnHeadIdKey extends keyof SchemaColumn<TState> & string,
  TRowCellKey extends keyof SchemaCell<TState> & string,
  TColumnCellKey extends keyof SchemaCell<TState> & string,
>(
  source: GridStateInitializer<TState>,
  options: GridSchemaOptions<
    TState,
    TRowHeadIdKey,
    TColumnHeadIdKey,
    TRowCellKey,
    TColumnCellKey,
    SchemaSnapshot<TState, TRowHeadIdKey, TColumnHeadIdKey, TRowCellKey, TColumnCellKey>
  >,
): Grid<
  SchemaCellValue<TState, TRowHeadIdKey, TColumnHeadIdKey, TRowCellKey, TColumnCellKey>,
  SchemaRowId<TState, TRowHeadIdKey>,
  SchemaColumnId<TState, TColumnHeadIdKey>,
  SchemaRowHead<TState, TRowHeadIdKey>,
  SchemaColumnHead<TState, TColumnHeadIdKey>,
  SchemaCellValue<TState, TRowHeadIdKey, TColumnHeadIdKey, TRowCellKey, TColumnCellKey>,
  SchemaSnapshot<TState, TRowHeadIdKey, TColumnHeadIdKey, TRowCellKey, TColumnCellKey>
>;

export function grid(input: unknown, options: unknown) {
  const schemaOptions = options as GridSchemaOptions<
    GridState<GridRecord, GridRecord, GridRecord>,
    string,
    string,
    string,
    string,
    any
  >;
  const initialState = normalizeGridState(
    resolveGridStateInitializer(
      input as GridStateInitializer<GridState<GridRecord, GridRecord, GridRecord>>,
    ),
  );
  const [rowHeadIdKey, rowCellKey] = schemaOptions.rowHeaders;
  const [columnHeadIdKey, columnCellKey] = schemaOptions.colHeaders;
  const normalizedRowHeads = normalizeRecordHeads(initialState.rows, rowHeadIdKey);
  const normalizedColumnHeads = normalizeRecordHeads(
    initialState.columns,
    columnHeadIdKey,
  );
  const stateAdapter = createSchemaStateAdapter(rowCellKey, columnCellKey);

  return createGridStore(
    normalizedRowHeads,
    normalizedColumnHeads,
    createGridInitialCellsFromState(initialState.cells, stateAdapter),
    stateAdapter,
    schemaOptions.persist as GridPersistOption<any> | undefined,
  );
}

export function createSubGrid<TCell, TParentGrid extends AnyGrid = AnyGrid>(
  parentGrid: TParentGrid,
): ParentSubGrid<TCell, TParentGrid>;
export function createSubGrid<TCell, TParentGrid extends AnyGrid = AnyGrid>(
  parentGrid: TParentGrid,
  initialCells: readonly GridStateCell<
    TCell,
    GridRowIdOf<TParentGrid>,
    GridColumnIdOf<TParentGrid>
  >[],
  persist?: GridPersistOption<ParentSubGridState<TCell, TParentGrid>>,
): ParentSubGrid<TCell, TParentGrid>;
export function createSubGrid<TCell, TParentGrid extends AnyGrid = AnyGrid>(
  parentGrid: TParentGrid,
  persist: GridPersistOption<ParentSubGridState<TCell, TParentGrid>>,
): ParentSubGrid<TCell, TParentGrid>;
export function createSubGrid<TCell, TParentGrid extends AnyGrid = AnyGrid>(
  parentGrid: TParentGrid,
  options: ParentSubGridOptions<TCell, TParentGrid>,
): ParentSubGrid<TCell, TParentGrid>;
export function createSubGrid<
  TCell,
  TParentCell = unknown,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
  TParentStateCell = GridStateCell<TParentCell, TRowId, TColumnId>,
  TParentState extends GridState<TParentStateCell, TRowHead, TColumnHead> = GridState<
    TParentStateCell,
    TRowHead,
    TColumnHead
  >,
>(
  parentGrid: Grid<
    TParentCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead,
    TParentStateCell,
    TParentState
  >,
  cellsOrOptionsOrPersist?:
    | readonly GridStateCell<TCell, TRowId, TColumnId>[]
    | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
    | CreateSubGridOptions<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
  persist?: GridPersistOption<
    SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
  >,
): SubGrid<TCell, TRowId, TColumnId, TRowHead, TColumnHead> {
  const { initialCells, persistOption } = resolveCreateSubGridArgs<
    TCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead
  >(
    cellsOrOptionsOrPersist,
    persist,
  );
  const parentState = parentGrid.getState();
  const stateAdapter = createGridStateCellAdapter<TCell, TRowId, TColumnId>();
  const resolvedInitialCells = assertGridStateCellsWithinAxes(
    initialCells,
    parentState.rows,
    parentState.columns,
    "Sub grid cells",
  );
  const subGridStore = createGridStore<
    TCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead,
    GridStateCell<TCell, TRowId, TColumnId>,
    SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
  >(
    parentState.rows,
    parentState.columns,
    createGridInitialCellsFromState<
      TCell,
      TRowId,
      TColumnId,
      GridStateCell<TCell, TRowId, TColumnId>
    >(resolvedInitialCells, stateAdapter),
    stateAdapter,
    createSubGridPersistOption(parentGrid, persistOption),
  );

  const getSubGridState = () => {
    const nextParentState = parentGrid.getState();

    return createSubGridState(
      nextParentState.rows,
      nextParentState.columns,
      subGridStore.getState().cells,
    );
  };

  const syncAxesFromParent = () => {
    const nextParentState = parentGrid.getState();
    const currentSubGridState = subGridStore.getState();
    const nextCells = filterGridStateCellsToAxes(
      currentSubGridState.cells,
      nextParentState.rows,
      nextParentState.columns,
    );

    if (
      haveSameHeadSnapshots(currentSubGridState.rows, nextParentState.rows) &&
      haveSameHeadSnapshots(currentSubGridState.columns, nextParentState.columns) &&
      nextCells.length === currentSubGridState.cells.length
    ) {
      return;
    }

    subGridStore.setGrid(
      {
        rows: nextParentState.rows,
        columns: nextParentState.columns,
        cells: nextCells,
      },
      "replace",
    );
  };

  void parentGrid.subscribeGrid((_currentParentGrid, diff) => {
    if (diff.type === "row-head" && diff.rows?.length) {
      diff.rows.forEach((rowHead) => {
        subGridStore.updateRowHead(rowHead.id, rowHead);
      });

      return;
    }

    if (diff.type === "column-head" && diff.columns?.length) {
      diff.columns.forEach((columnHead) => {
        subGridStore.updateColumnHead(columnHead.id, columnHead);
      });

      return;
    }

    if (diff.type === "rows" && diff.rows?.length) {
      subGridStore.upsertRows(diff.rows);
      return;
    }

    if (diff.type === "columns" && diff.columns?.length) {
      subGridStore.upsertColumns(diff.columns);
      return;
    }

    if (diff.type === "grid" && didGridDiffAffectAxes(diff)) {
      syncAxesFromParent();
    }
  });

  const subGridApi = Object.create(subGridStore) as SubGrid<
    TCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead
  > &
    InternalGridCellSetter<TCell, TRowId, TColumnId>;

  Object.defineProperties(subGridApi, {
    rowHeaders: {
      enumerable: true,
      configurable: true,
      get: () => parentGrid.rowHeaders,
    },
    colHeaders: {
      enumerable: true,
      configurable: true,
      get: () => parentGrid.colHeaders,
    },
  });

  subGridApi.getState = getSubGridState;
  subGridApi.getRowHead = (rowId) => parentGrid.getRowHead(rowId);
  subGridApi.getColumnHead = (columnId) => parentGrid.getColumnHead(columnId);
  subGridApi.updateRowHead = (rowId, nextRowHead) => {
    parentGrid.updateRowHead(rowId, nextRowHead);
  };
  subGridApi.updateColumnHead = (columnId, nextColumnHead) => {
    parentGrid.updateColumnHead(columnId, nextColumnHead);
  };
  subGridApi.upsertRow = (nextRowHead) => {
    parentGrid.upsertRow(nextRowHead);
  };
  subGridApi.upsertRows = (nextRowHeads) => {
    parentGrid.upsertRows(nextRowHeads);
  };
  subGridApi.upsertColumn = (nextColumnHead) => {
    parentGrid.upsertColumn(nextColumnHead);
  };
  subGridApi.upsertColumns = (nextColumnHeads) => {
    parentGrid.upsertColumns(nextColumnHeads);
  };
  subGridApi.subscribeRowHead = (rowId, callback) =>
    parentGrid.subscribeRowHead(rowId, callback);
  subGridApi.subscribeColumnHead = (columnId, callback) =>
    parentGrid.subscribeColumnHead(columnId, callback);
  subGridApi.setGrid = (nextState, mode = "replace") => {
    const patch = normalizeGridStatePatchInput(nextState);
    const currentParentState = parentGrid.getState();

    if (mode === "update") {
      if (patch.rows?.length) {
        parentGrid.upsertRows(patch.rows);
      }

      if (patch.columns?.length) {
        parentGrid.upsertColumns(patch.columns);
      }

      if (patch.cells?.length) {
        subGridStore.setGrid(
          {
            rows: currentParentState.rows,
            columns: currentParentState.columns,
            cells: assertGridStateCellsWithinAxes(
              patch.cells,
              currentParentState.rows,
              currentParentState.columns,
              "Sub grid cells",
            ),
          },
          "update",
        );
      }

      return;
    }

    if (
      (patch.rows && !haveSameHeadSnapshots(patch.rows, currentParentState.rows)) ||
      (patch.columns && !haveSameHeadSnapshots(patch.columns, currentParentState.columns))
    ) {
      throw new Error(
        "Sub grids inherit rows and columns from their parent. Replace parent dimensions on the parent grid instead.",
      );
    }

    subGridStore.setGrid(
      {
        rows: currentParentState.rows,
        columns: currentParentState.columns,
        cells: assertGridStateCellsWithinAxes(
          patch.cells ?? [],
          currentParentState.rows,
          currentParentState.columns,
          "Sub grid cells",
        ),
      },
      "replace",
    );
  };
  subGridApi.clearGrid = () => {
    subGridStore.clearCells();
  };

  return subGridApi;
}

function createGridStore<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  initialRows: readonly TRowHead[],
  initialColumns: readonly TColumnHead[],
  initialCells: readonly GridInitialCellEntry<TCell, TRowId, TColumnId>[],
  stateAdapter: GridStateAdapter<TCell, TRowId, TColumnId, TStateCell>,
  persist?: GridPersistOption<TState>,
): Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState> {
  assertUniqueHeadIds(initialRows, "row");
  assertUniqueHeadIds(initialColumns, "column");

  const rowHeadOrder = createHeadOrderIndex(initialRows);
  const columnHeadOrder = createHeadOrderIndex(initialColumns);
  const rowHeadCells = createHeadCellMap<TRowId, TRowHead>(initialRows);
  const columnHeadCells = createHeadCellMap<TColumnId, TColumnHead>(initialColumns);
  const rowTailCells = createTailCellMap<TRowId>(initialRows);
  const columnTailCells = createTailCellMap<TColumnId>(initialColumns);
  const rowTailUpdaters = new Map<
    TRowId,
    GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>
  >();
  const columnTailUpdaters = new Map<
    TColumnId,
    GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>
  >();
  const cellsMap = new Map<string, Cell<TCell>>();
  const cellSubscriptions = new Map<string, () => void>();
  const gridSubscribers = new Set<
    GridSubscriber<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>
  >();

  let nextRowFallbackOrder = initialRows.length;
  let nextColumnFallbackOrder = initialColumns.length;
  let isApplyingState = false;

  const getOrderedRowHeads = () => getOrderedHeads(rowHeadCells, rowHeadOrder);
  const getOrderedColumnHeads = () => getOrderedHeads(columnHeadCells, columnHeadOrder);
  let axisIdsSnapshot: GridAxisIds<TRowId, TColumnId> = {
    rows: getOrderedRowHeads().map((rowHead) => rowHead.id),
    cols: getOrderedColumnHeads().map((columnHead) => columnHead.id),
  };

  let gridApi!: Grid<
    TCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead,
    TStateCell,
    TState
  > &
    InternalGridCellSetter<TCell, TRowId, TColumnId>;

  const refreshAxisIdsSnapshot = () => {
    const nextRows = getOrderedRowHeads().map((rowHead) => rowHead.id);
    const nextCols = getOrderedColumnHeads().map((columnHead) => columnHead.id);

    if (
      haveSameItems(axisIdsSnapshot.rows, nextRows) &&
      haveSameItems(axisIdsSnapshot.cols, nextCols)
    ) {
      return axisIdsSnapshot;
    }

    axisIdsSnapshot = {
      rows: nextRows,
      cols: nextCols,
    };

    return axisIdsSnapshot;
  };

  const normalizeCellValue = (rowId: TRowId, columnId: TColumnId, value: TCell) => {
    return stateAdapter.deserializeCell(
      stateAdapter.serializeCell(rowId, columnId, value),
    ).value;
  };

  const recomputeRowTailInternal = (rowId: TRowId) => {
    const onRowUpdate = rowTailUpdaters.get(rowId);

    if (!onRowUpdate) return false;

    return setTailCellResult(
      getTailCell(rowTailCells, rowId, "row"),
      onRowUpdate(getRowCells(rowId)),
    );
  };

  const recomputeColumnTailInternal = (columnId: TColumnId) => {
    const onColumnUpdate = columnTailUpdaters.get(columnId);

    if (!onColumnUpdate) return false;

    return setTailCellResult(
      getTailCell(columnTailCells, columnId, "column"),
      onColumnUpdate(getColumnCells(columnId)),
    );
  };

  const recomputeAllRowTails = () => {
    const changedRowIds: TRowId[] = [];

    getOrderedRowHeads().forEach((rowHead) => {
      if (recomputeRowTailInternal(rowHead.id)) {
        changedRowIds.push(rowHead.id);
      }
    });

    return changedRowIds;
  };

  const recomputeAllColumnTails = () => {
    const changedColumnIds: TColumnId[] = [];

    getOrderedColumnHeads().forEach((columnHead) => {
      if (recomputeColumnTailInternal(columnHead.id)) {
        changedColumnIds.push(columnHead.id);
      }
    });

    return changedColumnIds;
  };

  const detachCell = (gridKey: string) => {
    cellSubscriptions.get(gridKey)?.();
    cellSubscriptions.delete(gridKey);
    cellsMap.delete(gridKey);
  };

  const attachCell = (rowId: TRowId, columnId: TColumnId, currentCell: Cell<TCell>) => {
    if (!rowHeadCells.has(rowId)) throw new Error(`Missing row header "${rowId}".`);

    if (!columnHeadCells.has(columnId))
      throw new Error(`Missing column header "${columnId}".`);

    const gridKey = createGridKey(rowId, columnId);

    if (cellsMap.has(gridKey))
      throw new Error(`Duplicate cell for row "${rowId}" and column "${columnId}".`);

    cellsMap.set(gridKey, currentCell);
    let previousValue = currentCell.get();

    const unsubscribe = currentCell.subscribe(() => {
      const nextValue = currentCell.get();

      if (isApplyingState) {
        previousValue = nextValue;
        return;
      }

      const rowTailIds = recomputeRowTailInternal(rowId) ? [rowId] : [];
      const columnTailIds = recomputeColumnTailInternal(columnId) ? [columnId] : [];

      emitGridUpdate(
        {
          type: "cells",
          action: "update",
          source: "cell.set",
          rowIds: [rowId],
          columnIds: [columnId],
          rowTailIds: toOptionalArray(rowTailIds),
          columnTailIds: toOptionalArray(columnTailIds),
          cellKeys: [gridKey],
          cells: [stateAdapter.serializeCell(rowId, columnId, nextValue)],
          previousCells: [stateAdapter.serializeCell(rowId, columnId, previousValue)],
        },
        true,
      );

      previousValue = nextValue;
    });

    cellSubscriptions.set(gridKey, unsubscribe);
  };

  const getCell = (rowId: TRowId, columnId: TColumnId) => {
    const currentCell = cellsMap.get(createGridKey(rowId, columnId));

    if (!currentCell)
      throw new Error(`Missing cell for row "${rowId}" and column "${columnId}".`);

    return currentCell;
  };

  const createAxisCellSnapshot = (rowId: TRowId, columnId: TColumnId) => {
    const currentCell = getCell(rowId, columnId);

    return {
      id: createGridKey(rowId, columnId),
      rowId,
      columnId,
      value: currentCell.get(),
      cell: currentCell,
    } satisfies GridAxisCell<TCell, TRowId, TColumnId>;
  };

  const getRowCells = (rowId: TRowId) =>
    getOrderedColumnHeads().flatMap((columnHead) => {
      if (!cellsMap.has(createGridKey(rowId, columnHead.id))) return [];

      return [createAxisCellSnapshot(rowId, columnHead.id)];
    });

  const getColumnCells = (columnId: TColumnId) =>
    getOrderedRowHeads().flatMap((rowHead) => {
      if (!cellsMap.has(createGridKey(rowHead.id, columnId))) return [];

      return [createAxisCellSnapshot(rowHead.id, columnId)];
    });

  const syncAxisHeads = <TId extends string, THead extends GridHead<TId>>(
    nextHeads: readonly THead[],
    axis: "row" | "column",
    headCells: Map<TId, Cell<THead>>,
    tailCells: Map<TId, Cell<GridTailState<unknown>>>,
    headOrder: Map<TId, number>,
    onRemove?: (id: TId) => void,
  ) => {
    assertUniqueHeadIds(nextHeads, axis);

    const nextIds = new Set<TId>();

    nextHeads.forEach((nextHead, index) => {
      nextIds.add(nextHead.id);

      const currentHeadCell = headCells.get(nextHead.id);

      if (currentHeadCell) currentHeadCell.set(nextHead);
      else headCells.set(nextHead.id, cell(nextHead));

      if (!tailCells.has(nextHead.id))
        tailCells.set(nextHead.id, cell(createEmptyTailState()));

      headOrder.set(nextHead.id, index);
    });

    [...headCells.keys()].forEach((id) => {
      if (nextIds.has(id)) return;

      headCells.delete(id);
      tailCells.delete(id);
      headOrder.delete(id);
      onRemove?.(id);
    });
  };

  const replaceState = (nextState: TState) => {
    isApplyingState = true;

    try {
      syncAxisHeads(
        nextState.rows,
        "row",
        rowHeadCells,
        rowTailCells,
        rowHeadOrder,
        (id) => {
          rowTailUpdaters.delete(id as TRowId);
        },
      );
      syncAxisHeads(
        nextState.columns,
        "column",
        columnHeadCells,
        columnTailCells,
        columnHeadOrder,
        (id) => {
          columnTailUpdaters.delete(id as TColumnId);
        },
      );

      const nextCells = new Map<
        string,
        {
          rowId: TRowId;
          columnId: TColumnId;
          value: TCell;
        }
      >();

      nextState.cells.forEach((nextStateCell) => {
        const { rowId, columnId, value } = stateAdapter.deserializeCell(nextStateCell);

        if (!rowHeadCells.has(rowId)) {
          throw new Error(`Missing row header "${rowId}".`);
        }

        if (!columnHeadCells.has(columnId)) {
          throw new Error(`Missing column header "${columnId}".`);
        }

        const gridKey = createGridKey(rowId, columnId);

        if (nextCells.has(gridKey)) {
          throw new Error(`Duplicate cell for row "${rowId}" and column "${columnId}".`);
        }

        nextCells.set(gridKey, {
          rowId,
          columnId,
          value: normalizeCellValue(rowId, columnId, value),
        });
      });

      [...cellsMap.keys()].forEach((gridKey) => {
        if (!nextCells.has(gridKey)) {
          detachCell(gridKey);
        }
      });

      nextCells.forEach(({ rowId, columnId, value }, gridKey) => {
        const currentCell = cellsMap.get(gridKey);

        if (currentCell) {
          currentCell.set(value);
        } else {
          attachCell(rowId, columnId, cell(value));
        }
      });

      nextRowFallbackOrder = rowHeadCells.size;
      nextColumnFallbackOrder = columnHeadCells.size;
    } finally {
      isApplyingState = false;
    }

    const rowTailIds = recomputeAllRowTails();
    const columnTailIds = recomputeAllColumnTails();
    refreshAxisIdsSnapshot();

    return {
      rowTailIds,
      columnTailIds,
    };
  };

  const { hydrate, markStateChanged } = createGridPersistController(persist, {
    getState,
    replaceState,
    isApplyingState: () => isApplyingState,
  });

  const emitGridUpdate = (
    diff: GridUpdateDiff<TRowId, TColumnId, TRowHead, TColumnHead, TStateCell>,
    persistStateChanged = false,
  ) => {
    refreshAxisIdsSnapshot();

    if (persistStateChanged) {
      markStateChanged();
    }

    [...gridSubscribers].forEach((callback) => {
      callback(gridApi, diff);
    });
  };

  const applyCellUpserts = (nextCells: readonly TStateCell[]) => {
    if (nextCells.length === 0) {
      return null;
    }

    const touchedRowIds = new Set<TRowId>();
    const touchedColumnIds = new Set<TColumnId>();
    const normalizedCells: TStateCell[] = [];
    const previousCells: TStateCell[] = [];
    const cellKeys: string[] = [];

    isApplyingState = true;

    try {
      nextCells.forEach((nextStateCell) => {
        const { rowId, columnId, value } = stateAdapter.deserializeCell(nextStateCell);

        if (!rowHeadCells.has(rowId)) throw new Error(`Missing row header "${rowId}".`);

        if (!columnHeadCells.has(columnId))
          throw new Error(`Missing column header "${columnId}".`);

        const normalizedValue = normalizeCellValue(rowId, columnId, value);
        const gridKey = createGridKey(rowId, columnId);
        const currentCell = cellsMap.get(gridKey);

        if (currentCell) {
          previousCells.push(
            stateAdapter.serializeCell(rowId, columnId, currentCell.get()),
          );
          currentCell.set(normalizedValue);
        } else {
          attachCell(rowId, columnId, cell(normalizedValue));
        }

        normalizedCells.push(
          stateAdapter.serializeCell(rowId, columnId, normalizedValue),
        );
        touchedRowIds.add(rowId);
        touchedColumnIds.add(columnId);
        cellKeys.push(gridKey);
      });
    } finally {
      isApplyingState = false;
    }

    const rowIds = [...touchedRowIds];
    const columnIds = [...touchedColumnIds];

    return {
      rowIds,
      columnIds,
      rowTailIds: rowIds.filter((rowId) => recomputeRowTailInternal(rowId)),
      columnTailIds: columnIds.filter((columnId) =>
        recomputeColumnTailInternal(columnId),
      ),
      cells: normalizedCells,
      previousCells,
      cellKeys,
    };
  };

  const emitCellUpsert = (
    source: "upsertCell" | "upsertCells",
    nextCells: readonly TStateCell[],
  ) => {
    const result = applyCellUpserts(nextCells);

    if (!result) {
      return;
    }

    emitGridUpdate(
      {
        type: "cells",
        action: "upsert",
        source,
        rowIds: result.rowIds,
        columnIds: result.columnIds,
        rowTailIds: toOptionalArray(result.rowTailIds),
        columnTailIds: toOptionalArray(result.columnTailIds),
        cellKeys: result.cellKeys,
        cells: result.cells,
        previousCells: toOptionalArray(result.previousCells),
      },
      true,
    );
  };

  const applyRowUpserts = (nextRowHeads: readonly GridUpsertHead<TRowHead>[]) => {
    if (nextRowHeads.length === 0) {
      return null;
    }

    const rowIds = new Set<TRowId>();
    const rows: TRowHead[] = [];
    const previousRows: TRowHead[] = [];
    let shouldRecomputeColumns = false;

    nextRowHeads.forEach((nextRowHead) => {
      const rowHeadLike = nextRowHead as GridRecord & { id: TRowId };

      if (typeof rowHeadLike.id !== "string") {
        throw new Error("Row header upserts must include a string id.");
      }

      const currentHeadCell = rowHeadCells.get(rowHeadLike.id);
      const currentHead = currentHeadCell?.get();
      const resolvedHead = normalizeUpsertHead(
        rowHeadLike,
        currentHead,
        nextRowFallbackOrder,
      ) as TRowHead;

      if (currentHeadCell) {
        currentHeadCell.set(resolvedHead);
      } else {
        rowHeadCells.set(resolvedHead.id, cell(resolvedHead));
        rowTailCells.set(resolvedHead.id, cell(createEmptyTailState()));
        rowHeadOrder.set(resolvedHead.id, nextRowFallbackOrder);
        nextRowFallbackOrder += 1;
      }

      rows.push(resolvedHead);

      if (currentHead) {
        previousRows.push(currentHead);
      }

      rowIds.add(resolvedHead.id);
      shouldRecomputeColumns ||= !currentHead || currentHead.order !== resolvedHead.order;
    });

    const resolvedRowIds = [...rowIds];

    return {
      rows,
      previousRows,
      rowIds: resolvedRowIds,
      rowTailIds: resolvedRowIds.filter((rowId) => recomputeRowTailInternal(rowId)),
      columnTailIds: shouldRecomputeColumns ? recomputeAllColumnTails() : [],
    };
  };

  const emitRowUpserts = (
    source: "upsertRow" | "upsertRows",
    nextRowHeads: readonly GridUpsertHead<TRowHead>[],
  ) => {
    const result = applyRowUpserts(nextRowHeads);

    if (!result) {
      return;
    }

    emitGridUpdate(
      {
        type: "rows",
        action: "upsert",
        source,
        rowIds: result.rowIds,
        rowTailIds: toOptionalArray(result.rowTailIds),
        columnTailIds: toOptionalArray(result.columnTailIds),
        rows: result.rows,
        previousRows: toOptionalArray(result.previousRows),
      },
      true,
    );
  };

  const applyColumnUpserts = (
    nextColumnHeads: readonly GridUpsertHead<TColumnHead>[],
  ) => {
    if (nextColumnHeads.length === 0) {
      return null;
    }

    const columnIds = new Set<TColumnId>();
    const columns: TColumnHead[] = [];
    const previousColumns: TColumnHead[] = [];
    let shouldRecomputeRows = false;

    nextColumnHeads.forEach((nextColumnHead) => {
      const columnHeadLike = nextColumnHead as GridRecord & { id: TColumnId };

      if (typeof columnHeadLike.id !== "string") {
        throw new Error("Column header upserts must include a string id.");
      }

      const currentHeadCell = columnHeadCells.get(columnHeadLike.id);
      const currentHead = currentHeadCell?.get();
      const resolvedHead = normalizeUpsertHead(
        columnHeadLike,
        currentHead,
        nextColumnFallbackOrder,
      ) as TColumnHead;

      if (currentHeadCell) {
        currentHeadCell.set(resolvedHead);
      } else {
        columnHeadCells.set(resolvedHead.id, cell(resolvedHead));
        columnTailCells.set(resolvedHead.id, cell(createEmptyTailState()));
        columnHeadOrder.set(resolvedHead.id, nextColumnFallbackOrder);
        nextColumnFallbackOrder += 1;
      }

      columns.push(resolvedHead);

      if (currentHead) {
        previousColumns.push(currentHead);
      }

      columnIds.add(resolvedHead.id);
      shouldRecomputeRows ||= !currentHead || currentHead.order !== resolvedHead.order;
    });

    const resolvedColumnIds = [...columnIds];

    return {
      columns,
      previousColumns,
      columnIds: resolvedColumnIds,
      rowTailIds: shouldRecomputeRows ? recomputeAllRowTails() : [],
      columnTailIds: resolvedColumnIds.filter((columnId) =>
        recomputeColumnTailInternal(columnId),
      ),
    };
  };

  const emitColumnUpserts = (
    source: "upsertColumn" | "upsertColumns",
    nextColumnHeads: readonly GridUpsertHead<TColumnHead>[],
  ) => {
    const result = applyColumnUpserts(nextColumnHeads);

    if (!result) {
      return;
    }

    emitGridUpdate(
      {
        type: "columns",
        action: "upsert",
        source,
        columnIds: result.columnIds,
        rowTailIds: toOptionalArray(result.rowTailIds),
        columnTailIds: toOptionalArray(result.columnTailIds),
        columns: result.columns,
        previousColumns: toOptionalArray(result.previousColumns),
      },
      true,
    );
  };

  initialCells.forEach(({ rowId, columnId, cell: currentCell }) => {
    attachCell(rowId, columnId, currentCell);
  });

  hydrate();

  const updateRowHead = (rowId: TRowId, nextRowHead: Updater<TRowHead>) => {
    const currentHeadCell = getHeadCell(rowHeadCells, rowId, "row");
    const currentHead = currentHeadCell.get();
    const resolvedHead = resolveUpdater(nextRowHead, currentHead);

    assertHeadId("row", rowId, resolvedHead.id);
    currentHeadCell.set(resolvedHead);

    const columnTailIds =
      currentHead.order === resolvedHead.order ? [] : recomputeAllColumnTails();

    emitGridUpdate(
      {
        type: "row-head",
        action: "update",
        source: "updateRowHead",
        rowIds: [rowId],
        columnTailIds: toOptionalArray(columnTailIds),
        rows: [resolvedHead],
        previousRows: [currentHead],
      },
      true,
    );
  };

  const updateColumnHead = (
    columnId: TColumnId,
    nextColumnHead: Updater<TColumnHead>,
  ) => {
    const currentHeadCell = getHeadCell(columnHeadCells, columnId, "column");
    const currentHead = currentHeadCell.get();
    const resolvedHead = resolveUpdater(nextColumnHead, currentHead);

    assertHeadId("column", columnId, resolvedHead.id);
    currentHeadCell.set(resolvedHead);

    const rowTailIds =
      currentHead.order === resolvedHead.order ? [] : recomputeAllRowTails();

    emitGridUpdate(
      {
        type: "column-head",
        action: "update",
        source: "updateColumnHead",
        columnIds: [columnId],
        rowTailIds: toOptionalArray(rowTailIds),
        columns: [resolvedHead],
        previousColumns: [currentHead],
      },
      true,
    );
  };

  const upsertRow = (nextRowHead: GridUpsertHead<TRowHead>) => {
    emitRowUpserts("upsertRow", [nextRowHead]);
  };

  const upsertRows = (nextRowHeads: readonly GridUpsertHead<TRowHead>[]) => {
    emitRowUpserts("upsertRows", nextRowHeads);
  };

  const upsertColumn = (nextColumnHead: GridUpsertHead<TColumnHead>) => {
    emitColumnUpserts("upsertColumn", [nextColumnHead]);
  };

  const upsertColumns = (nextColumnHeads: readonly GridUpsertHead<TColumnHead>[]) => {
    emitColumnUpserts("upsertColumns", nextColumnHeads);
  };

  const upsertCells = (nextCells: readonly TStateCell[]) => {
    emitCellUpsert("upsertCells", nextCells);
  };

  const upsertCell = (nextCell: TStateCell) => {
    emitCellUpsert("upsertCell", [nextCell]);
  };

  function getState() {
    const rows = getOrderedRowHeads();
    const columns = getOrderedColumnHeads();
    const cells = rows.flatMap((rowHead) =>
      columns.flatMap((columnHead) => {
        const currentCell = cellsMap.get(createGridKey(rowHead.id, columnHead.id));

        if (!currentCell) {
          return [];
        }

        return [stateAdapter.serializeCell(rowHead.id, columnHead.id, currentCell.get())];
      }),
    );

    return {
      rows,
      columns,
      cells,
    } as unknown as TState;
  }

  const updateRowTail = (rowId: TRowId, nextRowTail: Updater<unknown | null>) => {
    const currentTailCell = getTailCell(rowTailCells, rowId, "row");
    const currentTailState = currentTailCell.get();
    const currentTailValue = currentTailState.isReactive ? currentTailState.value : null;

    if (
      !setTailCellResult(currentTailCell, resolveUpdater(nextRowTail, currentTailValue))
    ) {
      return;
    }

    emitGridUpdate({
      type: "row-tail",
      action: "update",
      source: "updateRowTail",
      rowIds: [rowId],
      rowTailIds: [rowId],
    });
  };

  const updateColumnTail = (
    columnId: TColumnId,
    nextColumnTail: Updater<unknown | null>,
  ) => {
    const currentTailCell = getTailCell(columnTailCells, columnId, "column");
    const currentTailState = currentTailCell.get();
    const currentTailValue = currentTailState.isReactive ? currentTailState.value : null;

    if (
      !setTailCellResult(
        currentTailCell,
        resolveUpdater(nextColumnTail, currentTailValue),
      )
    ) {
      return;
    }

    emitGridUpdate({
      type: "column-tail",
      action: "update",
      source: "updateColumnTail",
      columnIds: [columnId],
      columnTailIds: [columnId],
    });
  };

  function registerRowTail<TTail>(
    rowId: TRowId,
    onRowUpdate: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
  ) {
    rowTailUpdaters.set(
      rowId,
      onRowUpdate as GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>,
    );
    recomputeRowTailInternal(rowId);

    return () => {
      if (rowTailUpdaters.get(rowId) !== onRowUpdate) {
        return;
      }

      rowTailUpdaters.delete(rowId);
    };
  }

  function registerColumnTail<TTail>(
    columnId: TColumnId,
    onColumnUpdate: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
  ) {
    columnTailUpdaters.set(
      columnId,
      onColumnUpdate as GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>,
    );
    recomputeColumnTailInternal(columnId);

    return () => {
      if (columnTailUpdaters.get(columnId) !== onColumnUpdate) {
        return;
      }

      columnTailUpdaters.delete(columnId);
    };
  }

  const setGrid = (
    nextState: TState | Partial<TState>,
    mode: GridSetMode = "replace",
  ) => {
    const previousState = getState();

    if (mode === "update") {
      const patch = normalizeGridStatePatchInput(nextState);

      if (!hasGridStatePatch(patch)) {
        return;
      }

      const mergedState = {
        rows: patch.rows
          ? mergeHeadStates(previousState.rows, patch.rows as readonly TRowHead[])
          : previousState.rows,
        columns: patch.columns
          ? mergeHeadStates(
              previousState.columns,
              patch.columns as readonly TColumnHead[],
            )
          : previousState.columns,
        cells: patch.cells
          ? mergeCellStates(
              previousState.cells,
              patch.cells as readonly TStateCell[],
              stateAdapter,
            )
          : previousState.cells,
      } as TState;

      const { rowTailIds, columnTailIds } = replaceState(mergedState);

      emitGridUpdate(
        {
          type: "grid",
          action: "update",
          source: "setGrid",
          mode,
          rowIds: mergedState.rows.map((rowHead) => rowHead.id),
          columnIds: mergedState.columns.map((columnHead) => columnHead.id),
          rowTailIds: toOptionalArray(rowTailIds),
          columnTailIds: toOptionalArray(columnTailIds),
          rows: mergedState.rows,
          previousRows: previousState.rows,
          columns: mergedState.columns,
          previousColumns: previousState.columns,
          cells: mergedState.cells,
          previousCells: previousState.cells,
        },
        true,
      );

      return;
    }

    const nextSnapshot = normalizeGridStateInput(nextState) as TState;
    const { rowTailIds, columnTailIds } = replaceState(nextSnapshot);

    emitGridUpdate(
      {
        type: "grid",
        action: "replace",
        source: "setGrid",
        mode,
        rowIds: nextSnapshot.rows.map((rowHead) => rowHead.id),
        columnIds: nextSnapshot.columns.map((columnHead) => columnHead.id),
        rowTailIds: toOptionalArray(rowTailIds),
        columnTailIds: toOptionalArray(columnTailIds),
        rows: nextSnapshot.rows,
        previousRows: previousState.rows,
        columns: nextSnapshot.columns,
        previousColumns: previousState.columns,
        cells: nextSnapshot.cells,
        previousCells: previousState.cells,
      },
      true,
    );
  };

  const clearCells = () => {
    const previousState = getState();

    if (previousState.cells.length === 0) {
      return;
    }

    const nextState = {
      rows: previousState.rows,
      columns: previousState.columns,
      cells: [],
    } as unknown as TState;
    const { rowTailIds, columnTailIds } = replaceState(nextState);

    emitGridUpdate(
      {
        type: "cells",
        action: "clear",
        source: "clearCells",
        rowIds: previousState.rows.map((rowHead) => rowHead.id),
        columnIds: previousState.columns.map((columnHead) => columnHead.id),
        rowTailIds: toOptionalArray(rowTailIds),
        columnTailIds: toOptionalArray(columnTailIds),
        cells: [],
        previousCells: previousState.cells,
      },
      true,
    );
  };

  const clearGrid = () => {
    const previousState = getState();

    if (
      previousState.rows.length === 0 &&
      previousState.columns.length === 0 &&
      previousState.cells.length === 0
    ) {
      return;
    }

    const nextState = {
      rows: [],
      columns: [],
      cells: [],
    } as unknown as TState;
    const { rowTailIds, columnTailIds } = replaceState(nextState);

    emitGridUpdate(
      {
        type: "grid",
        action: "clear",
        source: "clearGrid",
        rowIds: previousState.rows.map((rowHead) => rowHead.id),
        columnIds: previousState.columns.map((columnHead) => columnHead.id),
        rowTailIds: toOptionalArray(rowTailIds),
        columnTailIds: toOptionalArray(columnTailIds),
        rows: [],
        previousRows: previousState.rows,
        columns: [],
        previousColumns: previousState.columns,
        cells: [],
        previousCells: previousState.cells,
      },
      true,
    );
  };

  const recomputeRowTail = (rowId: TRowId) => {
    if (!recomputeRowTailInternal(rowId)) {
      return;
    }

    emitGridUpdate({
      type: "row-tail",
      action: "recompute",
      source: "recomputeRowTail",
      rowIds: [rowId],
      rowTailIds: [rowId],
    });
  };

  const recomputeColumnTail = (columnId: TColumnId) => {
    if (!recomputeColumnTailInternal(columnId)) {
      return;
    }

    emitGridUpdate({
      type: "column-tail",
      action: "recompute",
      source: "recomputeColumnTail",
      columnIds: [columnId],
      columnTailIds: [columnId],
    });
  };

  gridApi = {
    get rowHeaders() {
      return refreshAxisIdsSnapshot().rows;
    },
    get colHeaders() {
      return refreshAxisIdsSnapshot().cols;
    },
    getState,
    setGrid,
    getCell,
    getValue: (rowId, columnId) => getCell(rowId, columnId).get(),
    __setCellValue: (rowId, columnId, newValue) => {
      const currentCell = getCell(rowId, columnId);

      isApplyingState = true;

      try {
        currentCell.set(normalizeCellValue(rowId, columnId, newValue));
      } finally {
        isApplyingState = false;
      }

      const rowTailIds = recomputeRowTailInternal(rowId) ? [rowId] : [];
      const columnTailIds = recomputeColumnTailInternal(columnId) ? [columnId] : [];

      emitGridUpdate(
        {
          type: "cells",
          action: "update",
          source: "cell.set",
          rowIds: [rowId],
          columnIds: [columnId],
          rowTailIds: toOptionalArray(rowTailIds),
          columnTailIds: toOptionalArray(columnTailIds),
          cellKeys: [createGridKey(rowId, columnId)],
          cells: [stateAdapter.serializeCell(rowId, columnId, currentCell.get())],
        },
        true,
      );
    },
    hasCell: (rowId, columnId) => cellsMap.has(createGridKey(rowId, columnId)),
    getRowHead: (rowId) => getHeadCell(rowHeadCells, rowId, "row").get(),
    getColumnHead: (columnId) => getHeadCell(columnHeadCells, columnId, "column").get(),
    updateRowHead,
    updateColumnHead,
    upsertRow,
    upsertRows,
    upsertColumn,
    upsertColumns,
    upsertCell,
    upsertCells,
    clearCells,
    clearGrid,
    subscribeGrid: (callback) => {
      gridSubscribers.add(callback);

      return () => {
        gridSubscribers.delete(callback);
      };
    },
    subscribeRowHead: (rowId, callback) =>
      getHeadCell(rowHeadCells, rowId, "row").subscribe(callback),
    subscribeColumnHead: (columnId, callback) =>
      getHeadCell(columnHeadCells, columnId, "column").subscribe(callback),
    getRowCells,
    getColumnCells,
    getRowTailState: <TTail>(rowId: TRowId) =>
      getTailCell(rowTailCells, rowId, "row").get() as GridTailState<TTail>,
    getColumnTailState: <TTail>(columnId: TColumnId) =>
      getTailCell(columnTailCells, columnId, "column").get() as GridTailState<TTail>,
    getRowTail: <TTail>(rowId: TRowId) => {
      const tailState = getTailCell(rowTailCells, rowId, "row").get();

      return tailState.isReactive ? (tailState.value as TTail | null) : null;
    },
    getColumnTail: <TTail>(columnId: TColumnId) => {
      const tailState = getTailCell(columnTailCells, columnId, "column").get();

      return tailState.isReactive ? (tailState.value as TTail | null) : null;
    },
    updateRowTail,
    updateColumnTail,
    subscribeRowTail: (rowId, callback) =>
      getTailCell(rowTailCells, rowId, "row").subscribe(callback),
    subscribeColumnTail: (columnId, callback) =>
      getTailCell(columnTailCells, columnId, "column").subscribe(callback),
    registerRowTail,
    registerColumnTail,
    recomputeRowTail,
    recomputeColumnTail,
  };

  return gridApi;
}

function resolveUpdater<TValue>(nextValue: Updater<TValue>, currentValue: TValue) {
  return typeof nextValue === "function"
    ? (nextValue as (currentValue: TValue) => TValue)(currentValue)
    : nextValue;
}

export function createGridKey(rowId: string, columnId: string) {
  return `${rowId}:${columnId}`;
}

export function useGrid<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  options?: UseGridOptions<
    TCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead,
    TStateCell,
    TState
  >,
): GridAxisIds<TRowId, TColumnId> {
  const snapshotRef = useRef<GridAxisIds<TRowId, TColumnId>>({
    rows: currentGrid.rowHeaders,
    cols: currentGrid.colHeaders,
  });
  const onGridUpdateRef = useRef(options?.onGridUpdate);

  useEffect(() => {
    onGridUpdateRef.current = options?.onGridUpdate;
  }, [options?.onGridUpdate]);

  useEffect(() => {
    return currentGrid.subscribeGrid((updatedGrid, diff) => {
      onGridUpdateRef.current?.(updatedGrid, diff);
    });
  }, [currentGrid]);

  const subscribe = useCallback(
    (callback: Subscriber) => currentGrid.subscribeGrid(() => callback()),
    [currentGrid],
  );
  const getSnapshot = useCallback(() => {
    const nextRows = currentGrid.rowHeaders;
    const nextCols = currentGrid.colHeaders;
    const currentSnapshot = snapshotRef.current;

    if (currentSnapshot.rows === nextRows && currentSnapshot.cols === nextCols) {
      return currentSnapshot;
    }

    const nextSnapshot = {
      rows: nextRows,
      cols: nextCols,
    };

    snapshotRef.current = nextSnapshot;

    return nextSnapshot;
  }, [currentGrid]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function toOptionalArray<TValue>(values: readonly TValue[]) {
  return values.length === 0 ? undefined : values;
}

function haveSameItems<TValue>(left: readonly TValue[], right: readonly TValue[]) {
  return (
    left.length === right.length &&
    left.every((currentValue, index) => Object.is(currentValue, right[index]))
  );
}

function normalizeGridStateInput<TStateCell, TRow, TColumn>(
  value:
    | GridState<TStateCell, TRow, TColumn>
    | Partial<GridState<TStateCell, TRow, TColumn>>,
): GridState<TStateCell, TRow, TColumn> {
  if (!value || typeof value !== "object") {
    throw new Error("Grid state updates must be objects.");
  }

  if (Array.isArray(value)) {
    throw new Error(
      "Grid state updates must use { rows, columns, cells } objects, not arrays.",
    );
  }

  const partialState = value as Partial<GridState<TStateCell, TRow, TColumn>>;
  const { cells = [], rows = [], columns = [] } = partialState;

  if (!Array.isArray(cells) || !Array.isArray(rows) || !Array.isArray(columns)) {
    throw new Error(
      "Grid state updates must contain cells, rows, and columns arrays when provided.",
    );
  }

  return {
    cells,
    rows,
    columns,
  };
}

function normalizeGridStatePatchInput<TStateCell, TRow, TColumn>(
  value:
    | GridState<TStateCell, TRow, TColumn>
    | Partial<GridState<TStateCell, TRow, TColumn>>,
) {
  if (!value || typeof value !== "object") {
    throw new Error("Grid state updates must be objects.");
  }

  if (Array.isArray(value)) {
    throw new Error(
      "Grid state updates must use { rows, columns, cells } objects, not arrays.",
    );
  }

  const partialState = value as Partial<GridState<TStateCell, TRow, TColumn>>;
  const readOptionalArray = <TValue>(
    key: keyof GridState<TStateCell, TRow, TColumn>,
    arrayValue: readonly TValue[] | undefined,
  ) => {
    if (arrayValue === undefined) {
      return undefined;
    }

    if (!Array.isArray(arrayValue)) {
      throw new Error(
        `Grid state updates must provide an array for "${String(key)}" when present.`,
      );
    }

    return arrayValue;
  };

  return {
    rows: readOptionalArray("rows", partialState.rows),
    columns: readOptionalArray("columns", partialState.columns),
    cells: readOptionalArray("cells", partialState.cells),
  };
}

function hasGridStatePatch<TStateCell, TRow, TColumn>(patch: {
  rows?: readonly TRow[];
  columns?: readonly TColumn[];
  cells?: readonly TStateCell[];
}) {
  return Boolean(
    (patch.rows && patch.rows.length > 0) ||
    (patch.columns && patch.columns.length > 0) ||
    (patch.cells && patch.cells.length > 0),
  );
}

function mergeHeadStates<TId extends string, THead extends GridHead<TId>>(
  currentHeads: readonly THead[],
  nextHeads: readonly THead[],
) {
  const currentIds = new Set<TId>();
  const nextHeadsById = new Map<TId, THead>();

  currentHeads.forEach((currentHead) => {
    currentIds.add(currentHead.id);
  });

  nextHeads.forEach((nextHead) => {
    nextHeadsById.set(nextHead.id, nextHead);
  });

  const resolvedHeads = currentHeads.map((currentHead) => {
    return nextHeadsById.get(currentHead.id) ?? currentHead;
  });

  nextHeads.forEach((nextHead) => {
    if (currentIds.has(nextHead.id)) {
      return;
    }

    resolvedHeads.push(nextHead);
  });

  return resolvedHeads;
}

function mergeCellStates<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TStateCell,
>(
  currentCells: readonly TStateCell[],
  nextCells: readonly TStateCell[],
  stateAdapter: GridStateAdapter<TCell, TRowId, TColumnId, TStateCell>,
) {
  const currentKeys = new Set<string>();
  const nextCellsByKey = new Map<string, TStateCell>();

  nextCells.forEach((nextCell) => {
    const { rowId, columnId } = stateAdapter.deserializeCell(nextCell);
    nextCellsByKey.set(createGridKey(rowId, columnId), nextCell);
  });

  const mergedCells = currentCells.map((currentCell) => {
    const { rowId, columnId } = stateAdapter.deserializeCell(currentCell);
    const gridKey = createGridKey(rowId, columnId);

    currentKeys.add(gridKey);

    return nextCellsByKey.get(gridKey) ?? currentCell;
  });

  nextCells.forEach((nextCell) => {
    const { rowId, columnId } = stateAdapter.deserializeCell(nextCell);
    const gridKey = createGridKey(rowId, columnId);

    if (currentKeys.has(gridKey)) {
      return;
    }

    mergedCells.push(nextCell);
  });

  return mergedCells;
}

function normalizeGridState<TState extends GridState<GridRecord, GridRecord, GridRecord>>(
  value: TState | Partial<TState>,
): GridState<SchemaCell<TState>, SchemaRow<TState>, SchemaColumn<TState>> {
  if (!value || typeof value !== "object") {
    throw new Error("Grid state initializer must return an object.");
  }

  if (Array.isArray(value)) {
    throw new Error(
      "Legacy matrix grid input has been removed. Pass a schema object with rows, columns, and cells instead.",
    );
  }

  const partialState = value as Partial<
    GridState<SchemaCell<TState>, SchemaRow<TState>, SchemaColumn<TState>>
  >;
  const { cells = [], rows = [], columns = [] } = partialState;

  if (!Array.isArray(cells) || !Array.isArray(rows) || !Array.isArray(columns)) {
    throw new Error(
      "Grid state initializer must return an object with cells, rows, and columns arrays.",
    );
  }

  return {
    cells,
    rows,
    columns,
  };
}

function normalizeRecordHeads<
  THead extends GridRecord,
  THeadIdKey extends keyof THead & string,
  TId extends Extract<THead[THeadIdKey], string>,
>(heads: readonly THead[], idKey: THeadIdKey) {
  return heads.map((head, index) => {
    const id = head[idKey];

    if (typeof id !== "string") {
      throw new Error(`Grid header key "${String(idKey)}" must resolve to a string id.`);
    }

    return {
      ...head,
      id,
      label: readGridHeadLabel(head, id),
      order: typeof head.order === "number" ? head.order : index,
    } as THead & GridHead<TId>;
  });
}

function createGridInitialCellsFromState<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TStateCell,
>(
  stateCells: readonly TStateCell[],
  stateAdapter: GridStateAdapter<TCell, TRowId, TColumnId, TStateCell>,
) {
  const initialCells: GridInitialCellEntry<TCell, TRowId, TColumnId>[] = [];
  const seenKeys = new Set<string>();

  stateCells.forEach((stateCell) => {
    const { rowId, columnId, value } = stateAdapter.deserializeCell(stateCell);
    const gridKey = createGridKey(rowId, columnId);

    if (seenKeys.has(gridKey)) {
      throw new Error(`Duplicate cell for row "${rowId}" and column "${columnId}".`);
    }

    seenKeys.add(gridKey);
    initialCells.push({
      rowId,
      columnId,
      cell: cell(value),
    });
  });

  return initialCells;
}

function createSchemaStateAdapter<
  TCell extends GridRecord,
  TRowId extends string,
  TColumnId extends string,
  TRowCellKey extends keyof TCell & string,
  TColumnCellKey extends keyof TCell & string,
>(
  rowCellKey: TRowCellKey,
  columnCellKey: TColumnCellKey,
): GridStateAdapter<TCell, TRowId, TColumnId, TCell> {
  return {
    deserializeCell: (stateCell) => {
      const rowId = stateCell[rowCellKey];
      const columnId = stateCell[columnCellKey];

      if (typeof rowId !== "string" || typeof columnId !== "string") {
        throw new Error(
          `Grid cell keys "${String(rowCellKey)}" and "${String(columnCellKey)}" must resolve to string ids.`,
        );
      }

      return {
        rowId: rowId as TRowId,
        columnId: columnId as TColumnId,
        value: {
          ...stateCell,
          [rowCellKey]: rowId,
          [columnCellKey]: columnId,
        } as TCell,
      };
    },
    serializeCell: (rowId, columnId, value) =>
      ({
        ...value,
        [rowCellKey]: rowId,
        [columnCellKey]: columnId,
      }) as TCell,
  };
}

function resolveGridStateInitializer<TState>(state: GridStateInitializer<TState>) {
  return typeof state === "function"
    ? (state as () => TState | Partial<TState>)()
    : state;
}

function normalizeUpsertHead<TId extends string, THead extends GridHead<TId>>(
  nextHead: GridRecord & { id: TId },
  currentHead: THead | undefined,
  fallbackOrder: number,
) {
  return {
    ...(currentHead ?? {}),
    ...nextHead,
    id: nextHead.id,
    label:
      typeof nextHead.label === "string"
        ? nextHead.label
        : (currentHead?.label ?? readGridHeadLabel(nextHead, nextHead.id)),
    order:
      typeof nextHead.order === "number"
        ? nextHead.order
        : (currentHead?.order ?? fallbackOrder),
  } as THead;
}

function assertUniqueHeadIds<TId extends string, THead extends GridHead<TId>>(
  heads: readonly THead[],
  axis: "row" | "column",
) {
  const seenIds = new Set<TId>();

  heads.forEach((head) => {
    if (seenIds.has(head.id)) {
      throw new Error(`Duplicate ${axis} header "${head.id}".`);
    }

    seenIds.add(head.id);
  });
}

function createEmptyTailState(): GridTailState<unknown> {
  return {
    isReactive: false,
    value: null,
  };
}

function readGridHeadLabel(head: GridRecord, id: string) {
  const label = head.label;

  if (typeof label === "string") {
    return label;
  }

  const name = head.name;

  if (typeof name === "string") {
    return name;
  }

  return id;
}

function resolveCreateSubGridArgs<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  cellsOrOptionsOrPersist:
    | readonly GridStateCell<TCell, TRowId, TColumnId>[]
    | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
    | CreateSubGridOptions<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
    | undefined,
  persist:
    | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
    | undefined,
): {
  initialCells: readonly GridStateCell<TCell, TRowId, TColumnId>[];
  persistOption:
    | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
    | undefined;
} {
  if (persist) {
    return {
      initialCells: readCreateSubGridCells(cellsOrOptionsOrPersist),
      persistOption: persist,
    };
  }

  if (!cellsOrOptionsOrPersist) {
    return {
      initialCells: [] as readonly GridStateCell<TCell, TRowId, TColumnId>[],
      persistOption: undefined,
    };
  }

  if (isCreateSubGridOptions(cellsOrOptionsOrPersist)) {
    const subGridOptions = cellsOrOptionsOrPersist as CreateSubGridOptions<
      TCell,
      TRowId,
      TColumnId,
      TRowHead,
      TColumnHead
    >;

    return {
      initialCells: subGridOptions.cells ?? [],
      persistOption: subGridOptions.persist,
    };
  }

  if (isGridPersistOption(cellsOrOptionsOrPersist)) {
    return {
      initialCells: [] as readonly GridStateCell<TCell, TRowId, TColumnId>[],
      persistOption: cellsOrOptionsOrPersist as GridPersistOption<
        SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
      >,
    };
  }

  return {
    initialCells: cellsOrOptionsOrPersist as readonly GridStateCell<
      TCell,
      TRowId,
      TColumnId
    >[],
    persistOption: undefined,
  };
}

function readCreateSubGridCells<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  value:
    | readonly GridStateCell<TCell, TRowId, TColumnId>[]
    | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
    | CreateSubGridOptions<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
    | undefined,
): readonly GridStateCell<TCell, TRowId, TColumnId>[] {
  if (!value || isGridPersistOption(value)) {
    return [] as readonly GridStateCell<TCell, TRowId, TColumnId>[];
  }

  if (isCreateSubGridOptions(value)) {
    return (
      (value as CreateSubGridOptions<TCell, TRowId, TColumnId, TRowHead, TColumnHead>)
        .cells ?? []
    );
  }

  return value as readonly GridStateCell<TCell, TRowId, TColumnId>[];
}

function isCreateSubGridOptions(
  value: unknown,
): value is CreateSubGridOptions<any, any, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGridPersistOption<TState>(value: unknown): value is GridPersistOption<TState> {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "string";
}

function createGridStateCellAdapter<
  TCell,
  TRowId extends string,
  TColumnId extends string,
>(): GridStateAdapter<TCell, TRowId, TColumnId, GridStateCell<TCell, TRowId, TColumnId>> {
  return {
    deserializeCell: (stateCell) => ({
      rowId: stateCell.rowId,
      columnId: stateCell.columnId,
      value: stateCell.value,
    }),
    serializeCell: (rowId, columnId, value) => ({
      rowId,
      columnId,
      value,
    }),
  };
}

function createSubGridPersistOption<
  TCell,
  TParentCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TParentStateCell,
  TParentState extends GridState<TParentStateCell, TRowHead, TColumnHead>,
>(
  parentGrid: Grid<
    TParentCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead,
    TParentStateCell,
    TParentState
  >,
  persist:
    | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
    | undefined,
):
  | GridPersistOption<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>>
  | undefined {
  if (!persist) {
    return undefined;
  }

  const [storageKey, adapter] = persist;
  const resolvedAdapter =
    adapter ??
    (defaultGridPersistAdapter as {
      get: (
        storageKey: string,
      ) =>
        | SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
        | null
        | Promise<SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead> | null>;
      set: (
        storageKey: string,
        value: SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
      ) => void | Promise<void>;
      remove: (storageKey: string) => void | Promise<void>;
    });

  return [
    storageKey,
    {
      get: async (nextStorageKey: string) => {
        const persistedState = await Promise.resolve(resolvedAdapter.get(nextStorageKey));

        if (persistedState === null) {
          return null;
        }

        try {
          const normalizedState = normalizeGridStateInput<
            GridStateCell<TCell, TRowId, TColumnId>,
            TRowHead,
            TColumnHead
          >(persistedState);
          const parentState = parentGrid.getState();

          return createSubGridState(
            parentState.rows,
            parentState.columns,
            normalizedState.cells,
          );
        } catch {
          return null;
        }
      },
      set: (
        nextStorageKey: string,
        nextState: SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
      ) => {
        const parentState = parentGrid.getState();

        return resolvedAdapter.set(
          nextStorageKey,
          createSubGridState(parentState.rows, parentState.columns, nextState.cells),
        );
      },
      remove: (nextStorageKey: string) => resolvedAdapter.remove(nextStorageKey),
    },
  ];
}

function createSubGridState<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  rows: readonly TRowHead[],
  columns: readonly TColumnHead[],
  cells: readonly GridStateCell<TCell, TRowId, TColumnId>[],
): SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead> {
  return {
    rows,
    columns,
    cells: filterGridStateCellsToAxes(cells, rows, columns),
  };
}

function assertGridStateCellsWithinAxes<
  TCell,
  TRowId extends string,
  TColumnId extends string,
>(
  cells: readonly GridStateCell<TCell, TRowId, TColumnId>[],
  rows: readonly GridHead<TRowId>[],
  columns: readonly GridHead<TColumnId>[],
  contextLabel: string,
) {
  const rowIds = new Set(rows.map((rowHead) => rowHead.id));
  const columnIds = new Set(columns.map((columnHead) => columnHead.id));

  cells.forEach((currentCell) => {
    if (!rowIds.has(currentCell.rowId)) {
      throw new Error(
        `${contextLabel} must reference an existing parent row header. Missing row "${currentCell.rowId}".`,
      );
    }

    if (!columnIds.has(currentCell.columnId)) {
      throw new Error(
        `${contextLabel} must reference an existing parent column header. Missing column "${currentCell.columnId}".`,
      );
    }
  });

  return cells;
}

function filterGridStateCellsToAxes<
  TCell,
  TRowId extends string,
  TColumnId extends string,
>(
  cells: readonly GridStateCell<TCell, TRowId, TColumnId>[],
  rows: readonly GridHead<TRowId>[],
  columns: readonly GridHead<TColumnId>[],
) {
  const rowIds = new Set(rows.map((rowHead) => rowHead.id));
  const columnIds = new Set(columns.map((columnHead) => columnHead.id));

  return cells.filter(
    (currentCell) => rowIds.has(currentCell.rowId) && columnIds.has(currentCell.columnId),
  );
}

function didGridDiffAffectAxes<
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
>(diff: GridUpdateDiff<TRowId, TColumnId, TRowHead, TColumnHead, TStateCell>) {
  return (
    !haveSameHeadSnapshots(diff.rows, diff.previousRows) ||
    !haveSameHeadSnapshots(diff.columns, diff.previousColumns)
  );
}

function haveSameHeadSnapshots<
  TId extends string,
  THead extends GridHead<TId> | undefined,
>(leftHeads: readonly THead[] | undefined, rightHeads: readonly THead[] | undefined) {
  if (leftHeads === rightHeads) {
    return true;
  }

  if (!leftHeads || !rightHeads || leftHeads.length !== rightHeads.length) {
    return false;
  }

  return leftHeads.every((leftHead, index) => {
    const rightHead = rightHeads[index];

    if (leftHead === undefined || rightHead === undefined) {
      return leftHead === rightHead;
    }

    return haveSameShallowRecord(
      leftHead as unknown as GridRecord,
      rightHead as unknown as GridRecord,
    );
  });
}

function haveSameShallowRecord(leftRecord: GridRecord, rightRecord: GridRecord) {
  if (Object.is(leftRecord, rightRecord)) {
    return true;
  }

  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    if (!(key in rightRecord)) {
      return false;
    }

    return Object.is(leftRecord[key], rightRecord[key]);
  });
}
