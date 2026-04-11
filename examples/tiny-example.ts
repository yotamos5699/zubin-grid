import { createGridKey, defaultGridPersistAdapter, grid } from "../index.js";

export const DEMO_PERSIST_KEY = "zubin-grid:tiny-example";
export const DEMO_PERSIST_ENABLED_KEY = `${DEMO_PERSIST_KEY}:enabled`;

export interface DemoRow extends Record<string, unknown> {
  id: string;
  label: string;
  order?: number;
}

export interface DemoColumn extends Record<string, unknown> {
  id: string;
  label: string;
  order?: number;
}

export interface DemoCell extends Record<string, unknown> {
  rowId: string;
  columnId: string;
  value: number;
}

export interface DemoState {
  rows: DemoRow[];
  columns: DemoColumn[];
  cells: DemoCell[];
}

const demoBaseState = {
  rows: [
    { id: "apples", label: "Apples" },
    { id: "oranges", label: "Oranges" },
  ],
  columns: [
    { id: "warehouse", label: "Warehouse" },
    { id: "store", label: "Store" },
  ],
  cells: [
    { rowId: "apples", columnId: "warehouse", value: 12 },
    { rowId: "apples", columnId: "store", value: 9 },
    { rowId: "oranges", columnId: "warehouse", value: 7 },
    { rowId: "oranges", columnId: "store", value: 15 },
  ],
} satisfies DemoState;

type DemoAxisCell = {
  value: DemoCell;
};

export const sumAxisCells = (cells: readonly DemoAxisCell[]) => {
  return cells.reduce((total, currentCell) => total + currentCell.value.value, 0);
};

export function createDemoState(): DemoState {
  return {
    rows: demoBaseState.rows.map((row) => ({ ...row })),
    columns: demoBaseState.columns.map((column) => ({ ...column })),
    cells: demoBaseState.cells.map((currentCell) => ({ ...currentCell })),
  };
}

export function createDemoGrid(options?: {
  persistEnabled?: boolean;
  state?: DemoState;
}) {
  const initialState = options?.state ?? createDemoState();

  return grid<DemoState>(initialState, {
    rowHeaders: ["id", "rowId"],
    colHeaders: ["id", "columnId"],
    persist: options?.persistEnabled
      ? [DEMO_PERSIST_KEY, defaultGridPersistAdapter]
      : undefined,
  });
}
export type DemoGrid = ReturnType<typeof createDemoGrid>;

export type DemoAction = {
  id: string;
  label: string;
  run: (currentGrid: DemoGrid) => string;
};

export async function loadDemoPersistedState() {
  return (await Promise.resolve(
    defaultGridPersistAdapter.get(DEMO_PERSIST_KEY),
  )) as DemoState | null;
}

export function loadDemoPersistPreference() {
  const browserStorage = getDemoBrowserStorage();

  return browserStorage?.getItem(DEMO_PERSIST_ENABLED_KEY) === "true";
}

export function saveDemoPersistPreference(isPersistEnabled: boolean) {
  const browserStorage = getDemoBrowserStorage();

  if (!browserStorage) {
    return;
  }

  if (isPersistEnabled) {
    browserStorage.setItem(DEMO_PERSIST_ENABLED_KEY, "true");
    return;
  }

  browserStorage.removeItem(DEMO_PERSIST_ENABLED_KEY);
}

export async function saveDemoPersistedState(nextState: DemoState) {
  await Promise.resolve(defaultGridPersistAdapter.set(DEMO_PERSIST_KEY, nextState));
}

export async function resetDemoPersistedState() {
  await Promise.resolve(defaultGridPersistAdapter.remove(DEMO_PERSIST_KEY));
}

function getDemoBrowserStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    return localStorage;
  } catch {
    return null;
  }
}

function seedCell(currentGrid: DemoGrid, rowId: string, columnId: string, value: number) {
  if (currentGrid.hasCell(rowId, columnId)) return;

  currentGrid.upsertCell({ rowId, columnId, value });
}

function ensureBananasRow(currentGrid: DemoGrid) {
  currentGrid.upsertRow({ id: "bananas", label: "Bananas" });
  seedCell(currentGrid, "bananas", "warehouse", 5);
  seedCell(currentGrid, "bananas", "store", 4);

  if (currentGrid.colHeaders.includes("truck")) {
    seedCell(currentGrid, "bananas", "truck", 21);
  }
}

