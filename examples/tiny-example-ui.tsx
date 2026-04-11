import { useEffect, useRef, useState } from "react";

import {
  createGridKey,
  useCell,
  useColumnHead,
  useColumnTail,
  useRowHead,
  useRowTail,
} from "../index.js";

import {
  createDemoState,
  createDemoGrid,
  demoActions,
  getDemoCellKey,
  loadDemoPersistPreference,
  getSnapshotJson,
  loadDemoPersistedState,
  resetDemoPersistedState,
  saveDemoPersistPreference,
  saveDemoPersistedState,
  sumAxisCells,
  type DemoCell,
  type DemoGrid,
} from "./tiny-example.js";

type MutationHandler = (message: string) => void;

function formatNumber(value: number | undefined) {
  return value === undefined ? "—" : String(value);
}

function buildLogEntry(message: string) {
  return `${new Date().toLocaleTimeString()} — ${message}`;
}

function readCellNumber(currentCell: DemoCell) {
  return currentCell.value;
}

function HeaderCell(props: { currentGrid: DemoGrid; columnId: string }) {
  const { head } = useColumnHead(props.currentGrid, props.columnId);

  return (
    <th className="axis-header" scope="col">
      <div>{head.label}</div>
      <small>{head.id}</small>
    </th>
  );
}

function RowLabelCell(props: { currentGrid: DemoGrid; rowId: string }) {
  const { head } = useRowHead(props.currentGrid, props.rowId);

  return (
    <th className="axis-header" scope="row">
      <div>{head.label}</div>
      <small>{head.id}</small>
    </th>
  );
}

function NumberInputCell(props: {
  currentGrid: DemoGrid;
  rowId: string;
  columnId: string;
  onMutate: MutationHandler;
}) {
  const { currentGrid, rowId, columnId, onMutate } = props;

  if (!currentGrid.hasCell(rowId, columnId)) {
    return (
      <td>
        <button
          className="mini-button"
          onClick={() => {
            currentGrid.upsertCell({ rowId, columnId, value: 0 });
            onMutate(`Created missing cell ${createGridKey(rowId, columnId)}.`);
          }}
          type="button"
        >
          Add cell
        </button>
      </td>
    );
  }

  const [value, setValue] = useCell(currentGrid, rowId, columnId);

  return (
    <td>
      <input
        className="number-input"
        onChange={(event) => {
          const parsedValue = Number(event.target.value);
          const nextValue = Number.isFinite(parsedValue) ? parsedValue : 0;

          setValue({
            ...value,
            value: nextValue,
          });
          onMutate(`Set ${createGridKey(rowId, columnId)} to ${nextValue}.`);
        }}
        type="number"
        value={readCellNumber(value)}
      />
    </td>
  );
}

function RowTotalCell(props: { currentGrid: DemoGrid; rowId: string }) {
  const total = useRowTail(props.currentGrid, props.rowId, sumAxisCells);

  return <td className="total-cell">{formatNumber(total)}</td>;
}

function ColumnTotalCell(props: { currentGrid: DemoGrid; columnId: string }) {
  const total = useColumnTail(props.currentGrid, props.columnId, sumAxisCells);

  return <td className="total-cell">{formatNumber(total)}</td>;
}

