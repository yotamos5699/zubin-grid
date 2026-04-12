


## NOT FOR LLM USE
-[] Add `batchUpdate(fn)`
  - Executes multiple grid mutations
  - Emits **only one** `onGridUpdate` event at the end
  - Improves performance for bulk updates

-[] Add `getGridSnapshot()`
  - Returns a full immutable snapshot of grid state
  - Includes cells, headers, tails, rows, columns

-[] Add `restoreGridFromSnapshot(snapshot)`
  - Restores grid state from snapshot
  - Enables undo/redo functionality