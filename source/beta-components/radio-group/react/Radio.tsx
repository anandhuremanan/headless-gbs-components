"use client";

import {
  use,
  useId,
  useImperativeHandle,
  useRef,
  type ChangeEvent,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { describeField } from "../../shared/core/field";
import type { RadioSize } from "../core/types";
import { RadioGroupContext } from "./context";
import { cx, type RadioSlot } from "./props";

export interface RadioProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "size" | "checked" | "defaultChecked" | "onChange"
  > {
  /** The value this choice contributes to its group. */
  value: string;
  /** Selected (controlled). Inside a RadioGroup the group decides instead. */
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?(checked: boolean): void;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  size?: RadioSize;
  classNames?: Partial<Record<RadioSlot, string>>;
  /** The `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * One choice, as a native radio. Inside a `RadioGroup` the group owns the
 * value; on its own it behaves like any other radio sharing a `name`.
 *
 * Nothing here manages focus: radios that share a `name` already roam with the
 * arrow keys, skip the disabled ones, wrap around and leave one tab stop for
 * the whole group — in every browser, and without JavaScript.
 */
export function Radio(props: RadioProps) {
  const {
    ref,
    value,
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    label,
    description,
    error,
    size,
    className,
    classNames,
    style,
    id: idProp,
    disabled,
    required,
    name,
    "aria-describedby": describedByProp,
    ...inputProps
  } = props;

  const group = use(RadioGroupContext);
  const reactId = useId();
  const id = idProp ?? reactId;
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const [own, setOwn] = useControllableState(checkedProp, defaultChecked);
  const checked = group !== null ? group.value === value : own;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (group !== null) group.select(value);
    else setOwn(event.target.checked);
    onChange?.(event);
    onCheckedChange?.(event.target.checked);
  };

  const isDisabled = disabled ?? group?.disabled;
  const invalid = Boolean(error) || (group?.invalid ?? false);
  const describedBy = describeField(id, { extra: describedByProp, description, error });

  return (
    <div
      className={cx("rd-root", classNames?.root, className)}
      style={style}
      data-size={size ?? group?.size ?? "md"}
      data-variant={group?.variant ?? "default"}
      data-checked={checked || undefined}
      data-disabled={isDisabled || undefined}
      data-invalid={invalid ? "" : undefined}
    >
      <span className={cx("rd-control", classNames?.control)}>
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type="radio"
          className={cx("rd-input", classNames?.input)}
          checked={checked}
          value={value}
          name={name ?? group?.name}
          disabled={isDisabled}
          // Every radio in a group carries `required`, which is how a browser
          // validates the group as a whole rather than one button in it.
          required={required ?? group?.required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
        />
        <span className="rd-dot" aria-hidden="true" />
      </span>

      {(label || description || error) && (
        <span className="rd-text">
          {label && (
            <label htmlFor={id} className={cx("rd-label", classNames?.label)}>
              {label}
            </label>
          )}
          {description && (
            <span id={`${id}-description`} className={cx("rd-description", classNames?.description)}>
              {description}
            </span>
          )}
          {error && (
            <span id={`${id}-error`} className={cx("rd-error", classNames?.error)} role="alert">
              {error}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
