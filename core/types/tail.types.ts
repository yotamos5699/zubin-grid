import type { Cell } from "./cell.types.js";

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

export type GridTailHookValue<TTail> = [TTail] extends [void] ? void : TTail | undefined;
