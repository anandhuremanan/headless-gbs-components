"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { ReadableStore } from "../core/store";
import type { RowId } from "../core/types";
import { useGridContext } from "./context";

/** Snapshot getter that returns the previous selection while it is still equal. */
function createSelectionGetter<S, R>(
  store: ReadableStore<S>,
  selector: (snapshot: S) => R,
  isEqual: (a: R, b: R) => boolean,
): () => R {
  let cache: { snapshot: S; value: R } | null = null;
  return () => {
    const snapshot = store.getSnapshot();
    if (cache && Object.is(cache.snapshot, snapshot)) return cache.value;
    const value = selector(snapshot);
    cache = { snapshot, value: cache && isEqual(cache.value, value) ? cache.value : value };
    return cache.value;
  };
}

/**
 * Subscribes to a slice of an external store. The component re-renders only
 * when the selected value changes according to `isEqual`.
 */
export function useStoreSelector<S, R>(
  store: ReadableStore<S>,
  selector: (snapshot: S) => R,
  isEqual: (a: R, b: R) => boolean = Object.is,
): R {
  const getSelection = useMemo(
    () => createSelectionGetter(store, selector, isEqual),
    [store, selector, isEqual],
  );
  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

/** Row selection, from the controlled prop when present, otherwise internal state. */
export function useSelectionState<T, R>(
  selector: (selection: Record<RowId, boolean>) => R,
): R {
  const { engine, controlledSelection } = useGridContext<T>();
  const internal = useStoreSelector(engine.store, (s) => selector(s.state.rowSelection));
  return controlledSelection ? selector(controlledSelection) : internal;
}

/** Moves DOM focus to a cell once it becomes active through keyboard navigation. */
export function useFocusWhenActive(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  editing = false,
) {
  const { engine } = useGridContext();
  useLayoutEffect(() => {
    if (active && !editing && engine.consumeFocusRequest()) {
      ref.current?.focus({ preventScroll: true });
    }
  }, [active, editing, engine, ref]);
}

/** Open state for an anchored popover, ignoring the click that just dismissed it. */
export function usePopoverState<P = void>() {
  const [state, setState] = useState<{ anchor: HTMLElement; payload: P } | null>(null);
  const lastClosed = useRef<{ anchor: HTMLElement | null; time: number }>({ anchor: null, time: 0 });

  const open = useCallback((anchor: HTMLElement, payload: P) => {
    const last = lastClosed.current;
    if (last.anchor === anchor && performance.now() - last.time < 300) return;
    setState({ anchor, payload });
  }, []);

  const close = useCallback((anchor: HTMLElement | null) => {
    lastClosed.current = { anchor, time: performance.now() };
    setState(null);
  }, []);

  return { state, open, close };
}
