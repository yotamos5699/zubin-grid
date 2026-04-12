export { cell, useCell, useCellValue } from "./core/cell.js";
export type { Cell, Subscriber, Updater } from "./core/types/cell.types.js";

export { createGridKey, createSubGrid, grid, useGrid } from "./core/grid.js";
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
} from "./core/types/grid.types.js";

export { defaultGridPersistAdapter } from "./core/gridPersist.js";

export {
  assertHeadId,
  createHeadCellMap,
  createHeadOrderIndex,
  getHeadCell,
  getOrderedHeads,
  normalizeGridHeads,
  useColHead,
  useColumnHead,
  useRowHead,
} from "./core/head.js";
export type {
  GridHead,
  GridHeadHookResult,
  GridHeadId,
  GridHeadInput,
  GridHeadObject,
  NormalizedGridHead,
  ResolvedGridHead,
} from "./core/types/head.types.js";

export {
  createTailCellMap,
  getTailCell,
  readReactiveTailValue,
  setTailCellResult,
  useColumnTail,
  useRowTail,
} from "./core/tail.js";
export type {
  GridAxisCell,
  GridAxisTailUpdater,
  GridTailState,
} from "./core/types/tail.types.js";
