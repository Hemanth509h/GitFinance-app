import { useEffect, useRef } from "react";
import { onDataSynced } from "../api/localData";

/** Re-run a screen's local fetch when server sync updates SQLite. */
export function useReloadOnSync(reload: () => void | Promise<void>) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    return onDataSynced(({ updated, synced }) => {
      if (!updated && synced === 0) return;
      void reloadRef.current();
    });
  }, []);
}
