"use client";

import {
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { describeField } from "../../shared/core/field";
import { adopt, idleToggle, request, settle } from "../core/toggle";
import type { SwitchLabelPosition, SwitchLocaleText, SwitchSize } from "../core/types";
import { defaultSwitchText } from "./locale";
import { cx, type SwitchSlot } from "./props";

export interface SwitchProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "size" | "checked" | "defaultChecked" | "onChange" | "role"
  > {
  /** On or off (controlled). */
  checked?: boolean;
  defaultChecked?: boolean;
  /**
   * Fires with the new state. Return a promise and the switch stays on the new
   * setting with a busy indicator until it resolves, then puts itself back if
   * it rejects — see [Saving](#saving).
   */
  onCheckedChange?(checked: boolean): void | Promise<unknown>;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Posted with the form when the switch is on. Default `"on"`, as for a checkbox. */
  value?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  size?: SwitchSize;
  /** Default `end`: the label after the track. `start` puts the track on the right, for settings rows. */
  labelPosition?: SwitchLabelPosition;
  /** Show the busy state and block presses from outside, e.g. while a form saves. */
  loading?: boolean;
  classNames?: Partial<Record<SwitchSlot, string>>;
  localeText?: Partial<SwitchLocaleText>;
  /** The `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A native checkbox with `role="switch"`, styled as a track and thumb. It posts
 * with forms, works with form libraries, and is announced as "on"/"off" rather
 * than "checked", which is what a setting that takes effect immediately should
 * say.
 */
export function Switch(props: SwitchProps) {
  const {
    ref,
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    onKeyDown,
    value,
    label,
    description,
    error,
    size = "md",
    labelPosition = "end",
    loading = false,
    className,
    classNames,
    style,
    localeText,
    id: idProp,
    disabled,
    readOnly,
    required,
    name,
    "aria-describedby": describedByProp,
    ...inputProps
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultSwitchText, ...localeText }), [localeText]);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const [state, setState] = useState(() => idleToggle(checkedProp ?? defaultChecked));
  const controlled = checkedProp !== undefined;

  // A controlled value is the truth, and a new one ends anything still in
  // flight. Adjusted while rendering rather than in an effect, so the switch
  // never paints the old setting for a frame first.
  const [seen, setSeen] = useState(checkedProp);
  if (checkedProp !== seen) {
    setSeen(checkedProp);
    if (checkedProp !== undefined) setState((current) => adopt(current, checkedProp));
  }

  // Between changes the prop wins outright, so a parent that declines a change
  // — by not updating the value it passed — puts the switch back by itself.
  const checked = controlled && state.pending === null ? checkedProp : state.checked;
  const saving = state.pending !== null || loading;
  const locked = Boolean(disabled) || readOnly === true || saving;

  const change = useCallback(
    (next: boolean) => {
      const result = onCheckedChange?.(next);
      // Only a thenable turns the switch busy; a plain handler is done already.
      if (typeof (result as Promise<unknown> | undefined)?.then !== "function") {
        setState((current) => settle(request(current, next), next, true));
        return;
      }
      setState((current) => request(current, next));
      void (result as Promise<unknown>).then(
        () => setState((current) => settle(current, next, true)),
        () => setState((current) => settle(current, next, false)),
      );
    },
    [onCheckedChange],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (locked) {
      // readOnly does nothing on a checkbox, so the change has to be undone.
      event.preventDefault();
      event.target.checked = checked;
      return;
    }
    onChange?.(event);
    change(event.target.checked);
  };

  // The ARIA switch pattern: the arrows set a side rather than toggling.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || locked) return;
    const rtl = event.currentTarget.matches(":dir(rtl)");
    const on = rtl ? "ArrowLeft" : "ArrowRight";
    const off = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key !== on && event.key !== off) return;
    event.preventDefault();
    const next = event.key === on;
    if (next !== checked) change(next);
  };

  const invalid = Boolean(error);
  const describedBy = describeField(id, { extra: describedByProp, description, error });

  return (
    <div
      className={cx("sw-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-label-position={labelPosition}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-saving={saving || undefined}
      data-invalid={invalid ? "" : undefined}
    >
      <span className={cx("sw-control", classNames?.control)}>
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type="checkbox"
          role="switch"
          className={cx("sw-input", classNames?.input)}
          checked={checked}
          value={value}
          name={name}
          disabled={disabled}
          required={required}
          aria-readonly={readOnly || undefined}
          aria-busy={saving || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <span className={cx("sw-track", classNames?.track)} aria-hidden="true">
          <span className={cx("sw-thumb", classNames?.thumb)} />
        </span>
      </span>

      {(label || description || error) && (
        <span className="sw-text">
          {label && (
            <label htmlFor={id} className={cx("sw-label", classNames?.label)} data-required={required || undefined}>
              {label}
            </label>
          )}
          {description && (
            <span id={`${id}-description`} className={cx("sw-description", classNames?.description)}>
              {description}
            </span>
          )}
          {error && (
            <span id={`${id}-error`} className={cx("sw-error", classNames?.error)} role="alert">
              {error}
            </span>
          )}
        </span>
      )}

      {/* Only the fact that something is being saved needs announcing; the
          switch already reads its own new state. */}
      <span className="sw-sr-only" role="status">
        {saving ? text.saving : ""}
      </span>
    </div>
  );
}
