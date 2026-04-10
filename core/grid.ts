import { cell } from "./cell.js";

import type { Cell, Subscriber, Updater } from "./cell.js";

import {
  assertHeadId,
  createHeadCellMap,
  createHeadOrderIndex,
  getHeadCell,
  getOrderedHeads,
  normalizeGridHeads,
} from "./head.js";
import { createTailCellMap, getTailCell, setTailCellResult } from "./tail.js";

import type { GridHead, GridHeadId, GridHeadInput, ResolvedGridHead } from "./head.js";
import type { GridAxisCell, GridAxisTailUpdater, GridTailState } from "./tail.js";

export interface GridOptions<
  TRowHeadInput extends GridHeadInput,
  TColumnHeadInput extends GridHeadInput,
> {
  rowHeaders: readonly TRowHeadInput[];
  colHeaders: readonly TColumnHeadInput[];
}

export type GridPosition<
  TColumnId extends string = string,
  TRowId extends string = string,
> = readonly [columnId: TColumnId, rowId: TRowId];

export type GridRows<
  TColumnId extends string = string,
  TRowId extends string = string,
> = readonly (readonly GridPosition<TColumnId, TRowId>[])[];

type GridRecord = Record<string, unknown>;

export type GridCollectionInput<
  THead extends GridRecord,
  THeadIdKey extends keyof THead & string,
  TCell extends GridRecord,
  TCellKey extends keyof TCell & string,
> = readonly [heads: readonly THead[], headIdKey: THeadIdKey, cellKey: TCellKey];

export interface GridCollectionOptions<
  TCell extends GridRecord,
  TRowHead extends GridRecord,
  TColumnHead extends GridRecord,
  TRowHeadIdKey extends keyof TRowHead & string,
  TColumnHeadIdKey extends keyof TColumnHead & string,
  TRowCellKey extends keyof TCell & string,
  TColumnCellKey extends keyof TCell & string,
> {
  rowHeaders: GridCollectionInput<TRowHead, TRowHeadIdKey, TCell, TRowCellKey>;
  colHeaders: GridCollectionInput<TColumnHead, TColumnHeadIdKey, TCell, TColumnCellKey>;
}

export interface Grid<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
> {
  readonly rowHeaders: readonly TRowId[];
  readonly colHeaders: readonly TColumnId[];
  getCell: (rowId: TRowId, columnId: TColumnId) => Cell<TCell>;
  getValue: (rowId: TRowId, columnId: TColumnId) => TCell;
  setValue: (rowId: TRowId, columnId: TColumnId, newValue: TCell) => void;
  hasCell: (rowId: TRowId, columnId: TColumnId) => boolean;
  getRowHead: (rowId: TRowId) => TRowHead;
  getColumnHead: (columnId: TColumnId) => TColumnHead;
  updateRowHead: (rowId: TRowId, nextRowHead: Updater<TRowHead>) => void;
  updateColumnHead: (columnId: TColumnId, nextColumnHead: Updater<TColumnHead>) => void;
  subscribeRowHead: (rowId: TRowId, callback: Subscriber) => () => void;
  subscribeColumnHead: (columnId: TColumnId, callback: Subscriber) => () => void;
  getRowCells: (rowId: TRowId) => readonly GridAxisCell<TCell, TRowId, TColumnId>[];
  getColumnCells: (
    columnId: TColumnId,
  ) => readonly GridAxisCell<TCell, TRowId, TColumnId>[];
  getRowTailState: <TTail>(rowId: TRowId) => GridTailState<TTail>;
  getColumnTailState: <TTail>(columnId: TColumnId) => GridTailState<TTail>;
  getRowTail: <TTail>(rowId: TRowId) => TTail | null;
  getColumnTail: <TTail>(columnId: TColumnId) => TTail | null;
  updateRowTail: (rowId: TRowId, nextRowTail: Updater<unknown | null>) => void;
  updateColumnTail: (
    columnId: TColumnId,
    nextColumnTail: Updater<unknown | null>,
  ) => void;
  subscribeRowTail: (rowId: TRowId, callback: Subscriber) => () => void;
  subscribeColumnTail: (columnId: TColumnId, callback: Subscriber) => () => void;
  registerRowTail: <TTail>(
    rowId: TRowId,
    onRowUpdate: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
  ) => () => void;
  registerColumnTail: <TTail>(
    columnId: TColumnId,
    onColumnUpdate: GridAxisTailUpdater<TCell, TRowId, TColumnId, TTail>,
  ) => () => void;
  recomputeRowTail: (rowId: TRowId) => void;
  recomputeColumnTail: (columnId: TColumnId) => void;
}

