# zubin-grid

A lightweight grid state manager for React and TypeScript.

`zubin-grid` helps you model a 2D grid of reactive cells, update row and column headers, and compute derived row or column summaries with simple hooks.

## Why use it?

- Reactive cell store with subscriptions
- Typed grid API for rows, columns, heads, and tails
- React hooks for reading and updating state
- Row and column reordering helpers
- JSON-friendly initialization with typed row, column, and cell records

## Installation

```bash
npm install zubin-grid react
```

> `react` is a peer dependency. Hooks are designed for React 18+.

## Local example app

This repository also includes a small Vite + React playground under `examples/` so you can try the JSON-friendly grid API, persistence, and the demo controls locally.

```bash
npm install
npm run example
```

Useful companion scripts:

```bash
npm run example:check
npm run example:build
```

## Quick start

Create a grid from JSON-friendly row, column, and cell records:

```ts
import { grid } from 'zubin-grid'

type SalesSchema = {
  rows: { id: string; label: string }[]
  columns: { id: string; label: string }[]
  cells: { rowId: string; columnId: string; value: number }[]
}

const initialState: SalesSchema = {
  rows: [
    { id: 'north', label: 'North' },
    { id: 'south', label: 'South' },
  ],
  columns: [
    { id: 'jan', label: 'January' },
    { id: 'feb', label: 'February' },
  ],
  cells: [
    { rowId: 'north', columnId: 'jan', value: 12 },
    { rowId: 'north', columnId: 'feb', value: 9 },
    { rowId: 'south', columnId: 'jan', value: 7 },
    { rowId: 'south', columnId: 'feb', value: 15 },
  ],
}

const salesGrid = grid<SalesSchema>(initialState, {
  rowHeaders: ['id', 'rowId'],
  colHeaders: ['id', 'columnId'],
})

console.log(salesGrid.getValue('north', 'jan'))
// 12
```

## React example

Create the grid once outside render, or memoize it if you build it inside a component.

```tsx
import { grid, useCell } from 'zubin-grid'

type BudgetRowId = 'marketing' | 'ops'
type BudgetColumnId = 'planned' | 'actual'

type BudgetSchema = {
  rows: { id: BudgetRowId; label: string }[]
  columns: { id: BudgetColumnId; label: string }[]
  cells: {
    rowId: BudgetRowId
    columnId: BudgetColumnId
    value: number
  }[]
}

const budgetGrid = grid<BudgetSchema>(
  {
    rows: [
      { id: 'marketing', label: 'Marketing' },
      { id: 'ops', label: 'Operations' },
    ],
    columns: [
      { id: 'planned', label: 'Planned' },
      { id: 'actual', label: 'Actual' },
    ],
    cells: [
      { rowId: 'marketing', columnId: 'planned', value: 1000 },
      { rowId: 'marketing', columnId: 'actual', value: 1200 },
      { rowId: 'ops', columnId: 'planned', value: 800 },
      { rowId: 'ops', columnId: 'actual', value: 950 },
    ],
  },
  {
    rowHeaders: ['id', 'rowId'],
    colHeaders: ['id', 'columnId'],
  },
)

export function BudgetCell(props: {
  rowId: BudgetRowId
  columnId: BudgetColumnId
}) {
  const [value, setValue] = useCell(budgetGrid, props.rowId, props.columnId)

  return (
    <input
      type="number"
      value={value}
      onChange={(event) => setValue(Number(event.target.value))}
    />
  )
}
```

`useCell(grid, rowId, columnId)` returns a React-friendly setter for that cell. Outside React, mutate store cells with `grid.upsertCell(...)` or `grid.upsertCells(...)` rather than a store-level `setValue(...)` helper.

## Working with heads

Headers are stored separately from cell values, so labels and order can change without rebuilding the grid.

```tsx
import { useColumnHead, useRowHead } from 'zubin-grid'

export function HeaderControls() {
  const { head: rowHead, updateLabel } = useRowHead(budgetGrid, 'marketing')
  const { head: columnHead, updateOrder } = useColumnHead(budgetGrid, 'actual')

  return (
    <div>
      <button onClick={() => updateLabel('Marketing Team')}>
        Rename row: {rowHead.label}
      </button>

      <button onClick={() => updateOrder(0)}>
        Move column first: {columnHead.label}
      </button>
    </div>
  )
}
```

## Derived row and column tails

Tails let you compute summaries such as totals.

```tsx
import { useRowTail } from 'zubin-grid'

export function MarketingRowTotal() {
  const total = useRowTail(budgetGrid, 'marketing', (cells) => {
    return cells.reduce((sum, currentCell) => sum + currentCell.value, 0)
  })

  return <strong>Total: {total ?? 0}</strong>
}
```

## Reordering rows and columns

