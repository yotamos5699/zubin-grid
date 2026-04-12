import type { Updater } from "./cell.types.js";

export interface GridHead<TId extends string = string> {
  id: TId;
  label: string;
  order: number;
}

export type GridHeadObject<TId extends string = string> = {
  id: TId;
  label: string;
  order?: number;
};

export type GridHeadInput<TId extends string = string> = TId | GridHeadObject<TId>;

export type GridHeadId<THeadInput extends GridHeadInput> = THeadInput extends string
  ? THeadInput
  : THeadInput extends GridHeadObject<infer TId>
    ? TId
    : never;

export type NormalizedGridHead<THeadInput extends GridHeadInput> =
  THeadInput extends string
    ? GridHead<THeadInput>
    : THeadInput extends GridHeadObject<infer TId>
      ? Omit<THeadInput, "order"> & GridHead<TId>
      : never;

export type ResolvedGridHead<THeadInput extends GridHeadInput> =
  NormalizedGridHead<THeadInput> & GridHead<GridHeadId<THeadInput>>;

export interface GridHeadHookResult<THead extends GridHead<string>> {
  head: THead;
  setHead: (nextHead: Updater<THead>) => void;
  updateLabel: (label: string) => void;
  updateOrder: (order: number) => void;
}