export interface GridAxisIds<TRowId extends string, TColumnId extends string> {
  rows: readonly TRowId[];
  cols: readonly TColumnId[];
  reorderRow: (activeRowId: TRowId | string, overRowId: TRowId | string) => boolean;
  reorderColumn: (
    activeColumnId: TColumnId | string,
    overColumnId: TColumnId | string,
  ) => boolean;
}

export function grid<
  TCell,
  TRowHeadInput extends GridHeadInput,
  TColumnHeadInput extends GridHeadInput,
>(
  cells: Cell<TCell>[][],
  { colHeaders, rowHeaders }: GridOptions<TRowHeadInput, TColumnHeadInput>,
): Grid<
  TCell,
  GridHeadId<TRowHeadInput>,
  GridHeadId<TColumnHeadInput>,
  ResolvedGridHead<TRowHeadInput>,
  ResolvedGridHead<TColumnHeadInput>
>;

export function grid<
  TCell extends GridRecord,
  TRowHead extends GridRecord,
  TColumnHead extends GridRecord,
  TRowHeadIdKey extends keyof TRowHead & string,
  TColumnHeadIdKey extends keyof TColumnHead & string,
  TRowCellKey extends keyof TCell & string,
  TColumnCellKey extends keyof TCell & string,
>(
  cells: readonly (TCell &
    Record<TRowCellKey, Extract<TRowHead[TRowHeadIdKey], string>> &
    Record<TColumnCellKey, Extract<TColumnHead[TColumnHeadIdKey], string>>)[],
  {
    rowHeaders,
    colHeaders,
  }: GridCollectionOptions<
    TCell,
    TRowHead,
    TColumnHead,
    TRowHeadIdKey,
    TColumnHeadIdKey,
    TRowCellKey,
    TColumnCellKey
  >,
): Grid<
  TCell &
    Record<TRowCellKey, Extract<TRowHead[TRowHeadIdKey], string>> &
    Record<TColumnCellKey, Extract<TColumnHead[TColumnHeadIdKey], string>>,
  Extract<TRowHead[TRowHeadIdKey], string>,
  Extract<TColumnHead[TColumnHeadIdKey], string>,
  TRowHead & GridHead<Extract<TRowHead[TRowHeadIdKey], string>>,
  TColumnHead & GridHead<Extract<TColumnHead[TColumnHeadIdKey], string>>
>;

export function grid(
  cells: Cell<unknown>[][] | readonly GridRecord[],
  options:
    | GridOptions<GridHeadInput, GridHeadInput>
    | {
        rowHeaders: readonly [readonly GridRecord[], string, string];
        colHeaders: readonly [readonly GridRecord[], string, string];
      },
) {
  if (isCollectionGridOptions(options)) {
    const [rowSource, rowHeadIdKey, rowCellKey] = options.rowHeaders;
    const [columnSource, columnHeadIdKey, columnCellKey] = options.colHeaders;
    const normalizedRowHeads = normalizeCollectionHeads(rowSource, rowHeadIdKey);
    const normalizedColumnHeads = normalizeCollectionHeads(columnSource, columnHeadIdKey);

    return createGridStore(
      createGridCellsFromRecords(
        cells as readonly GridRecord[],
        normalizedRowHeads,
        normalizedColumnHeads,
        rowCellKey,
        columnCellKey,
      ),
      normalizedRowHeads,
      normalizedColumnHeads,
    );
  }

  const { colHeaders, rowHeaders } = options;

  return createGridStore(
    cells as Cell<unknown>[][],
    normalizeGridHeads(rowHeaders),
    normalizeGridHeads(colHeaders),
  );
}