export function TinyExampleApp() {
  const initialPersistEnabled = useRef(loadDemoPersistPreference());
  const [currentGrid, setCurrentGrid] = useState(() =>
    createDemoGrid({
      state: createDemoState(),
    }),
  );
  const [isPersistEnabled, setIsPersistEnabled] = useState(initialPersistEnabled.current);
  const [persistStatus, setPersistStatus] = useState<
    "disabled" | "idle" | "loading" | "ready" | "empty"
  >(initialPersistEnabled.current ? "loading" : "disabled");
  const [activityLog, setActivityLog] = useState<string[]>([
    buildLogEntry("Ready. Try the buttons or edit cells directly."),
  ]);
  const rows = currentGrid.rowHeaders;
  const cols = currentGrid.colHeaders;

  const recordMutation = (message: string) => {
    setActivityLog((previousLog) =>
      [buildLogEntry(message), ...previousLog].slice(0, 10),
    );
  };

  const replaceGrid = async (options: {
    persistEnabled: boolean;
    usePersistedState?: boolean;
    resetStore?: boolean;
  }) => {
    const {
      persistEnabled,
      usePersistedState = persistEnabled,
      resetStore = false,
    } = options;

    setPersistStatus(persistEnabled ? "loading" : "disabled");

    if (resetStore) {
      await resetDemoPersistedState();
    }

    const persistedState = usePersistedState ? await loadDemoPersistedState() : null;
    const nextState = persistedState ?? createDemoState();

    setCurrentGrid(
      createDemoGrid({
        persistEnabled,
        state: nextState,
      }),
    );
    setPersistStatus(persistEnabled ? (persistedState ? "ready" : "empty") : "disabled");

    return persistedState;
  };

  useEffect(() => {
    if (!initialPersistEnabled.current) {
      return;
    }

    void replaceGrid({
      persistEnabled: true,
    }).then((persistedState) => {
      recordMutation(
        persistedState
          ? "Persistence restored the saved snapshot after refresh."
          : "Persistence is enabled, but no saved snapshot was found yet.",
      );
    });
  }, []);

  const grandTotal = rows.reduce((total, rowId) => {
    return total + (currentGrid.getRowTail<number>(rowId) ?? 0);
  }, 0);

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">zubin-grid playground</p>
          <h1>Tiny React UI example</h1>
          <p className="hero-copy">
            Every button below pokes a different part of the API. The demo state is plain
            JSON, the cells are editable, and persistence can be toggled on with the
            package&apos;s default storage adapter.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{rows.length}</strong>
            <span>rows</span>
          </div>
          <div>
            <strong>{cols.length}</strong>
            <span>columns</span>
          </div>
          <div>
            <strong>{grandTotal}</strong>
            <span>grand total</span>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Button-per-test controls</h2>
          <div className="persist-controls">
            <label className="toggle-chip">
              <input
                checked={isPersistEnabled}
                onChange={async (event) => {
                  const nextPersistEnabled = event.target.checked;

                  setIsPersistEnabled(nextPersistEnabled);
                  saveDemoPersistPreference(nextPersistEnabled);

                  const persistedState = await replaceGrid({
                    persistEnabled: nextPersistEnabled,
                  });

                  recordMutation(
                    nextPersistEnabled
                      ? persistedState
                        ? "Persistence enabled. Loaded saved snapshot from the default adapter."
                        : "Persistence enabled. No saved snapshot yet, so defaults are loaded."
                      : "Persistence disabled. The demo is now in-memory only.",
                  );
                }}
                type="checkbox"
              />
              <span>Persist with default adapter</span>
            </label>

            <button
              className="secondary-button"
              onClick={async () => {
                const defaultState = createDemoState();

                if (isPersistEnabled) {
                  await saveDemoPersistedState(defaultState);
                  setPersistStatus("ready");
                }

                setCurrentGrid(
                  createDemoGrid({
                    persistEnabled: isPersistEnabled,
                    state: defaultState,
                  }),
                );
                setActivityLog([
                  buildLogEntry("Reset current grid to the default JSON state."),
                ]);
              }}
              type="button"
            >
              Reset current grid
            </button>

            <button
              className="secondary-button"
              onClick={async () => {
                await replaceGrid({
                  persistEnabled: isPersistEnabled,
                  usePersistedState: false,
                  resetStore: true,
                });
                recordMutation(
                  "Cleared the persisted snapshot and reset the current grid.",
                );
              }}
              type="button"
            >
              Reset persisted store
            </button>
          </div>
        </div>

        <div className="button-grid">
          {demoActions.map((action) => (
            <button
              className="action-button"
              key={action.id}
              onClick={() => {
                recordMutation(action.run(currentGrid));
              }}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="meta-grid">
          <div>
            <span className="meta-label">Rows</span>
            <code>{rows.join(" → ")}</code>
          </div>
          <div>
            <span className="meta-label">Columns</span>
            <code>{cols.join(" → ")}</code>
          </div>
          <div>
            <span className="meta-label">Example key</span>
            <code>{getDemoCellKey()}</code>
          </div>
          <div>
            <span className="meta-label">Persistence</span>
            <code>{isPersistEnabled ? `enabled (${persistStatus})` : "disabled"}</code>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Live grid</h2>
          <p>Typing into an input updates the grid store and all derived totals.</p>
        </div>

        <div className="table-wrap">
          <table className="demo-table">
            <thead>
              <tr>
                <th className="corner-cell">Item</th>
                {cols.map((columnId) => (
                  <HeaderCell
                    columnId={columnId}
                    currentGrid={currentGrid}
                    key={columnId}
                  />
                ))}
                <th className="corner-cell">Row total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rowId) => (
                <tr key={rowId}>
                  <RowLabelCell currentGrid={currentGrid} rowId={rowId} />
                  {cols.map((columnId) => (
                    <NumberInputCell
                      columnId={columnId}
                      currentGrid={currentGrid}
                      key={createGridKey(rowId, columnId)}
                      onMutate={recordMutation}
                      rowId={rowId}
                    />
                  ))}
                  <RowTotalCell currentGrid={currentGrid} rowId={rowId} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="corner-cell">Column totals</th>
                {cols.map((columnId) => (
                  <ColumnTotalCell
                    columnId={columnId}
                    currentGrid={currentGrid}
                    key={columnId}
                  />
                ))}
                <td className="total-cell total-strong">{grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="panel two-up">
        <div>
          <div className="panel-header">
            <h2>Recent activity</h2>
            <p>Latest actions and edits, newest first.</p>
          </div>
          <ol className="activity-log">
            {activityLog.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ol>
        </div>

        <div>
          <div className="panel-header">
            <h2>Snapshot</h2>
            <p>
              Current value of <code>grid.getState()</code>.
            </p>
          </div>
          <pre className="snapshot-panel">{getSnapshotJson(currentGrid)}</pre>
        </div>
      </section>
    </div>
  );
}
