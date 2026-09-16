import type { CSSProperties, ReactNode } from "react";
import type {
  ComboboxLocaleText,
  ComboboxOption,
  ComboboxSize,
  OptionValue,
} from "../core/types";

export type ComboboxSlot =
  | "root"
  | "label"
  | "control"
  | "value"
  | "tag"
  | "popover"
  | "search"
  | "list"
  | "option"
  | "footer";

export interface ComboboxHandle<V extends OptionValue = string> {
  open(): void;
  close(): void;
  toggle(): void;
  focus(): void;
  clear(): void;
  getValue(): V[];
  getSelectedOptions(): ComboboxOption<V>[];
}

export interface OptionState {
  selected: boolean;
  active: boolean;
}

export interface ComboboxSharedProps<V extends OptionValue = string> {
  options: readonly ComboboxOption<V>[];
  /** `client` filters `options` locally; `server` expects `options` to be the current results. */
  mode?: "client" | "server";
  /** Shows a loading row; keeps current options visible. */
  loading?: boolean;
  /** Called with the search text (debounced in server mode), and on open. */
  onSearchChange?(search: string): void;
  /** Debounce for `onSearchChange` in server mode. Default 250 ms. */
  searchDebounce?: number;
  /** Show the search box. Default true. When false, typing jumps to a matching option. */
  searchable?: boolean;
  /** More results are available; the list calls `onLoadMore` when scrolled near the end. */
  hasMore?: boolean;
  onLoadMore?(): void;
  /**
   * Replaces the built-in search matching (client mode).
   * `NoInfer` keeps the option type coming from `options` and `value` only.
   */
  filterFn?(option: ComboboxOption<NoInfer<V>>, search: string): boolean;
  renderOption?(option: ComboboxOption<NoInfer<V>>, state: OptionState): ReactNode;
  /** Offers "Create …" when the search matches no option. */
  allowCreate?: boolean;
  onCreate?(label: string): void;
  label?: ReactNode;
  placeholder?: string;
  description?: ReactNode;
  /** Message shown below the control; also marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Show the clear button. Default true. */
  clearable?: boolean;
  size?: ComboboxSize;
  /** Name for the hidden form input. */
  name?: string;
  id?: string;
  /** Max height of the option list in pixels. Default 280. */
  maxHeight?: number;
  /** `true` / `false` to force, or a count above which virtualization turns on (default 80). */
  virtualize?: boolean | number;
  emptyMessage?: ReactNode;
  className?: string;
  classNames?: Partial<Record<ComboboxSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<ComboboxLocaleText>;
  onOpenChange?(open: boolean): void;
}

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
