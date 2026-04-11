export interface GridPersistAdapter<TState = unknown> {
  get: (storageKey: string) => TState | null | Promise<TState | null>;
  set: (storageKey: string, value: TState) => void | Promise<void>;
  remove: (storageKey: string) => void | Promise<void>;
}

export type GridPersistOption<TState = unknown> = readonly [
  storageKey: string,
  adapter?: GridPersistAdapter<TState>,
];

export interface GridPersistControllerOptions<TState> {
  getState: () => TState;
  replaceState: (state: TState) => void;
  isApplyingState: () => boolean;
}

export interface ResolvedGridPersistConfig<TState> {
  storageKey: string;
  adapter: GridPersistAdapter<TState>;
}
