/**
 * @fileoverview Shared selection state type.
 * The map, sidebar, and detail panels all share this discriminated union.
 */

export type SelectionState =
  | { type: 'pasture'; id: string }
  | { type: 'infra'; id: string }
  | null;