`useGrid` now stays focused on reading the ordered row and column ids. Mutating helpers such as `reorderRow` and `reorderColumn` live on the `zubin-grid/helpers` subpath so the root package stays focused on the core store and hook primitives.

```tsx
import { useGrid } from 'zubin-grid'
import { reorderColumn, reorderRow } from 'zubin-grid/helpers'

export function GridToolbar() {
  const { rows, cols } = useGrid(budgetGrid)

  return (
    <div>
      <div>Rows: {rows.join(', ')}</div>
      <div>Columns: {cols.join(', ')}</div>

      <button onClick={() => reorderRow(budgetGrid, 'ops', 'marketing')}>
        Move ops above marketing
      </button>

      <button onClick={() => reorderColumn(budgetGrid, 'actual', 'planned')}>
        Move actual first
      </button>
    </div>
  )
}
```

`useGrid` also accepts an optional `onGridUpdate` callback so React components can listen to every grid mutation with the current grid reference plus a structured diff.

```tsx
const { rows, cols } = useGrid(budgetGrid, {
  onGridUpdate: (nextGrid, diff) => {
    console.log(nextGrid.getState(), diff)
  },
})
```

Outside React, use `budgetGrid.subscribeGrid((grid, diff) => { ... })`.

## Full-grid updates and reset helpers

Use `setGrid` when you want to work with full snapshots instead of one row, column, or cell at a time.

```ts
salesGrid.setGrid({
  rows: [{ id: 'west', label: 'West', order: 2 }],
  columns: [{ id: 'mar', label: 'March', order: 2 }],
  cells: [{ rowId: 'west', columnId: 'mar', value: 21 }],
}, 'update')

salesGrid.setGrid({
  rows: [],
  columns: [],
  cells: [],
}, 'replace')
```

- `"update"` merges incoming rows, columns, and cells into the existing grid.
- `"replace"` swaps the current rows, columns, and cells with the incoming snapshot.

Reset helpers are available for the common clear flows:

```ts
salesGrid.clearCells()
salesGrid.clearGrid()
```

- `clearCells()` removes current cell entries while preserving row/column heads and tail registrations.
- `clearGrid()` clears rows, columns, cells, and tail registrations.

## Creating a grid from JSON-friendly state

If your data already exists as JSON-like records, you can create the grid from a single schema object.

`grid` only accepts this schema-based initializer form now.

```ts
import { grid } from 'zubin-grid'

type SalesSchema = {
  rows: { id: string; label: string }[]
  columns: { id: string; label: string }[]
  cells: { rowId: string; columnId: string; value: number }[]
}

const initialState: SalesSchema = {
  rows: [
    { id: 'north', label: 'North' },
    { id: 'south', label: 'South' },
  ],
  columns: [
    { id: 'jan', label: 'January' },
    { id: 'feb', label: 'February' },
  ],
  cells: [
    { rowId: 'north', columnId: 'jan', value: 12 },
    { rowId: 'north', columnId: 'feb', value: 9 },
    { rowId: 'south', columnId: 'jan', value: 7 },
    { rowId: 'south', columnId: 'feb', value: 15 },
  ],
}

const salesGrid = grid<SalesSchema>(initialState, {
  rowHeaders: ['id', 'rowId'],
  colHeaders: ['id', 'columnId'],
})
```

You can also lazily create that state with a function, which is handy when you want explicit typing during bootstrap:

```ts
const emptySalesGrid = grid<SalesSchema>(() => ({
  rows: [],
  columns: [],
  cells: [],
}), {
  rowHeaders: ['id', 'rowId'],
  colHeaders: ['id', 'columnId'],
})
```

You can keep the initializer even lighter and let missing arrays default to `[]`:

```ts
const bootstrappedSalesGrid = grid<SalesSchema>({}, {
  rowHeaders: ['id', 'rowId'],
  colHeaders: ['id', 'columnId'],
})
```

## Non-reactive snapshots and upserts

`grid.getState()` returns a plain snapshot of the current rows, columns, and cells without subscribing React to anything.

```ts
const snapshot = salesGrid.getState()

salesGrid.upsertRows([{ id: 'west', label: 'West' }])
salesGrid.upsertColumns([{ id: 'mar', label: 'March' }])
salesGrid.upsertCell({ rowId: 'west', columnId: 'mar', value: 21 })
```

`getValue`, `getRowHead`, and `getColumnHead` are also non-reactive getters when you only need a targeted read.

## Sub grids

Use `createSubGrid` when you want a second grid layer that reuses the parent grid's row and column dimensions, but stores a different cell shape.

