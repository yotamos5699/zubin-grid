import type { Cell, Subscriber, Updater } from "./cell.types.js";
import type { GridHead } from "./head.types.js";
import type { GridAxisCell, GridAxisTailUpdater, GridTailState } from "./tail.types.js";

export type { GridPersistAdapter, GridPersistOption } from "./persist.types.js";

import type { GridPersistOption } from "./persist.types.js";

export type GridRecord = Record<string, unknown>;

export type GridSetMode = "update" | "replace";

export type GridUpdateType =
  | "grid"
  | "cells"
  | "rows"
  | "columns"
  | "row-head"
  | "column-head"
  | "row-tail"
  | "column-tail";

export type GridUpdateAction = "clear" | "replace" | "recompute" | "update" | "upsert";

export type GridUpdateSource =
  | "cell.set"
  | "clearCells"
  | "clearGrid"
  | "recomputeColumnTail"
  | "recomputeRowTail"
  | "setGrid"
  | "updateColumnHead"
  | "updateColumnTail"
  | "updateRowHead"
  | "updateRowTail"
  | "upsertCell"
  | "upsertCells"
  | "upsertColumn"
  | "upsertColumns"
  | "upsertRow"
  | "upsertRows";

export interface GridState<TCell, TRow = GridRecord, TColumn = GridRecord> {
  cells: readonly TCell[];
  rows: readonly TRow[];
  columns: readonly TColumn[];
}

type IsAny<TValue> = 0 extends 1 & TValue ? true : false;

type NonAny<TValue> = IsAny<TValue> extends true ? never : TValue;

type StrictPartial<TValue> = IsAny<TValue> extends true ? never : Partial<TValue>;

type NonArrayValue<TValue> = TValue extends readonly unknown[] ? never : TValue;

export type SchemaCell<TState extends GridState<GridRecord, GridRecord, GridRecord>> =
  TState["cells"][number];

export type SchemaRow<TState extends GridState<GridRecord, GridRecord, GridRecord>> =
  TState["rows"][number];

export type SchemaColumn<TState extends GridState<GridRecord, GridRecord, GridRecord>> =
  TState["columns"][number];

export interface GridStateCell<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
> {
  rowId: TRowId;
  columnId: TColumnId;
  value: TCell;
}

export type GridStateInitializer<TState> =
  | NonArrayValue<NonAny<TState>>
  | NonArrayValue<StrictPartial<TState>>
  | (() => NonArrayValue<NonAny<TState>> | NonArrayValue<StrictPartial<TState>>);

export type GridPosition<
  TColumnId extends string = string,
  TRowId extends string = string,
> = readonly [columnId: TColumnId, rowId: TRowId];

export type GridRows<
  TColumnId extends string = string,
  TRowId extends string = string,
> = readonly (readonly GridPosition<TColumnId, TRowId>[])[];

export interface GridSchemaOptions<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TRowHeadIdKey extends keyof SchemaRow<TState> & string,
  TColumnHeadIdKey extends keyof SchemaColumn<TState> & string,
  TRowCellKey extends keyof SchemaCell<TState> & string,
  TColumnCellKey extends keyof SchemaCell<TState> & string,
  TPersistState = unknown,
> {
  rowHeaders: readonly [headIdKey: TRowHeadIdKey, cellKey: TRowCellKey];
  colHeaders: readonly [headIdKey: TColumnHeadIdKey, cellKey: TColumnCellKey];
  persist?: GridPersistOption<TPersistState>;
}

export type GridUpsertHead<THead extends GridHead<string>> = Omit<
  THead,
  "label" | "order"
> &
  Partial<Pick<THead, "label" | "order">>;

export interface Grid<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
  TStateCell = GridStateCell<TCell, TRowId, TColumnId>,
  TState extends GridState<TStateCell, TRowHead, TColumnHead> = GridState<
    TStateCell,
    TRowHead,
    TColumnHead
  >,
