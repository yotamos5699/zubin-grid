import { cell, grid } from "../index.js";

type DemoSchema = {
  rows: { id: "row-a"; label: string }[];
  columns: { id: "col-a"; label: string }[];
  cells: { rowId: "row-a"; columnId: "col-a"; value: number }[];
};

grid<DemoSchema>(
  {
    rows: [{ id: "row-a", label: "Row A" }],
    columns: [{ id: "col-a", label: "Column A" }],
    cells: [{ rowId: "row-a", columnId: "col-a", value: 11 }],
  },
  {
    rowHeaders: ["id", "rowId"],
    colHeaders: ["id", "columnId"],
  },
);

grid(
  // @ts-expect-error Legacy matrix grid input must remain unsupported.
  [
    [cell(11), cell(12)],
    [cell(21), cell(22)],
  ],
  {
    rowHeaders: ["row-a", "row-b"] as const,
    colHeaders: ["col-a", "col-b"] as const,
  },
);
