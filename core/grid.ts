import { cell } from "./cell.js";
import { createGridPersistController } from "./gridPersist.js";

import type { Cell, Subscriber, Updater } from "./cell.types.js";
import type {
  Grid,
  GridAxisIds,
  GridInitialCellEntry,
  GridMatrixSnapshot,
  GridOptions,
  GridPersistOption,
  GridPosition,
  GridRecord,
  GridSchemaOptions,
  GridState,
  GridStateAdapter,
  GridStateCell,
  GridStateInitializer,
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
} from "./grid.types.js";

import {
  assertHeadId,
  createHeadCellMap,
  createHeadOrderIndex,
  getHeadCell,
  getOrderedHeads,
  normalizeGridHeads,
} from "./head.js";
import { createTailCellMap, getTailCell, setTailCellResult } from "./tail.js";

import type {
  GridHead,
  GridHeadId,
  GridHeadInput,
  ResolvedGridHead,
} from "./head.types.js";
import type { GridAxisCell, GridAxisTailUpdater, GridTailState } from "./tail.types.js";

export type {
  Grid,
  GridAxisIds,
  GridOptions,
  GridPersistAdapter,
  GridPersistOption,
  GridPosition,
  GridRows,
  GridSchemaOptions,
  GridState,
  GridStateCell,
  GridStateInitializer,
  GridUpsertHead,
} from "./grid.types.js";

type BroadSchemaRowHead<TState extends GridState<GridRecord, GridRecord, GridRecord>> =
  SchemaRow<TState> & GridHead<string>;

type BroadSchemaColumnHead<TState extends GridState<GridRecord, GridRecord, GridRecord>> =
  SchemaColumn<TState> & GridHead<string>;

type BroadSchemaSnapshot<TState extends GridState<GridRecord, GridRecord, GridRecord>> =
  GridState<
    SchemaCell<TState>,
    BroadSchemaRowHead<TState>,
    BroadSchemaColumnHead<TState>
  >;

export function grid<
  TCell,
  TRowHeadInput extends GridHeadInput,
  TColumnHeadInput extends GridHeadInput,
>(
  cells: Cell<TCell>[][],
  options: GridOptions<
    TRowHeadInput,
    TColumnHeadInput,
    GridMatrixSnapshot<TCell, TRowHeadInput, TColumnHeadInput>
  >,
): Grid<
  TCell,
  GridHeadId<TRowHeadInput>,
  GridHeadId<TColumnHeadInput>,
  ResolvedGridHead<TRowHeadInput>,
  ResolvedGridHead<TColumnHeadInput>,
  GridStateCell<TCell, GridHeadId<TRowHeadInput>, GridHeadId<TColumnHeadInput>>,
  GridMatrixSnapshot<TCell, TRowHeadInput, TColumnHeadInput>