```ts
import { createSubGrid, useCell } from 'zubin-grid'

type SalesNoteCell = {
  note: string
  dirty?: boolean
}

const salesNotesGrid = createSubGrid<SalesNoteCell>(salesGrid, [], ['sales-notes'])

function SalesNote(props: {
  rowId: 'north' | 'south'
  columnId: 'jan' | 'feb'
}) {
  const [noteCell, setNoteCell] = useCell(
    salesNotesGrid,
    props.rowId,
    props.columnId,
  )

  return (
    <input
      value={noteCell.note}
      onChange={(event) =>
        setNoteCell({
          ...noteCell,
          note: event.target.value,
          dirty: true,
        })
      }
    />
  )
}
```

Sub grids behave like normal grids for cell and hook usage, with a few important rules:

- They inherit the parent grid's row ids, column ids, row heads, and column heads.
- Parent row and column changes stay in sync, including upserts, label changes, order changes, `setGrid(...)`, and `clearGrid()`.
- `useCell`, `useCellValue`, `useGrid`, `useRowHead`, `useColumnHead`, `useRowTail`, and `useColumnTail` all work with sub grids.
- Persistence is independent, so a sub grid can keep its own snapshot with `persist: ['your-key']`.
- Row and column mutations called on a sub grid are forwarded to the parent grid.
- `clearGrid()` on a sub grid clears the sub grid's own cells while keeping the inherited parent dimensions intact.

You can also pass an options object when you want cells plus persistence together in a single argument:

```ts
const salesFlagsGrid = createSubGrid<SalesNoteCell>(salesGrid, {
  cells: [{ rowId: 'north', columnId: 'jan', value: { note: 'Review' } }],
  persist: ['sales-flags'],
})
```

## Persistence

Use `persist` to cache the current grid snapshot under a storage key. A custom adapter can be provided, otherwise `zubin-grid` falls back to a default async browser storage implementation with a runtime cache.

```ts
const persistedSalesGrid = grid<SalesSchema>(initialState, {
  rowHeaders: ['id', 'rowId'],
  colHeaders: ['id', 'columnId'],
  persist: ['sales-grid'],
})
```

Custom adapters receive `get`, `set`, and `remove` methods:

```ts
const persistedWithCustomAdapter = grid<SalesSchema>(initialState, {
  rowHeaders: ['id', 'rowId'],
  colHeaders: ['id', 'columnId'],
  persist: [
    'sales-grid',
    {
      get: async (key) => window.myStore.get(key) ?? null,
      set: async (key, value) => {
        await window.myStore.set(key, value)
      },
      remove: async (key) => {
        await window.myStore.remove(key)
      },
    },
  ],
})
```

## API overview

### Store creators

- `cell(initialValue)` - creates a reactive cell
- `grid({ rows, columns, cells }, options)` - creates a grid from JSON-friendly state
- `grid(() => ({ rows, columns, cells }), options)` - lazily creates typed grid state
- `createSubGrid(parentGrid, cellsOrOptions?, persist?)` - creates a child grid with its own cells while inheriting the parent grid dimensions

### Cell hooks

- `useCell(cell)`
- `useCell(grid, rowId, columnId)`
- `useCellValue(...)`

### Head hooks

- `useRowHead(grid, rowId)`
- `useColumnHead(grid, columnId)`

### Tail hooks

- `useRowTail(grid, rowId, updater)`
- `useColumnTail(grid, columnId, updater)`

### Grid helpers

- `useGrid(grid, { onGridUpdate })` - reads the current ordered row and column ids and can subscribe to every grid mutation
- `createGridKey(rowId, columnId)`
- `grid.getState()`
- `grid.setGrid(nextState, mode?)`
- `grid.upsertRow(...)`
- `grid.upsertRows(...)`
- `grid.upsertColumn(...)`
- `grid.upsertColumns(...)`
- `grid.upsertCell(...)`
- `grid.upsertCells(...)`
- `grid.clearCells()`
- `grid.clearGrid()`
- `grid.subscribeGrid((grid, diff) => { ... })`

### Helper subpath

- `reorderRow(grid, activeRowId, overRowId)` from `zubin-grid/helpers`
- `reorderColumn(grid, activeColumnId, overColumnId)` from `zubin-grid/helpers`

## Imports

Use the root package for most cases:

```ts
import {
  cell,
  createSubGrid,
  grid,
  useCell,
  useCellValue,
  useRowHead,
  useColumnHead,
  useRowTail,
  useColumnTail,
  useGrid,
} from 'zubin-grid'
```

Subpath imports are also available:

```ts
import { grid } from 'zubin-grid/grid'
import { reorderColumn, reorderRow } from 'zubin-grid/helpers'
import { useRowTail } from 'zubin-grid/tail'
```

## Links

- [npm package](https://www.npmjs.com/package/zubin-grid)
- [GitHub repository](https://github.com/yotamos5699/zubin-grid)
- [Issue tracker](https://github.com/yotamos5699/zubin-grid/issues)

## License

MIT
