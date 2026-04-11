# zubin-grid

A lightweight grid state manager for React and TypeScript.

`zubin-grid` helps you model a 2D grid of reactive cells, update row and column headers, and compute derived row or column summaries with simple hooks.

## Why use it?

- Reactive cell store with subscriptions
- Typed grid API for rows, columns, heads, and tails
- React hooks for reading and updating state
- Row and column reordering helpers
- Support for matrix-style input and JSON-friendly state

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

Create a grid from a 2D array of cells:

```ts
import { cell, grid } from 'zubin-grid'

const salesGrid = grid(
  [
    [cell(12), cell(9), cell(4)],
    [cell(7), cell(15), cell(8)],
  ],
  {
    rowHeaders: [
      { id: 'north', label: 'North' },
      { id: 'south', label: 'South' },
    ],
    colHeaders: ['jan', 'feb', 'mar'],
  },
)

console.log(salesGrid.getValue('north', 'jan'))
// 12

salesGrid.setValue('south', 'mar', 11)
console.log(salesGrid.getValue('south', 'mar'))
// 11
```

## React example

Create the grid once outside render, or memoize it if you build it inside a component.

```tsx
import { cell, grid, useCell } from 'zubin-grid'

const budgetGrid = grid(
  [
    [cell(1000), cell(1200)],
    [cell(800), cell(950)],
  ],
  {
    rowHeaders: ['marketing', 'ops'],
    colHeaders: ['planned', 'actual'],
  },
)

export function BudgetCell(props: {
  rowId: 'marketing' | 'ops'
  columnId: 'planned' | 'actual'
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

```tsx
import { useGrid } from 'zubin-grid'

export function GridToolbar() {
  const { rows, cols, reorderRow, reorderColumn } = useGrid(budgetGrid)

  return (
    <div>
      <div>Rows: {rows.join(', ')}</div>
      <div>Columns: {cols.join(', ')}</div>

      <button onClick={() => reorderRow('ops', 'marketing')}>
        Move ops above marketing
      </button>

      <button onClick={() => reorderColumn('actual', 'planned')}>
        Move actual first
      </button>
    </div>
  )
}
```

## Creating a grid from JSON-friendly state

If your data already exists as JSON-like records, you can create the grid from a single schema object.

```ts
import { grid } from 'zubin-grid'

type SalesSchema = {
  rows: Array<{ id: string; label: string }>
  columns: Array<{ id: string; label: string }>
  cells: Array<{ rowId: string; columnId: string; value: number }>
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

salesGrid.upsertRow({ id: 'west', label: 'West' })
salesGrid.upsertColumn({ id: 'mar', label: 'March' })
salesGrid.upsertCell({ rowId: 'west', columnId: 'mar', value: 21 })
```

`getValue`, `getRowHead`, and `getColumnHead` are also non-reactive getters when you only need a targeted read.

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
- `grid(cells, options)` - creates a grid from a 2D matrix
- `grid({ rows, columns, cells }, options)` - creates a grid from JSON-friendly state
- `grid(() => ({ rows, columns, cells }), options)` - lazily creates typed grid state

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

- `useGrid(grid)`
- `createGridKey(rowId, columnId)`
- `grid.getState()`
- `grid.upsertRow(...)`
- `grid.upsertColumn(...)`
- `grid.upsertCell(...)`
- `grid.upsertCells(...)`

## Imports

Use the root package for most cases:

```ts
import {
  cell,
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
import { useRowTail } from 'zubin-grid/tail'
```

## Links

- [npm package](https://www.npmjs.com/package/zubin-grid)
- [GitHub repository](https://github.com/yotamos5699/zubin-grid)
- [Issue tracker](https://github.com/yotamos5699/zubin-grid/issues)

## License

MIT
