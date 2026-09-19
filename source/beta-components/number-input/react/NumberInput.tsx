"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { describeField } from "../../shared/core/field";
import { formatNumber } from "../core/format";
import { parseNumber, toEditText } from "../core/parse";
import { clamp, round, snapToStep, stepBy } from "../core/step";
import type {
  ClampBehavior,
  NumberInputLocaleText,
  NumberSize,
  NumberStyle,
} from "../core/types";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "./icons";
import { defaultNumberInputText } from "./locale";
import { cx, type NumberInputSlot } from "./props";

/** Press and hold: the wait before repeating, then the gap between repeats. */
const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 60;

export interface NumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "size" | "type" | "value" | "defaultValue" | "onChange" | "step" | "min" | "max" | "role"
  > {
  /** The number, or `null` for an empty field (controlled). */
  value?: number | null;
  defaultValue?: number | null;
  /** Fires with the parsed number, or `null` when the field is emptied. */
  onValueChange?(value: number | null): void;
  min?: number;
  max?: number;
  /** How much one arrow press or stepper button moves. Default 1. */
  step?: number;
  /** Step with **Page Up** / **Page Down**. Default ten steps. */
  largeStep?: number;
  /** Round every committed value onto the step grid, counting from `min`. */
  snapToStep?: boolean;
  /** Fraction digits to show, and to round to. Left out, the number is shown as it is. */
  decimals?: number;
  /** BCP 47 tag deciding the separators and digits, for both reading and showing. */
  locale?: string;
  /** Default `decimal`. `percent` shows 0.45 as 45%, as `Intl` does. */
  format?: NumberStyle;
  /** ISO 4217 code, for `format="currency"`. */
  currency?: string;
  /** Thousands separators while the field is not being edited. Default true. */
  useGrouping?: boolean;
  /** When a value outside the limits is pulled back. Default `blur`. */
  clampBehavior?: ClampBehavior;
  /** The up and down buttons. Default true. */
  stepper?: boolean;
  /**
   * Let the wheel change the value while the field has focus. Default **false**:
   * a wheel that edits a focused field turns an ordinary page scroll into a
   * silent change to someone's data.
   */
  wheel?: boolean;
  /** Select the whole number when the field is focused, so typing replaces it. */
  selectOnFocus?: boolean;
  /** A button that empties the field. */
  clearable?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  size?: NumberSize;
  /** Before the number: a currency symbol, a unit. */
  leading?: ReactNode;
  /** After the number: a unit, a suffix. */
  trailing?: ReactNode;
  classNames?: Partial<Record<NumberInputSlot, string>>;
  localeText?: Partial<NumberInputLocaleText>;
  /** The `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A numeric field that reads and writes numbers the way the locale does.
 *
 * It is a text input with `role="spinbutton"`, not `<input type="number">`,
 * which buys three things that control cannot give: the wheel never edits it by
 * accident, what was typed is still readable when it is not yet a number, and
 * `1.234,56` means the same to it as `1,234.56` does to someone else.
 */
export function NumberInput(props: NumberInputProps) {
  const {
    ref,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    min,
    max,
    step = 1,
    largeStep = step * 10,
    snapToStep: snap = false,
    decimals,
    locale,
    format = "decimal",
    currency,
    useGrouping = true,
    clampBehavior = "blur",
    stepper = true,
    wheel = false,
    selectOnFocus = false,
    clearable = false,
    label,
    description,
    error,
    size = "md",
    leading,
    trailing,
    className,
    classNames,
    style,
    localeText,
    id: idProp,
    disabled,
    readOnly,
    required,
    placeholder,
    onFocus,
    onBlur,
    onKeyDown,
    "aria-describedby": describedByProp,
    ...inputProps
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultNumberInputText, ...localeText }), [localeText]);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const controlled = valueProp !== undefined;
  const [own, setOwn] = useState<number | null>(defaultValue);
  const value = controlled ? valueProp : own;

  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const formatOptions = useMemo(
    () => ({ locale, style: format, currency, decimals, useGrouping }),
    [locale, format, currency, decimals, useGrouping],
  );

  // Formatted at rest, plain while being edited: separators inserted under the
  // caret are the reason typing in a "smart" number field feels wrong.
  const shown =
    draft ?? (focused ? toEditText(value, locale) : formatNumber(value, formatOptions));

  const commit = useCallback(
    (next: number | null) => {
      if (!controlled) setOwn(next);
      if (next !== value) onValueChange?.(next);
    },
    [controlled, value, onValueChange],
  );

  /** Rounds, snaps and clamps a raw number into what the field will hold. */
  const settle = useCallback(
    (raw: number): number => {
      let next = decimals === undefined ? raw : round(raw, decimals);
      if (snap) next = snapToStep(next, { step, min, max });
      if (clampBehavior !== "none") next = clamp(next, min, max);
      return next;
    },
    [decimals, snap, step, min, max, clampBehavior],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value;
    setDraft(typed);
    const parsed = parseNumber(typed, locale);
    if (parsed === null) {
      // An empty field is a value; anything else unreadable is a half-typed
      // number, and the last good one stands until it is finished or left.
      if (typed.trim() === "") commit(null);
      return;
    }
    commit(clampBehavior === "strict" ? clamp(parsed, min, max) : parsed);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setDraft(null);
    onFocus?.(event);
    if (selectOnFocus) event.target.select();
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    const typed = draft;
    setDraft(null);
    onBlur?.(event);
    if (typed === null) return;
    if (typed.trim() === "") {
      commit(null);
      return;
    }
    const parsed = parseNumber(typed, locale);
    // Something unreadable falls back to the last number the field held, rather
    // than being thrown away: leaving a field should never destroy a value.
    if (parsed !== null) commit(settle(parsed));
  };

  const applyStep = useCallback(
    (direction: 1 | -1, amount = step) => {
      if (disabled || readOnly) return;
      const from = draft === null ? value : (parseNumber(draft, locale) ?? value);
      const next = stepBy(from, direction, { step: amount, min, max });
      setDraft(null);
      commit(snap ? snapToStep(next, { step, min, max }) : next);
    },
    [disabled, readOnly, draft, value, locale, step, min, max, snap, commit],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        applyStep(1);
        break;
      case "ArrowDown":
        event.preventDefault();
        applyStep(-1);
        break;
      case "PageUp":
        event.preventDefault();
        applyStep(1, largeStep);
        break;
      case "PageDown":
        event.preventDefault();
        applyStep(-1, largeStep);
        break;
      case "Home":
        if (min === undefined) return;
        event.preventDefault();
        setDraft(null);
        commit(min);
        break;
      case "End":
        if (max === undefined) return;
        event.preventDefault();
        setDraft(null);
        commit(max);
        break;
      case "Escape":
        // Back to the committed number, leaving whatever was half-typed.
        if (draft === null) return;
        event.preventDefault();
        setDraft(null);
        break;
      default:
    }
  };

  // The wheel only ever reaches the value when the caller asked for it and the
  // field has focus, and the page is then held still so the two cannot both
  // happen at once.
  useEffect(() => {
    const element = inputRef.current;
    if (!element || !wheel) return;
    const onWheel = (event: globalThis.WheelEvent) => {
      if (document.activeElement !== element || event.deltaY === 0) return;
      event.preventDefault();
      applyStep(event.deltaY < 0 ? 1 : -1);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [wheel, applyStep]);

  // Press and hold a stepper button to repeat, as the native spinner does.
  // The repeat reads the step function through a ref: the timer is set up once
  // at the press, and calling the `applyStep` captured then would step from the
  // value as it was at the press, over and over, so the field would move once
  // and then sit still.
  const latestStep = useRef(applyStep);
  useEffect(() => {
    latestStep.current = applyStep;
  }, [applyStep]);

  const repeat = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopRepeat = useCallback(() => {
    clearTimeout(repeat.current);
    repeat.current = undefined;
  }, []);
  useEffect(() => stopRepeat, [stopRepeat]);

  const startRepeat = (event: PointerEvent<HTMLButtonElement>, direction: 1 | -1) => {
    // Left button only, and never on a touch long-press, which is a text
    // selection gesture rather than a request for a hundred more.
    if (event.button !== 0) return;
    event.preventDefault();
    inputRef.current?.focus();
    applyStep(direction);
    event.currentTarget.setPointerCapture(event.pointerId);
    const tick = () => {
      latestStep.current(direction);
      repeat.current = setTimeout(tick, REPEAT_INTERVAL);
    };
    repeat.current = setTimeout(tick, REPEAT_DELAY);
  };

  const invalid = Boolean(error);
  const atMin = value !== null && min !== undefined && value <= min;
  const atMax = value !== null && max !== undefined && value >= max;
  const describedBy = describeField(id, { extra: describedByProp, description, error });

  return (
    <div
      className={cx("nm-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={invalid ? "" : undefined}
    >
      {label && (
        <label htmlFor={id} className={cx("nm-label", classNames?.label)} data-required={required || undefined}>
          {label}
        </label>
      )}

      <div
        className={cx("nm-control", classNames?.control)}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-invalid={invalid ? "" : undefined}
        // A press on the padding or an adornment focuses the number, like a
        // native field. Buttons keep their own press.
        onMouseDown={(event) => {
          const target = event.target as Element;
          if (target === inputRef.current || target.closest("button") || disabled) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {leading && (
          <span className="nm-adornment" data-side="leading">
            {leading}
          </span>
        )}

        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          // Text, not number: see the note on the component.
          type="text"
          inputMode={min !== undefined && min >= 0 && decimals === 0 ? "numeric" : "decimal"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="spinbutton"
          className={cx("nm-input", classNames?.input)}
          value={shown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          // Read out as "1,234.56 US dollars" rather than as bare digits.
          aria-valuetext={value === null ? undefined : formatNumber(value, formatOptions)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />

        {clearable && shown !== "" && !disabled && !readOnly && (
          <button
            type="button"
            tabIndex={-1}
            className="nm-icon-button"
            aria-label={text.clear}
            title={text.clear}
            onClick={() => {
              setDraft(null);
              commit(null);
              inputRef.current?.focus();
            }}
          >
            <XIcon />
          </button>
        )}
        {trailing && (
          <span className="nm-adornment" data-side="trailing">
            {trailing}
          </span>
        )}

        {stepper && !readOnly && (
          <span className={cx("nm-stepper", classNames?.stepper)}>
            {/*
              Outside the tab order, like the native spinner's buttons: the
              keyboard has the arrow keys, and two extra tab stops per field
              would make a form of them painful to move through.
            */}
            <button
              type="button"
              tabIndex={-1}
              className="nm-step"
              data-direction="up"
              aria-label={text.increment}
              aria-controls={id}
              disabled={disabled || atMax}
              onPointerDown={(event) => startRepeat(event, 1)}
              onPointerUp={stopRepeat}
              onPointerCancel={stopRepeat}
              onLostPointerCapture={stopRepeat}
            >
              <ChevronUpIcon />
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="nm-step"
              data-direction="down"
              aria-label={text.decrement}
              aria-controls={id}
              disabled={disabled || atMin}
              onPointerDown={(event) => startRepeat(event, -1)}
              onPointerUp={stopRepeat}
              onPointerCancel={stopRepeat}
              onLostPointerCapture={stopRepeat}
            >
              <ChevronDownIcon />
            </button>
          </span>
        )}
      </div>

      {description && (
        <span id={`${id}-description`} className={cx("nm-description", classNames?.description)}>
          {description}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={cx("nm-error", classNames?.error)} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
