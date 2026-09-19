/**
 * The state of a switch whose change has to be saved somewhere.
 *
 * A switch is usually the whole interaction: there is no form to submit
 * afterwards, so flipping it *is* the request. That leaves three things to
 * agree on, and they are worth keeping out of the component and under test.
 *
 * The switch moves as soon as it is pressed, rather than waiting for the
 * server, because a control that ignores a press feels broken. If the save
 * fails it goes back to where it was — to `fallback`, the value from before the
 * press, not simply the opposite of what is on screen, since the two differ
 * once anything else has changed the value in the meantime.
 *
 * And a request that is overtaken is ignored: `settle` only accepts an outcome
 * for the change still in flight (`pending`), so a late failure from an
 * abandoned request cannot drag a newer value back with it.
 */

export interface ToggleState {
  /** What the switch shows now. */
  checked: boolean;
  /** The change being saved, or null when nothing is in flight. */
  pending: boolean | null;
  /** What to go back to if the save fails. */
  fallback: boolean;
}

export const idleToggle = (checked: boolean): ToggleState => ({
  checked,
  pending: null,
  fallback: checked,
});

/** Shows `next` at once and remembers where to return to. */
export function request(state: ToggleState, next: boolean): ToggleState {
  if (next === state.checked && state.pending === null) return state;
  return { checked: next, pending: next, fallback: state.pending === null ? state.checked : state.fallback };
}

/**
 * Applies the outcome of the change that is in flight. An outcome for anything
 * else — a request that was already overtaken — leaves the state alone.
 */
export function settle(state: ToggleState, requested: boolean, saved: boolean): ToggleState {
  if (state.pending === null || state.pending !== requested) return state;
  const checked = saved ? state.checked : state.fallback;
  return { checked, pending: null, fallback: checked };
}

/** A value arriving from a controlled prop wins, and ends anything in flight. */
export function adopt(state: ToggleState, checked: boolean): ToggleState {
  if (checked === state.checked && state.pending === null) return state;
  return idleToggle(checked);
}
