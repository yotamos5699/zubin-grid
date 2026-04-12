import { createSubGrid, grid } from "../index.js";
import type { Grid, GridState } from "../index.js";

type ParentSchema = {
  rows: { id: "row-a" | "row-b"; label: string }[];
  columns: { id: "col-a" | "col-b"; label: string }[];
  cells: {
    rowId: "row-a" | "row-b";
    columnId: "col-a" | "col-b";
    value: number;
  }[];
};

type NoteCell = {
  note: string;
  dirty?: boolean;
};

const parentState = {
  rows: [
    { id: "row-a", label: "Row A" },
    { id: "row-b", label: "Row B" },
  ],
  columns: [
    { id: "col-a", label: "Column A" },
    { id: "col-b", label: "Column B" },
  ],
  cells: [
    { rowId: "row-a", columnId: "col-a", value: 11 },
    { rowId: "row-a", columnId: "col-b", value: 12 },
    { rowId: "row-b", columnId: "col-a", value: 21 },
    { rowId: "row-b", columnId: "col-b", value: 22 },
  ],
} satisfies ParentSchema;

const parentGrid = grid(parentState, {
  rowHeaders: ["id", "rowId"] as const,
  colHeaders: ["id", "columnId"] as const,
});

type StrictRowId = ParentSchema["rows"][number]["id"];
type StrictColumnId = ParentSchema["columns"][number]["id"];
type StrictRowHead = ParentSchema["rows"][number] & {
  id: StrictRowId;
  label: string;
  order: number;
};
type StrictColumnHead = ParentSchema["columns"][number] & {
  id: StrictColumnId;
  label: string;
  order: number;
};
type StrictParentState = GridState<
  ParentSchema["cells"][number],
  StrictRowHead,
  StrictColumnHead
>;

const strictParentGrid = parentGrid as unknown as Grid<
  ParentSchema["cells"][number],
  StrictRowId,
  StrictColumnId,
  StrictRowHead,
  StrictColumnHead,
  ParentSchema["cells"][number],
  StrictParentState
>;

const notesGrid = createSubGrid<NoteCell>(parentGrid, []);

const inferredNotesGrid = createSubGrid(strictParentGrid, [
  {
    rowId: "row-a",
    columnId: "col-a",
    value: { note: "Seeded" } as NoteCell,
  },
]);

notesGrid.upsertCell({
  rowId: "row-a",
  columnId: "col-a",
  value: { note: "Ready" },
});
notesGrid.upsertCells([
  {
    rowId: "row-a",
    columnId: "col-b",
    value: { note: "Queued", dirty: true },
  },
]);
notesGrid.getValue("row-a", "col-a").note;
notesGrid.getState().rows[0]?.label;
notesGrid.getState().cells[0]?.value.note;

const persistedNotesGrid = createSubGrid<NoteCell>(parentGrid, [], [
  "notes-grid",
] as const);
persistedNotesGrid.getState();

const tuplePersistGrid = createSubGrid<NoteCell>(parentGrid, [
  "notes-grid:tuple",
] as const);
tuplePersistGrid.getState();

const optionsGrid = createSubGrid<NoteCell>(parentGrid, {
  cells: [
    {
      rowId: "row-b",
      columnId: "col-b",
      value: { note: "Options API" },
    },
  ],
  persist: ["notes-grid:options"] as const,
});
optionsGrid.getValue("row-b", "col-b").note;

notesGrid.updateRowHead("row-a", {
  ...notesGrid.getRowHead("row-a"),
  label: "Row A+",
});

// @ts-expect-error Invalid row ids from the parent grid must stay rejected.
inferredNotesGrid.getValue("row-c", "col-a");

inferredNotesGrid.upsertCell({
  rowId: "row-a",
  // @ts-expect-error Invalid column ids from the parent grid must stay rejected.
  columnId: "col-c",
  value: { note: "Nope" },
});

// @ts-expect-error Sub grid cells must use the declared NoteCell value shape.
const invalidNoteValue: NoteCell = { wrong: true };

notesGrid.upsertCell({
  rowId: "row-a",
  columnId: "col-a",
  value: invalidNoteValue,
});
