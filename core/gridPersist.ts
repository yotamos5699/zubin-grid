import type {
  GridPersistAdapter,
  GridPersistControllerOptions,
  GridPersistOption,
  ResolvedGridPersistConfig,
} from "./gridPersist.types.js";

export type { GridPersistAdapter, GridPersistOption } from "./gridPersist.types.js";

const GRID_PERSIST_DB_NAME = "zubin-grid";
const GRID_PERSIST_STORE_NAME = "grid-state";

const gridPersistRuntimeCache = new Map<string, unknown | null>();
const gridPersistPendingReads = new Map<string, Promise<unknown | null>>();
const gridPersistMemoryFallback = new Map<string, unknown>();

let gridPersistDatabasePromise: Promise<IDBDatabase | null> | null = null;

export const defaultGridPersistAdapter: GridPersistAdapter<any> = {
  async get(storageKey) {
    if (gridPersistMemoryFallback.has(storageKey)) {
      return gridPersistMemoryFallback.get(storageKey) ?? null;
    }

    const database = await openGridPersistDatabase();

    if (!database) {
      return null;
    }

    return (
      (await withGridPersistStore(database, "readonly", (store) =>
        store.get(storageKey),
      )) ?? null
    );
  },
  async set(storageKey, value) {
    gridPersistMemoryFallback.set(storageKey, value);

    const database = await openGridPersistDatabase();

    if (!database) {
      return;
    }

    await withGridPersistStore(database, "readwrite", (store) =>
      store.put(value, storageKey),
    );
  },
  async remove(storageKey) {
    gridPersistMemoryFallback.delete(storageKey);
    gridPersistRuntimeCache.delete(storageKey);

    const database = await openGridPersistDatabase();

    if (!database) {
      return;
    }

    await withGridPersistStore(database, "readwrite", (store) =>
      store.delete(storageKey),
    );
  },
};

export function createGridPersistController<TState>(
  persist: GridPersistOption<TState> | undefined,
  options: GridPersistControllerOptions<TState>,
) {
  const config = resolvePersistConfig(persist);
  let stateVersion = 0;
  let persistWriteQueued = false;
  let pendingPersistState: TState | null = null;

  const queuePersistWrite = () => {
    if (!config || options.isApplyingState()) {
      return;
    }

    pendingPersistState = options.getState();
    gridPersistRuntimeCache.set(config.storageKey, pendingPersistState);

    if (persistWriteQueued) {
      return;
    }

    persistWriteQueued = true;

    scheduleGridPersistTask(() => {
      persistWriteQueued = false;

      const snapshot = pendingPersistState;

      pendingPersistState = null;

      if (snapshot === null) {
        return;
      }

      void Promise.resolve(config.adapter.set(config.storageKey, snapshot)).catch(
        () => undefined,
      );
    });
  };

  return {
    hydrate() {
      if (!config) {
        return;
      }

      const persistedState = loadPersistedState(config.storageKey, config.adapter);

      if (!isPromiseLike<TState | null>(persistedState)) {
        if (persistedState === null) {
          return;
        }

        options.replaceState(persistedState);
        return;
      }

      const hydrationVersion = stateVersion;

      void persistedState.then((nextState) => {
        if (nextState === null || stateVersion !== hydrationVersion) {
          return;
        }

        options.replaceState(nextState);
      });
    },
    markStateChanged() {
      stateVersion += 1;
      queuePersistWrite();
    },
  };
}

function resolvePersistConfig<TState>(
  persist?: GridPersistOption<TState>,
): ResolvedGridPersistConfig<TState> | null {
  if (!persist) {
    return null;
  }

  const [storageKey, adapter] = persist;

  return {
    storageKey,
    adapter: (adapter ?? defaultGridPersistAdapter) as GridPersistAdapter<TState>,
  };
}

function loadPersistedState<TState>(
  storageKey: string,
  adapter: GridPersistAdapter<TState>,
): TState | null | Promise<TState | null> {
  if (gridPersistRuntimeCache.has(storageKey)) {
    return (gridPersistRuntimeCache.get(storageKey) as TState | null) ?? null;
  }

  const pendingRead = gridPersistPendingReads.get(storageKey);

  if (pendingRead) {
    return pendingRead as Promise<TState | null>;
  }

  let nextState: TState | null | Promise<TState | null>;

  try {
    nextState = adapter.get(storageKey);
  } catch {
    return null;
  }

  if (!isPromiseLike<TState | null>(nextState)) {
    const resolvedState = nextState ?? null;

    gridPersistRuntimeCache.set(storageKey, resolvedState);

    return resolvedState;
  }

  const pendingState = nextState
    .then((resolvedState) => {
      const nextResolvedState = resolvedState ?? null;

      gridPersistRuntimeCache.set(storageKey, nextResolvedState);
      gridPersistPendingReads.delete(storageKey);

      return nextResolvedState;
    })
    .catch(() => {
      gridPersistPendingReads.delete(storageKey);
      return null;
    });

  gridPersistPendingReads.set(storageKey, pendingState);

  return pendingState;
}

function scheduleGridPersistTask(task: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(task);
    return;
  }

  void Promise.resolve().then(task);
}

function isPromiseLike<TValue>(value: unknown): value is PromiseLike<TValue> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof (value as PromiseLike<TValue>).then === "function"
  );
}

function openGridPersistDatabase() {
  if (gridPersistDatabasePromise) {
    return gridPersistDatabasePromise;
  }

  if (typeof indexedDB === "undefined") {
    gridPersistDatabasePromise = Promise.resolve(null);
    return gridPersistDatabasePromise;
  }

  gridPersistDatabasePromise = new Promise((resolve) => {
    const request = indexedDB.open(GRID_PERSIST_DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(GRID_PERSIST_STORE_NAME)) {
        request.result.createObjectStore(GRID_PERSIST_STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      resolve(null);
    };
    request.onblocked = () => {
      resolve(null);
    };
  });

  return gridPersistDatabasePromise;
}

function withGridPersistStore<TResult>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<TResult>,
) {
  return new Promise<TResult>((resolve, reject) => {
    const transaction = database.transaction(GRID_PERSIST_STORE_NAME, mode);
    const store = transaction.objectStore(GRID_PERSIST_STORE_NAME);
    let result: TResult | undefined;
    let hasResult = false;
    let request: IDBRequest<TResult>;

    try {
      request = createRequest(store);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    request.onsuccess = () => {
      result = request.result;
      hasResult = true;
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Unable to access persisted grid state."));
    };
    transaction.oncomplete = () => {
      if (!hasResult) {
        reject(new Error("Unable to access persisted grid state."));
        return;
      }

      resolve(result as TResult);
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("Unable to access persisted grid state."));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("Unable to access persisted grid state."));
    };
  });
}