> {
  readonly rowHeaders: readonly TRowId[];
  readonly colHeaders: readonly TColumnId[];
  getState: () => TState;
  setGrid: (nextState: TState | Partial<TState>, mode?: GridSetMode) => void;
  getCell: (rowId: TRowId, columnId: TColumnId) => Cell<TCell>;
  getValue: (rowId: TRowId, columnId: TColumnId) => TCell;
  hasCell: (rowId: TRowId, columnId: TColumnId) => boolean;
  getRowHead: (rowId: TRowId) => TRowHead;
  getColumnHead: (columnId: TColumnId) => TColumnHead;
  updateRowHead: (rowId: TRowId, nextRowHead: Updater<TRowHead>) => void;
  updateColumnHead: (columnId: TColumnId, nextColumnHead: Updater<TColumnHead>) => void;
  upsertRow: (nextRowHead: GridUpsertHead<TRowHead>) => void;
  upsertRows: (nextRowHeads: readonly GridUpsertHead<TRowHead>[]) => void;
  upsertColumn: (nextColumnHead: GridUpsertHead<TColumnHead>) => void;
  upsertColumns: (nextColumnHeads: readonly GridUpsertHead<TColumnHead>[]) => void;
  upsertCell: (nextCell: TStateCell) => void;
  upsertCells: (nextCells: readonly TStateCell[]) => void;
  clearCells: () => void;
  clearGrid: () => void;
  subscribeGrid: (
    callback: GridSubscriber<
      TCell,
      TRowId,
      TColumnId,
      TRowHead,
      TColumnHead,
      TStateCell,
      TState
    >,
  ) => () => void;
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

export type SubGridState<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
> = GridState<GridStateCell<TCell, TRowId, TColumnId>, TRowHead, TColumnHead>;

export type SubGrid<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
> = Grid<
  TCell,
  TRowId,
  TColumnId,
  TRowHead,
  TColumnHead,
  GridStateCell<TCell, TRowId, TColumnId>,
  SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
>;

export interface CreateSubGridOptions<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
> {
  cells?: readonly GridStateCell<TCell, TRowId, TColumnId>[];
  persist?: GridPersistOption<
    SubGridState<TCell, TRowId, TColumnId, TRowHead, TColumnHead>
  >;
}

export interface GridAxisIds<TRowId extends string, TColumnId extends string> {
  rows: readonly TRowId[];
  cols: readonly TColumnId[];
}

export interface GridUpdateDiff<
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
  TStateCell = unknown,
> {
  type: GridUpdateType;
  action: GridUpdateAction;
  source: GridUpdateSource;
  mode?: GridSetMode;
  rowIds?: readonly TRowId[];
  columnIds?: readonly TColumnId[];
  rowTailIds?: readonly TRowId[];
  columnTailIds?: readonly TColumnId[];
  cellKeys?: readonly string[];
  rows?: readonly TRowHead[];
  previousRows?: readonly TRowHead[];
  columns?: readonly TColumnHead[];
  previousColumns?: readonly TColumnHead[];
  cells?: readonly TStateCell[];
  previousCells?: readonly TStateCell[];
}

export type GridSubscriber<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
  TStateCell = GridStateCell<TCell, TRowId, TColumnId>,
  TState extends GridState<TStateCell, TRowHead, TColumnHead> = GridState<
    TStateCell,
    TRowHead,
    TColumnHead
  >,
> = (
  currentGrid: Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState>,
  diff: GridUpdateDiff<TRowId, TColumnId, TRowHead, TColumnHead, TStateCell>,
) => void;

export interface UseGridOptions<
  TCell,
  TRowId extends string = string,
  TColumnId extends string = string,
  TRowHead extends GridHead<TRowId> = GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId> = GridHead<TColumnId>,
  TStateCell = GridStateCell<TCell, TRowId, TColumnId>,
  TState extends GridState<TStateCell, TRowHead, TColumnHead> = GridState<
    TStateCell,
    TRowHead,
    TColumnHead
  >,
> {
  onGridUpdate?: GridSubscriber<
    TCell,
    TRowId,
    TColumnId,
    TRowHead,
    TColumnHead,
    TStateCell,
    TState
  >;
}

export type SchemaRowId<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TRowHeadIdKey extends keyof SchemaRow<TState> & string,
> = Extract<SchemaRow<TState>[TRowHeadIdKey], string>;

export type SchemaColumnId<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TColumnHeadIdKey extends keyof SchemaColumn<TState> & string,
> = Extract<SchemaColumn<TState>[TColumnHeadIdKey], string>;

export type SchemaCellValue<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TRowHeadIdKey extends keyof SchemaRow<TState> & string,
  TColumnHeadIdKey extends keyof SchemaColumn<TState> & string,
  TRowCellKey extends keyof SchemaCell<TState> & string,
  TColumnCellKey extends keyof SchemaCell<TState> & string,
> = SchemaCell<TState> &
  Record<TRowCellKey, SchemaRowId<TState, TRowHeadIdKey>> &
  Record<TColumnCellKey, SchemaColumnId<TState, TColumnHeadIdKey>>;

export type SchemaRowHead<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TRowHeadIdKey extends keyof SchemaRow<TState> & string,
> = SchemaRow<TState> & GridHead<SchemaRowId<TState, TRowHeadIdKey>>;

export type SchemaColumnHead<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TColumnHeadIdKey extends keyof SchemaColumn<TState> & string,
> = SchemaColumn<TState> & GridHead<SchemaColumnId<TState, TColumnHeadIdKey>>;

export type SchemaSnapshot<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
  TRowHeadIdKey extends keyof SchemaRow<TState> & string,
  TColumnHeadIdKey extends keyof SchemaColumn<TState> & string,
  TRowCellKey extends keyof SchemaCell<TState> & string,
  TColumnCellKey extends keyof SchemaCell<TState> & string,
> = GridState<
  SchemaCellValue<TState, TRowHeadIdKey, TColumnHeadIdKey, TRowCellKey, TColumnCellKey>,
  SchemaRowHead<TState, TRowHeadIdKey>,
  SchemaColumnHead<TState, TColumnHeadIdKey>
>;

export interface GridInitialCellEntry<
  TCell,
  TRowId extends string,
  TColumnId extends string,
> {
  rowId: TRowId;
  columnId: TColumnId;
  cell: Cell<TCell>;
}

export interface GridStateAdapter<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TStateCell,
> {
  deserializeCell: (stateCell: TStateCell) => {
    rowId: TRowId;
    columnId: TColumnId;
    value: TCell;
  };
  serializeCell: (rowId: TRowId, columnId: TColumnId, value: TCell) => TStateCell;
}

export type BroadSchemaRowHead<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
> = SchemaRow<TState> & GridHead<string>;

export type BroadSchemaColumnHead<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
> = SchemaColumn<TState> & GridHead<string>;

export type BroadSchemaSnapshot<
  TState extends GridState<GridRecord, GridRecord, GridRecord>,
> = GridState<
  SchemaCell<TState>,
  BroadSchemaRowHead<TState>,
  BroadSchemaColumnHead<TState>
>;

export interface InternalGridCellSetter<
  TCell,
  TRowId extends string,
  TColumnId extends string,
> {
  __setCellValue: (rowId: TRowId, columnId: TColumnId, newValue: TCell) => void;
}

export type WritableGrid<
  TCell,
  TRowId extends string,
  TColumnId extends string,
  TRowHead extends GridHead<TRowId>,
  TColumnHead extends GridHead<TColumnId>,
  TStateCell,
  TState extends GridState<TStateCell, TRowHead, TColumnHead>,
> = Grid<TCell, TRowId, TColumnId, TRowHead, TColumnHead, TStateCell, TState> &
  InternalGridCellSetter<TCell, TRowId, TColumnId>;

export type AnyGrid = Grid<any, any, any, any, any, any, any>;

export type GridRowIdOf<TGrid extends AnyGrid> =
  TGrid extends Grid<any, infer TRowId, any, any, any, any, any>
    ? Extract<TRowId, string>
    : never;

export type GridColumnIdOf<TGrid extends AnyGrid> =
  TGrid extends Grid<any, any, infer TColumnId, any, any, any, any>
    ? Extract<TColumnId, string>
    : never;

export type GridRowHeadOf<TGrid extends AnyGrid> =
  TGrid extends Grid<any, any, any, infer TRowHead, any, any, any> ? TRowHead : never;

export type GridColumnHeadOf<TGrid extends AnyGrid> =
  TGrid extends Grid<any, any, any, any, infer TColumnHead, any, any>
    ? TColumnHead
    : never;

export type ParentSubGridState<TCell, TParentGrid extends AnyGrid> = SubGridState<
  TCell,
  GridRowIdOf<TParentGrid>,
  GridColumnIdOf<TParentGrid>,
  GridRowHeadOf<TParentGrid>,
  GridColumnHeadOf<TParentGrid>
>;

export type ParentSubGrid<TCell, TParentGrid extends AnyGrid> = SubGrid<
  TCell,
  GridRowIdOf<TParentGrid>,
  GridColumnIdOf<TParentGrid>,
  GridRowHeadOf<TParentGrid>,
  GridColumnHeadOf<TParentGrid>
>;

export type ParentSubGridOptions<TCell, TParentGrid extends AnyGrid> = CreateSubGridOptions<
  TCell,
  GridRowIdOf<TParentGrid>,
  GridColumnIdOf<TParentGrid>,
  GridRowHeadOf<TParentGrid>,
  GridColumnHeadOf<TParentGrid>
>;
