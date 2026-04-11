import type { Cell, Subscriber, Updater } from "./cell.types.js";
import type {
  GridHead,
  GridHeadId,
  GridHeadInput,
  ResolvedGridHead,
} from "./head.types.js";
import type { GridAxisCell, GridAxisTailUpdater, GridTailState } from "./tail.types.js";

export type { GridPersistAdapter, GridPersistOption } from "./gridPersist.types.js";

import type { GridPersistOption } from "./gridPersist.types.js";

export type GridRecord = Record<string, unknown>;

export interface GridState<TCell, TRow = GridRecord, TColumn = GridRecord> {
  cells: readonly TCell[];
  rows: readonly TRow[];
  columns: readonly TColumn[];
}

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
  | TState
  | Partial<TState>
  | (() => TState | Partial<TState>);

export interface GridOptions<
  TRowHeadInput extends GridHeadInput,
  TColumnHeadInput extends GridHeadInput,
  TPersistState = unknown,
> {
  rowHeaders: readonly TRowHeadInput[];
  colHeaders: readonly TColumnHeadInput[];
  persist?: GridPersistOption<TPersistState>;
}

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
  getCell: (rowId: TRowId, columnId: TColumnId) => Cell<TCell>;
  getValue: (rowId: TRowId, columnId: TColumnId) => TCell;
  setValue: (rowId: TRowId, columnId: TColumnId, newValue: TCell) => void;
  hasCell: (rowId: TRowId, columnId: TColumnId) => boolean;
  getRowHead: (rowId: TRowId) => TRowHead;
  getColumnHead: (columnId: TColumnId) => TColumnHead;
  updateRowHead: (rowId: TRowId, nextRowHead: Updater<TRowHead>) => void;
  updateColumnHead: (columnId: TColumnId, nextColumnHead: Updater<TColumnHead>) => void;
  upsertRow: (nextRowHead: GridUpsertHead<TRowHead>) => void;
  upsertColumn: (nextColumnHead: GridUpsertHead<TColumnHead>) => void;
  upsertCell: (nextCell: TStateCell) => void;
  upsertCells: (nextCells: readonly TStateCell[]) => void;
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

export type GridMatrixSnapshot<
  TCell,
  TRowHeadInput extends GridHeadInput,
  TColumnHeadInput extends GridHeadInput,
> = GridState<
  GridStateCell<TCell, GridHeadId<TRowHeadInput>, GridHeadId<TColumnHeadInput>>,
  ResolvedGridHead<TRowHeadInput>,
  ResolvedGridHead<TColumnHeadInput>
>;

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
