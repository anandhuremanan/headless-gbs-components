"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createUploaderStore, type UploaderConfig, type UploaderStore } from "../core/store";
import type { UploaderSnapshot } from "../core/types";

export interface UseFileUploaderResult extends UploaderSnapshot {
  store: UploaderStore;
}

/**
 * An upload store that lives as long as the component, always using the latest
 * config and callbacks. Exported for building a different UI on the same engine.
 */
export function useFileUploader(config: UploaderConfig = {}): UseFileUploaderResult {
  const [store] = useState(() => createUploaderStore(config));

  // No dependency list on purpose: callbacks and limits stay current on every render.
  useEffect(() => {
    store.configure(config);
  });

  // Nothing should keep uploading for a component that is gone.
  useEffect(() => () => store.cancel(), [store]);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return { store, ...snapshot };
}