>;

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
  if (Array.isArray(input)) {
    const matrixOptions = options as GridOptions<GridHeadInput, GridHeadInput, any>;
    const { rowHeaders, colHeaders, persist } = matrixOptions;
    const normalizedRowHeads = normalizeGridHeads(rowHeaders);
    const normalizedColumnHeads = normalizeGridHeads(colHeaders);

    return createGridStore(
      normalizedRowHeads,
      normalizedColumnHeads,
      createMatrixInitialCells(
        input as Cell<unknown>[][],
        normalizedRowHeads,
        normalizedColumnHeads,
      ),
      createMatrixStateAdapter<unknown, string, string>(),
      persist as GridPersistOption<any> | undefined,
    );
  }

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

  let nextRowFallbackOrder = initialRows.length;
  let nextColumnFallbackOrder = initialColumns.length;
  let isApplyingState = false;

  const getOrderedRowHeads = () => getOrderedHeads(rowHeadCells, rowHeadOrder);
  const getOrderedColumnHeads = () => getOrderedHeads(columnHeadCells, columnHeadOrder);

  const normalizeCellValue = (rowId: TRowId, columnId: TColumnId, value: TCell) => {
    return stateAdapter.deserializeCell(
      stateAdapter.serializeCell(rowId, columnId, value),
    ).value;
  };

  const attachCell = (rowId: TRowId, columnId: TColumnId, currentCell: Cell<TCell>) => {
    if (!rowHeadCells.has(rowId)) throw new Error(`Missing row header "${rowId}".`);

    if (!columnHeadCells.has(columnId))
      throw new Error(`Missing column header "${columnId}".`);

    const gridKey = createGridKey(rowId, columnId);

    if (cellsMap.has(gridKey))
      throw new Error(`Duplicate cell for row "${rowId}" and column "${columnId}".`);

    cellsMap.set(gridKey, currentCell);
    currentCell.subscribe(() => {
      recomputeRowTail(rowId);
      recomputeColumnTail(columnId);

      if (isApplyingState) return;

      markStateChanged();
    });
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

  const recomputeRowTail = (rowId: TRowId) => {
    const onRowUpdate = rowTailUpdaters.get(rowId);

    if (!onRowUpdate) return;

    setTailCellResult(
      getTailCell(rowTailCells, rowId, "row"),
      onRowUpdate(getRowCells(rowId)),
    );
  };

  const recomputeColumnTail = (columnId: TColumnId) => {
    const onColumnUpdate = columnTailUpdaters.get(columnId);

    if (!onColumnUpdate) return;

    setTailCellResult(
      getTailCell(columnTailCells, columnId, "column"),
      onColumnUpdate(getColumnCells(columnId)),
    );
  };

  const recomputeAllRowTails = () => {
    getOrderedRowHeads().forEach((rowHead) => {
      recomputeRowTail(rowHead.id);
    });
  };

  const recomputeAllColumnTails = () => {
    getOrderedColumnHeads().forEach((columnHead) => {
      recomputeColumnTail(columnHead.id);
    });
  };

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
          cellsMap.delete(gridKey);
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

    recomputeAllRowTails();
    recomputeAllColumnTails();
  };

  const { hydrate, markStateChanged } = createGridPersistController(persist, {
    getState,
    replaceState,
    isApplyingState: () => isApplyingState,
  });

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

    if (currentHead.order === resolvedHead.order) {
      markStateChanged();
      return;
    }

    recomputeAllColumnTails();
    markStateChanged();
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

    if (currentHead.order === resolvedHead.order) {
      markStateChanged();
      return;
    }

    recomputeAllRowTails();
    markStateChanged();
  };

  const upsertRow = (nextRowHead: GridUpsertHead<TRowHead>) => {
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

    recomputeRowTail(resolvedHead.id);

    if (currentHead && currentHead.order === resolvedHead.order) {
      markStateChanged();
      return;
    }

    recomputeAllColumnTails();
    markStateChanged();
  };

  const upsertColumn = (nextColumnHead: GridUpsertHead<TColumnHead>) => {
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

    recomputeColumnTail(resolvedHead.id);

    if (currentHead && currentHead.order === resolvedHead.order) {
      markStateChanged();
      return;
    }

    recomputeAllRowTails();
    markStateChanged();
  };

  const upsertCells = (nextCells: readonly TStateCell[]) => {
    if (nextCells.length === 0) {
      return;
    }

    const touchedRowIds = new Set<TRowId>();
    const touchedColumnIds = new Set<TColumnId>();

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

        if (currentCell) currentCell.set(normalizedValue);
        else attachCell(rowId, columnId, cell(normalizedValue));

        touchedRowIds.add(rowId);
        touchedColumnIds.add(columnId);
      });
    } finally {
      isApplyingState = false;
    }

    touchedRowIds.forEach((rowId) => {
      recomputeRowTail(rowId);
    });
    touchedColumnIds.forEach((columnId) => {
      recomputeColumnTail(columnId);
    });

    markStateChanged();
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

    setTailCellResult(currentTailCell, resolveUpdater(nextRowTail, currentTailValue));
  };

  const updateColumnTail = (
    columnId: TColumnId,
    nextColumnTail: Updater<unknown | null>,
  ) => {
    const currentTailCell = getTailCell(columnTailCells, columnId, "column");
    const currentTailState = currentTailCell.get();
    const currentTailValue = currentTailState.isReactive ? currentTailState.value : null;

    setTailCellResult(currentTailCell, resolveUpdater(nextColumnTail, currentTailValue));
  };

  function registerRowTail<TTail>(
    rowId: TRowId,
    onRowUpdate: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
  ) {
    rowTailUpdaters.set(
      rowId,
      onRowUpdate as GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>,
    );
    recomputeRowTail(rowId);

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
    recomputeColumnTail(columnId);

    return () => {
      if (columnTailUpdaters.get(columnId) !== onColumnUpdate) {
        return;
      }

      columnTailUpdaters.delete(columnId);
    };
  }

  return {
    get rowHeaders() {
      return getOrderedRowHeads().map((rowHead) => rowHead.id);
    },
    get colHeaders() {
      return getOrderedColumnHeads().map((columnHead) => columnHead.id);
    },
    getState,
    getCell,
    getValue: (rowId, columnId) => getCell(rowId, columnId).get(),
    setValue: (rowId, columnId, newValue) => {
      const currentCell = getCell(rowId, columnId);

      isApplyingState = true;

      try {
        currentCell.set(normalizeCellValue(rowId, columnId, newValue));
      } finally {
        isApplyingState = false;
      }

      recomputeRowTail(rowId);
      recomputeColumnTail(columnId);
      markStateChanged();
    },
    hasCell: (rowId, columnId) => cellsMap.has(createGridKey(rowId, columnId)),
    getRowHead: (rowId) => getHeadCell(rowHeadCells, rowId, "row").get(),
    getColumnHead: (columnId) => getHeadCell(columnHeadCells, columnId, "column").get(),
    updateRowHead,
    updateColumnHead,
    upsertRow,
    upsertColumn,
    upsertCell: (nextCell) => upsertCells([nextCell]),
    upsertCells,
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
): GridAxisIds<TRowId, TColumnId> {
  return {
    rows: currentGrid.rowHeaders,
    cols: currentGrid.colHeaders,
  };
}

function normalizeGridState<TState extends GridState<GridRecord, GridRecord, GridRecord>>(
  value: TState | Partial<TState>,
): GridState<SchemaCell<TState>, SchemaRow<TState>, SchemaColumn<TState>> {
  if (!value || typeof value !== "object") {
    throw new Error("Grid state initializer must return an object.");
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

function createMatrixInitialCells<TCell, TRowId extends string, TColumnId extends string>(
  cells: Cell<TCell>[][],
  rowHeads: readonly GridHead<TRowId>[],
  columnHeads: readonly GridHead<TColumnId>[],
) {
  if (cells.length !== rowHeads.length) {
    throw new Error(
      `Grid row count mismatch: received ${cells.length} rows for ${rowHeads.length} row headers.`,
    );
  }

  return cells.flatMap((row, rowIndex) => {
    const rowId = rowHeads[rowIndex].id;

    if (row.length !== columnHeads.length) {
      throw new Error(
        `Grid column count mismatch on row ${rowIndex}: received ${row.length} cells for ${columnHeads.length} column headers.`,
      );
    }

    return row.map((currentCell, columnIndex) => ({
      rowId,
      columnId: columnHeads[columnIndex].id,
      cell: currentCell,
    }));
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

function createMatrixStateAdapter<
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

