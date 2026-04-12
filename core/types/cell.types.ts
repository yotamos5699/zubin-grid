export type Subscriber = () => void;

export type CellInitializer<TCell> = () => TCell | Promise<TCell>;

export type Updater<TValue> = TValue | ((currentValue: TValue) => TValue);

export interface Cell<TCell> {
  get: () => TCell;
  set: (newValue: TCell) => void;
  subscribe: (callback: Subscriber) => () => void;
  _subscribers: () => number;
}