function createGridStore<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
>(
  cells: Cell<TCell>[][],
  normalizedRowHeads: readonly TRowHead[],
  normalizedColumnHeads: readonly TColumnHead[],
): Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead> {
  if (cells.length !== normalizedRowHeads.length) {
    throw new Error(
      `Grid row count mismatch: received ${cells.length} rows for ${normalizedRowHeads.length} row headers.`,
    );
  }

  const rowHeadOrder = createHeadOrderIndex(normalizedRowHeads);
  const columnHeadOrder = createHeadOrderIndex(normalizedColumnHeads);
  const rowHeadCells = createHeadCellMap<TRowId, TRowHead>(normalizedRowHeads);
  const columnHeadCells = createHeadCellMap<TColumnId, TColumnHead>(
    normalizedColumnHeads,
  );
  const rowTailCells = createTailCellMap<TRowId>(normalizedRowHeads);
  const columnTailCells = createTailCellMap<TColumnId>(normalizedColumnHeads);
  const rowTailUpdaters = new Map<
    TRowId,
    GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>
  >();
  const columnTailUpdaters = new Map<
    TColumnId,
    GridAxisTailUpdater<TCell, TRowId, TColumnId, unknown>
  >();
  const cellsMap = new Map<string, Cell<TCell>>();

  const getOrderedRowHeads = () => getOrderedHeads(rowHeadCells, rowHeadOrder);
  const getOrderedColumnHeads = () => getOrderedHeads(columnHeadCells, columnHeadOrder);

  const getCell = (rowId: TRowId, columnId: TColumnId) => {
    const currentCell = cellsMap.get(createGridKey(rowId, columnId));

    if (!currentCell) {
      throw new Error(`Missing cell for row "${rowId}" and column "${columnId}".`);
    }

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
    getOrderedColumnHeads().map((columnHead) =>
      createAxisCellSnapshot(rowId, columnHead.id),
    );

  const getColumnCells = (columnId: TColumnId) =>
    getOrderedRowHeads().map((rowHead) => createAxisCellSnapshot(rowHead.id, columnId));

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

  cells.forEach((row, rowIndex) => {
    const rowId = normalizedRowHeads[rowIndex].id;

    if (row.length !== normalizedColumnHeads.length) {
      throw new Error(
        `Grid column count mismatch on row ${rowIndex}: received ${row.length} cells for ${normalizedColumnHeads.length} column headers.`,
      );
    }

    row.forEach((currentCell, columnIndex) => {
      const columnId = normalizedColumnHeads[columnIndex].id;

      cellsMap.set(createGridKey(rowId, columnId), currentCell);
      currentCell.subscribe(() => {
        recomputeRowTail(rowId);
        recomputeColumnTail(columnId);
      });
    });
  });

  const getRowHead = (rowId: TRowId) => getHeadCell(rowHeadCells, rowId, "row").get();
  const getColumnHead = (columnId: TColumnId) =>
    getHeadCell(columnHeadCells, columnId, "column").get();

  const updateRowHead = (rowId: TRowId, nextRowHead: Updater<TRowHead>) => {
    const currentHeadCell = getHeadCell(rowHeadCells, rowId, "row");
    const currentHead = currentHeadCell.get();
    const resolvedHead = resolveUpdater(nextRowHead, currentHead);

    assertHeadId("row", rowId, resolvedHead.id);
    currentHeadCell.set(resolvedHead);

    if (currentHead.order !== resolvedHead.order) {
      recomputeAllColumnTails();
    }
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

    if (currentHead.order !== resolvedHead.order) {
      recomputeAllRowTails();
    }
  };

  function getRowTail<TTail>(rowId: TRowId) {
    const tailState = getTailCell(rowTailCells, rowId, "row").get();

    return tailState.isReactive ? (tailState.value as TTail | null) : null;
  }

  function getColumnTail<TTail>(columnId: TColumnId) {
    const tailState = getTailCell(columnTailCells, columnId, "column").get();

    return tailState.isReactive ? (tailState.value as TTail | null) : null;
  }

  function getRowTailState<TTail>(rowId: TRowId) {
    return getTailCell(rowTailCells, rowId, "row").get() as GridTailState<TTail>;
  }

  function getColumnTailState<TTail>(columnId: TColumnId) {
    return getTailCell(columnTailCells, columnId, "column").get() as GridTailState<TTail>;
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
      if (rowTailUpdaters.get(rowId) === onRowUpdate) {
        rowTailUpdaters.delete(rowId);
      }
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
      if (columnTailUpdaters.get(columnId) === onColumnUpdate) {
        columnTailUpdaters.delete(columnId);
      }
    };
  }

  return {
    get rowHeaders() {
      return getOrderedRowHeads().map((rowHead) => rowHead.id);
    },
    get colHeaders() {
      return getOrderedColumnHeads().map((columnHead) => columnHead.id);
    },
    getCell,
    getValue: (rowId, columnId) => getCell(rowId, columnId).get(),
    setValue: (rowId, columnId, newValue) => {
      getCell(rowId, columnId).set(newValue);
    },
    hasCell: (rowId, columnId) => cellsMap.has(createGridKey(rowId, columnId)),
    getRowHead,
    getColumnHead,
    updateRowHead,
    updateColumnHead,
    subscribeRowHead: (rowId, callback) =>
      getHeadCell(rowHeadCells, rowId, "row").subscribe(callback),
    subscribeColumnHead: (columnId, callback) =>
      getHeadCell(columnHeadCells, columnId, "column").subscribe(callback),
    getRowCells,
    getColumnCells,
    getRowTailState,
    getColumnTailState,
    getRowTail,
    getColumnTail,
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
>(
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead>,
): GridAxisIds<TRowId, TColumnId> {
  return {
    rows: currentGrid.rowHeaders,
    cols: currentGrid.colHeaders,
    reorderRow: (activeRowId: TRowId | string, overRowId: TRowId | string) => {
      const nextOrderedRowIds = reorderAxisIds(
        currentGrid.rowHeaders,
        activeRowId,
        overRowId,
      );

      if (nextOrderedRowIds === currentGrid.rowHeaders) {
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
    },
    reorderColumn: (
      activeColumnId: TColumnId | string,
      overColumnId: TColumnId | string,
    ) => {
      const nextOrderedColumnIds = reorderAxisIds(
        currentGrid.colHeaders,
        activeColumnId,
        overColumnId,
      );

      if (nextOrderedColumnIds === currentGrid.colHeaders) {
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
    },
  };
}

function isCollectionGridOptions(value: unknown): value is {
  rowHeaders: readonly [readonly GridRecord[], string, string];
  colHeaders: readonly [readonly GridRecord[], string, string];
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const rowHeaders = "rowHeaders" in value ? value.rowHeaders : null;
  const colHeaders = "colHeaders" in value ? value.colHeaders : null;

  return isCollectionInput(rowHeaders) && isCollectionInput(colHeaders);
}

function isCollectionInput(
  value: unknown,
): value is readonly [readonly GridRecord[], string, string] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    Array.isArray(value[0]) &&
    typeof value[1] === "string" &&
    typeof value[2] === "string"
  );
}

function normalizeCollectionHeads<
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

function createGridCellsFromRecords<
  TCell extends GridRecord,
  TRowId extends string,
  TColumnId extends string,
>(
  cells: readonly TCell[],
  rowHeads: readonly GridHead<TRowId>[],
  columnHeads: readonly GridHead<TColumnId>[],
  rowCellKey: keyof TCell & string,
  columnCellKey: keyof TCell & string,
) {
  const cellsMap = new Map<string, TCell>();

  cells.forEach((currentCell) => {
    const rowId = currentCell[rowCellKey as keyof TCell];
    const columnId = currentCell[columnCellKey as keyof TCell];

    if (typeof rowId !== "string" || typeof columnId !== "string") {
      throw new Error(
        `Grid cell keys "${String(rowCellKey)}" and "${String(columnCellKey)}" must resolve to string ids.`,
      );
    }

    const gridKey = createGridKey(rowId, columnId);

    if (cellsMap.has(gridKey)) {
      throw new Error(`Duplicate cell for row "${rowId}" and column "${columnId}".`);
    }

    cellsMap.set(gridKey, currentCell);
  });

  return rowHeads.map((rowHead) =>
    columnHeads.map((columnHead) => {
      const currentCell = cellsMap.get(createGridKey(rowHead.id, columnHead.id));

      if (!currentCell) {
        throw new Error(
          `Missing cell for row "${rowHead.id}" and column "${columnHead.id}".`,
        );
      }

      return cell(currentCell);
    }),
  );
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
