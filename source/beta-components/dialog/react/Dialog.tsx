"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type {
  DialogIntent,
  DialogKind,
  DialogLocaleText,
  PromptOptions,
} from "../core/types";
import { DangerIcon, InfoIcon, SpinnerIcon, SuccessIcon, WarningIcon } from "./icons";
import { defaultDialogText } from "./locale";
import { cx, type DialogSlot } from "./props";

/** Matches the CSS transition, so content stays mounted while the dialog animates out. */
const EXIT_DURATION = 200;

const INTENT_ICONS: Record<DialogIntent, ReactNode> = {
  default: null,
  info: <InfoIcon />,
  success: <SuccessIcon />,
  warning: <WarningIcon />,
  danger: <DangerIcon />,
};

export type DialogAction = "confirm" | "cancel";

export interface DialogProps extends Omit<PromptOptions, "onConfirm"> {
  open: boolean;
  /** `alert` has one button, `confirm` two, `prompt` adds a text field. Default `confirm`. */
  kind?: DialogKind;
  /**
   * Runs on Confirm, with the prompt's value. While its promise is pending the
   * buttons show progress; if it throws, the error message is shown and the
   * dialog stays open.
   */
  onConfirm?(value: string): void | Promise<void>;
  /** The user answered. Set `open` to false here. */
  onClose?(action: DialogAction, value: string): void;
  /** The exit animation finished. */
  onExited?(): void;
  id?: string;
  className?: string;
  classNames?: Partial<Record<DialogSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<DialogLocaleText>;
}

const outside = (event: MouseEvent<HTMLDialogElement>) => {
  if (event.target !== event.currentTarget) return false;
  const rect = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
};

/** An alert, confirm or prompt dialog. For the promise API, mount `<DialogHost />` and call `dialog.confirm()`. */
export function Dialog(props: DialogProps) {
  const {
    open,
    kind = "confirm",
    title,
    description,
    intent = "default",
    icon,
    confirmLabel,
    cancelLabel,
    dismissible = true,
    size = "sm",
    defaultValue = "",
    placeholder,
    inputLabel,
    inputType = "text",
    required = false,
    validate,
    onConfirm,
    onClose,
    onExited,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultDialogText, ...localeText }), [localeText]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOutside = useRef(false);

  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Reset each time it opens, and keep content mounted through the exit transition.
  const [previousOpen, setPreviousOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    setClosing(!open);
    if (open) {
      setValue(defaultValue);
      setError(null);
      setPending(false);
    }
  }

  const exited = useEffectEvent(() => onExited?.());
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setClosing(false);
      exited();
    }, EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      element.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const confirm = async () => {
    if (pending || !open) return;
    if (kind === "prompt") {
      const message = required && !value.trim() ? text.required : validate?.(value);
      if (message) {
        setError(message);
        return;
      }
    }
    if (onConfirm) {
      setPending(true);
      setError(null);
      try {
        await onConfirm(value);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
        setPending(false);
        return;
      }
      setPending(false);
    }
    onClose?.("confirm", value);
  };

  const cancel = () => {
    if (pending || !open) return;
    onClose?.("cancel", value);
  };

  const mounted = open || closing;
  const resolvedIcon = icon !== undefined ? icon : INTENT_ICONS[intent];
  // A destructive confirm starts on Cancel, so a stray Enter doesn't delete anything.
  const focusCancel = kind === "confirm" && intent === "danger";
  const errorId = `${id}-error`;

  return (
    <dialog
      ref={dialogRef}
      id={id}
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cx("dl-root", classNames?.root, className)}
      style={style}
      data-intent={intent}
      data-size={size}
      data-state={open ? "open" : "closed"}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) cancel();
      }}
      onPointerDown={(event) => {
        pressStartedOutside.current = outside(event);
      }}
      onClick={(event) => {
        if (dismissible && pressStartedOutside.current && outside(event)) cancel();
        pressStartedOutside.current = false;
      }}
    >
      {mounted && (
        <form
          className="dl-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <div className={cx("dl-body", classNames?.body)}>
            {resolvedIcon != null && (
              <span className={cx("dl-icon", classNames?.icon)} aria-hidden="true">
                {resolvedIcon}
              </span>
            )}
            <div className="dl-text">
              <h2 id={`${id}-title`} className={cx("dl-title", classNames?.title)}>
                {title}
              </h2>
              {description && (
                <div id={`${id}-description`} className={cx("dl-description", classNames?.description)}>
                  {description}
                </div>
              )}
              {kind === "prompt" && (
                <label className="dl-field">
                  {inputLabel && <span className="dl-label">{inputLabel}</span>}
                  <input
                    className={cx("dl-input", classNames?.input)}
                    type={inputType}
                    value={value}
                    placeholder={placeholder}
                    required={required}
                    readOnly={pending}
                    data-autofocus=""
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(event) => {
                      setValue(event.target.value);
                      if (error) setError(null);
                    }}
                  />
                </label>
              )}
              {error && (
                <p id={errorId} className="dl-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className={cx("dl-actions", classNames?.actions)}>
            {kind !== "alert" && (
              <button
                type="button"
                className={cx("dl-button", classNames?.cancel)}
                data-variant="secondary"
                data-autofocus={focusCancel ? "" : undefined}
                aria-disabled={pending || undefined}
                onClick={cancel}
              >
                {cancelLabel ?? text.cancel}
              </button>
            )}
            <button
              type="submit"
              className={cx("dl-button", classNames?.confirm)}
              data-variant={intent === "danger" ? "danger" : "primary"}
              data-autofocus={!focusCancel && kind !== "prompt" ? "" : undefined}
              // aria-disabled rather than disabled, so focus stays on the button while it works.
              aria-disabled={pending || undefined}
              aria-busy={pending || undefined}
            >
              {pending && <SpinnerIcon />}
              {confirmLabel ?? (kind === "alert" ? text.ok : text.confirm)}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