function ensureTruckColumn(currentGrid: DemoGrid) {
  currentGrid.upsertColumn({ id: "truck", label: "Truck" });
  seedCell(currentGrid, "apples", "truck", 3);
  seedCell(currentGrid, "oranges", "truck", 6);

  if (currentGrid.rowHeaders.includes("bananas")) {
    seedCell(currentGrid, "bananas", "truck", 21);
  }
}

function reorderAxisIds(items: readonly string[], activeId: string, overId: string) {
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

function moveRow(currentGrid: DemoGrid, activeRowId: string, overRowId: string) {
  const nextOrderedRowIds = reorderAxisIds(
    currentGrid.rowHeaders,
    activeRowId,
    overRowId,
  );

  if (nextOrderedRowIds === currentGrid.rowHeaders) {
    return false;
  }

  nextOrderedRowIds.forEach((rowId, index) => {
    currentGrid.updateRowHead(rowId, (currentHead) => ({
      ...currentHead,
      order: index,
    }));
  });

  return true;
}

function moveColumn(currentGrid: DemoGrid, activeColumnId: string, overColumnId: string) {
  const nextOrderedColumnIds = reorderAxisIds(
    currentGrid.colHeaders,
    activeColumnId,
    overColumnId,
  );

  if (nextOrderedColumnIds === currentGrid.colHeaders) {
    return false;
  }

  nextOrderedColumnIds.forEach((columnId, index) => {
    currentGrid.updateColumnHead(columnId, (currentHead) => ({
      ...currentHead,
      order: index,
    }));
  });

  return true;
}

export const demoActions: readonly DemoAction[] = [
  {
    id: "update-oranges-store",
    label: "Test: update oranges/store",
    run: (currentGrid) => {
      const currentCell = currentGrid.getValue("oranges", "store");
      const nextValue = currentCell.value + 3;

      currentGrid.setValue("oranges", "store", {
        ...currentCell,
        value: nextValue,
      });

      return `Updated oranges/store to ${nextValue}.`;
    },
  },
  {
    id: "rename-apples-row",
    label: "Test: rename apples row",
    run: (currentGrid) => {
      currentGrid.updateRowHead("apples", (currentHead) => ({
        ...currentHead,
        label: currentHead.label === "Apples" ? "Green apples" : "Apples",
      }));

      return `Apples row label is now "${currentGrid.getRowHead("apples").label}".`;
    },
  },
  {
    id: "upsert-bananas-row",
    label: "Test: add bananas row",
    run: (currentGrid) => {
      ensureBananasRow(currentGrid);

      return "Bananas row is ready with starter warehouse/store values.";
    },
  },
  {
    id: "upsert-truck-column",
    label: "Test: add truck column",
    run: (currentGrid) => {
      ensureTruckColumn(currentGrid);

      return "Truck column is ready for all current rows.";
    },
  },
  {
    id: "set-bananas-truck",
    label: "Test: set bananas/truck",
    run: (currentGrid) => {
      ensureBananasRow(currentGrid);
      ensureTruckColumn(currentGrid);
      currentGrid.upsertCell({ rowId: "bananas", columnId: "truck", value: 21 });

      return `bananas/truck = ${currentGrid.getValue("bananas", "truck").value}.`;
    },
  },
  {
    id: "move-bananas-first",
    label: "Test: move bananas first",
    run: (currentGrid) => {
      ensureBananasRow(currentGrid);

      const didMove = moveRow(
        currentGrid,
        "bananas",
        currentGrid.rowHeaders[0] ?? "apples",
      );

      return didMove
        ? `Row order is now ${currentGrid.rowHeaders.join(" → ")}.`
        : "Bananas row was already first.";
    },
  },
  {
    id: "move-truck-first",
    label: "Test: move truck first",
    run: (currentGrid) => {
      ensureTruckColumn(currentGrid);

      const didMove = moveColumn(
        currentGrid,
        "truck",
        currentGrid.colHeaders[0] ?? "warehouse",
      );

      return didMove
        ? `Column order is now ${currentGrid.colHeaders.join(" → ")}.`
        : "Truck column was already first.";
    },
  },
];

export function getSnapshotJson(currentGrid: DemoGrid) {
  return JSON.stringify(currentGrid.getState(), null, 2);
}

export function getDemoCellKey() {
  return createGridKey("bananas", "truck");
}
