"use client";

import { useCallback, useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { describeField } from "../../shared/core/field";
import { hasEnabledOption, normalizeOptions, resolveValue } from "../core/group";
import type {
  RadioGroupLocaleText,
  RadioOption,
  RadioOrientation,
  RadioSize,
  RadioVariant,
} from "../core/types";
import { Radio } from "./Radio";
import { RadioGroupContext, type RadioGroupContextValue } from "./context";
import { defaultRadioGroupText } from "./locale";
import { cx, type RadioGroupSlot } from "./props";

export interface RadioGroupProps {
  /** The chosen value (controlled). `null` for nothing chosen. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?(value: string | null): void;
  /** Render these choices, or pass `<Radio value="…">` children. Plain strings work too. */
  options?: readonly (string | RadioOption)[];
  children?: ReactNode;
  /** The question the choices answer, shown as the group's legend. */
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Form field name shared by every radio. One is generated when it is left out. */
  name?: string;
  size?: RadioSize;
  /** Default `vertical`. */
  orientation?: RadioOrientation;
  /** Default `default`. `card` draws each choice as a tile. */
  variant?: RadioVariant;
  /**
   * Offer a button that empties the group. Radios cannot be unselected by
   * clicking or by keyboard — that is the control's nature, not an oversight —
   * so an optional choice needs either this or a "None" option of its own.
   */
  clearable?: boolean;
  id?: string;
  className?: string;
  classNames?: Partial<Record<RadioGroupSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<RadioGroupLocaleText>;
}

/** A labelled set of radios sharing one value. */
export function RadioGroup(props: RadioGroupProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    options,
    children,
    label,
    description,
    error,
    required = false,
    disabled = false,
    name: nameProp,
    size,
    orientation = "vertical",
    variant = "default",
    clearable = false,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  // Radios are grouped by their name, so one is needed whether or not the
  // group posts with a form: without it, two groups on a page share arrows.
  const name = nameProp ?? `${id}-radio`;
  const text = useMemo(() => ({ ...defaultRadioGroupText, ...localeText }), [localeText]);
  const [current, setCurrent] = useControllableState<string | null>(value, defaultValue ?? null);

  const items = useMemo(() => (options ? normalizeOptions(options) : null), [options]);
  // With children rather than options there is nothing to check the value
  // against, so it is taken as given.
  const selected = items ? resolveValue(items, current) : (current ?? null);

  const commit = useCallback(
    (next: string | null) => {
      setCurrent(next);
      onValueChange?.(next);
    },
    [setCurrent, onValueChange],
  );

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      value: selected,
      select: commit,
      name,
      disabled,
      required,
      invalid: Boolean(error),
      size,
      variant,
    }),
    [selected, commit, name, disabled, required, error, size, variant],
  );

  const showClear = clearable && selected !== null && hasEnabledOption(items ?? [], disabled);
  const describedBy = describeField(id, { description, error });

  return (
    <fieldset
      id={id}
      className={cx("rd-group", classNames?.root, className)}
      style={style}
      // A disabled fieldset disables every control inside it natively.
      disabled={disabled}
      // A fieldset is a plain group by default, which is right for checkboxes
      // and wrong here: a set of radios is one control with one value, and
      // screen readers say so and count the choices ("2 of 3") only for
      // radiogroup. The legend is repeated as the name, because overriding the
      // role is not guaranteed to carry a fieldset's own naming with it.
      role="radiogroup"
      aria-labelledby={label ? `${id}-legend` : undefined}
      aria-describedby={describedBy}
      data-orientation={orientation}
      data-variant={variant}
      data-invalid={error ? "" : undefined}
    >
      {label && (
        <legend id={`${id}-legend`} className={cx("rd-legend", classNames?.legend)} data-required={required || undefined}>
          {label}
        </legend>
      )}
      {description && (
        <span id={`${id}-description`} className={cx("rd-description", classNames?.description)}>
          {description}
        </span>
      )}

      <RadioGroupContext value={context}>
        <div className={cx("rd-items", classNames?.items)}>
          {items
            ? items.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  description={option.description}
                  disabled={option.disabled}
                />
              ))
            : children}
        </div>
      </RadioGroupContext>

      {showClear && (
        <button
          type="button"
          className={cx("rd-clear", classNames?.clear)}
          onClick={() => commit(null)}
        >
          {text.clear}
        </button>
      )}

      {error && (
        <span id={`${id}-error`} className={cx("rd-error", classNames?.error)} role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}
