import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import type { AxiosInstance } from "axios";

type CachedRow = { value: string; updated_at: number };
type OutboxRow = {
  id: number;
  method: "post" | "patch" | "delete";
  url: string;
  body: string | null;
  localId: string | null;
};

export type SyncPushResult = {
  synced: number;
  error?: string;
  authExpired?: boolean;
};

export type SyncResult = {
  synced: number;
  updated: boolean;
  pending: number;
  error?: string;
  authExpired?: boolean;
};

const DATABASE_NAME = "gig-finance.db";
const WEB_PREFIX = "gig-finance:";
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
let activeSync: Promise<SyncPushResult> | undefined;
type SyncListener = (result: SyncResult) => void;
const syncListeners = new Set<SyncListener>();

function syncFailureMessage(error: unknown): {
  message: string;
  authExpired: boolean;
} {
  const status = (error as { response?: { status?: number; data?: { message?: string } } })
    ?.response?.status;
  const serverMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  const code = (error as { code?: string })?.code;

  if (status === 401 || status === 403) {
    return {
      message: serverMessage || "Session expired. Please log in again.",
      authExpired: true,
    };
  }
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") {
    return {
      message: "Could not reach the server. Check your connection and try again.",
      authExpired: false,
    };
  }
  if (status && status >= 400) {
    return {
      message: serverMessage || `Sync failed (${status}).`,
      authExpired: false,
    };
  }
  return {
    message: serverMessage || "Sync failed. Please try again.",
    authExpired: false,
  };
}

/** Subscribe to completed server→local syncs so screens can refresh UI. */
export function onDataSynced(listener: SyncListener): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function notifyDataSynced(result: SyncResult): void {
  syncListeners.forEach((listener) => {
    try {
      listener(result);
    } catch {
      // Listener errors must not break sync.
    }
  });
}

async function database() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS outbox (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          method TEXT NOT NULL,
          url TEXT NOT NULL,
          body TEXT,
          local_id TEXT,
          created_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return databasePromise;
}

/** Cached API responses are application data; authentication remains in SecureStore.
 * Always returns stored data when present (stale-while-revalidate) so UI never blocks
 * waiting on the network after a background sync.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (Platform.OS === "web") {
    const raw = globalThis.localStorage?.getItem(`${WEB_PREFIX}${key}`);
    if (!raw) return null;
    try {
      const parsed: { value: T; updatedAt: number } = JSON.parse(raw);
      return parsed.value;
    } catch {
      return null;
    }
  }
  const db = await database();
  const row = await db.getFirstAsync<CachedRow>(
    "SELECT value, updated_at FROM cache WHERE key = ?",
    key,
  );
  if (!row) return null;
  return JSON.parse(row.value) as T;
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(
      `${WEB_PREFIX}${key}`,
      JSON.stringify({ value, updatedAt: Date.now() }),
    );
    return;
  }
  const db = await database();
  await db.runAsync(
    "INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)",
    key,
    serialized,
    Date.now(),
  );
}

/** Remove a key from cache so the next read forces a fresh server fetch. */
export async function invalidateCache(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(`${WEB_PREFIX}${key}`);
    return;
  }
  const db = await database();
  await db.runAsync("DELETE FROM cache WHERE key = ?", key);
}

/** Wipe cached collections only — keeps the outbox so unsynced edits survive
 * session expiry / re-login. */
export async function clearLocalCache(): Promise<void> {
  if (Platform.OS === "web") {
    Object.keys(globalThis.localStorage ?? {})
      .filter((key) => key.startsWith(WEB_PREFIX) && !key.endsWith("outbox"))
      .forEach((key) => globalThis.localStorage.removeItem(key));
    return;
  }
  const db = await database();
  await db.execAsync("DELETE FROM cache;");
}

/** Full wipe used on intentional logout (cache + pending mutations). */
export async function clearLocalData(): Promise<void> {
  if (Platform.OS === "web") {
    Object.keys(globalThis.localStorage ?? {})
      .filter((key) => key.startsWith(WEB_PREFIX))
      .forEach((key) => globalThis.localStorage.removeItem(key));
    return;
  }
  const db = await database();
  await db.execAsync("DELETE FROM cache; DELETE FROM outbox;");
}

export function createLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueue(
  method: OutboxRow["method"],
  url: string,
  body?: unknown,
  localId?: string,
): Promise<void> {
  const serialized = body === undefined ? null : JSON.stringify(body);
  if (Platform.OS === "web") {
    const key = `${WEB_PREFIX}outbox`;
    const queue: OutboxRow[] = JSON.parse(globalThis.localStorage?.getItem(key) ?? "[]");
    queue.push({ id: Date.now(), method, url, body: serialized, localId: localId ?? null });
    globalThis.localStorage?.setItem(key, JSON.stringify(queue));
    return;
  }
  const db = await database();
  await db.runAsync(
    "INSERT INTO outbox (method, url, body, local_id, created_at) VALUES (?, ?, ?, ?, ?)",
    method,
    url,
    serialized,
    localId ?? null,
    Date.now(),
  );
}

export async function getPendingOutboxCount(): Promise<number> {
  if (Platform.OS === "web") {
    const queue: OutboxRow[] = JSON.parse(
      globalThis.localStorage?.getItem(`${WEB_PREFIX}outbox`) ?? "[]",
    );
    return queue.length;
  }
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM outbox",
  );
  return row?.count ?? 0;
}

async function outbox(): Promise<OutboxRow[]> {
  if (Platform.OS === "web") {
    return JSON.parse(globalThis.localStorage?.getItem(`${WEB_PREFIX}outbox`) ?? "[]");
  }
  const db = await database();
  return db.getAllAsync<OutboxRow>("SELECT id, method, url, body, local_id AS localId FROM outbox ORDER BY id");
}

async function removeOutboxItem(id: number): Promise<void> {
  if (Platform.OS === "web") {
    const key = `${WEB_PREFIX}outbox`;
    const queue = (await outbox()).filter((item) => item.id !== id);
    globalThis.localStorage?.setItem(key, JSON.stringify(queue));
    return;
  }
  const db = await database();
  await db.runAsync("DELETE FROM outbox WHERE id = ?", id);
}

export async function updateItemWithServerResponse(
  url: string,
  remoteData: any,
  localId?: string | null,
): Promise<void> {
  const collections: { key: string; match: string }[] = [
    { key: "work-logs", match: "work-logs" },
    { key: "expenses", match: "expenses" },
    { key: "loans", match: "loans" },
  ];

  for (const { key, match } of collections) {
    if (url.includes(match)) {
      const items = await getCached<any[]>(key);
      if (!items) continue;

      let updated = false;
      const targetId = remoteData?._id || remoteData?.id;
      const next = items.map((item) => {
        if (localId && item?._id === localId) {
          updated = true;
          return { ...item, ...remoteData, _id: targetId || localId };
        }
        if (targetId && item?._id === targetId) {
          updated = true;
          return { ...item, ...remoteData };
        }
        return item;
      });

      if (updated) {
        await setCached(key, next);
      }
    }
  }

  // Also check loan repayments
  if (url.includes("repayments")) {
    const parts = url.split("/");
    const loanIdx = parts.indexOf("loans");
    if (loanIdx !== -1 && parts[loanIdx + 1]) {
      const loanId = parts[loanIdx + 1];
      const repayKey = `loan-repayments:${loanId}`;
      const items = await getCached<any[]>(repayKey);
      if (items) {
        const targetId = remoteData?._id || remoteData?.id;
        const next = items.map((item) => {
          if (localId && item?._id === localId) {
            return { ...item, ...remoteData, _id: targetId || localId };
          }
          if (targetId && item?._id === targetId) {
            return { ...item, ...remoteData };
          }
          return item;
        });
        await setCached(repayKey, next);
      }
    }
  }
}

async function replaceLocalId(localId: string, remoteId: string): Promise<void> {
  const keys = ["work-logs", "expenses", "loans"];
  for (const key of keys) {
    const items = await getCached<any[]>(key);
    if (!items) continue;
    const next = items.map((item) => (item?._id === localId ? { ...item, _id: remoteId } : item));
    await setCached(key, next);
  }

  // Move repayment cache if it was keyed by the temporary loan id.
  const localRepayKey = `loan-repayments:${localId}`;
  const repayments = await getCached<any[]>(localRepayKey);
  if (repayments) {
    await setCached(`loan-repayments:${remoteId}`, repayments);
    await invalidateCache(localRepayKey);
  }

  // Rewrite any later outbox rows that still reference the temporary local id
  // (e.g. create loan → add repayment while offline).
  const pending = await outbox();
  if (Platform.OS === "web") {
    const key = `${WEB_PREFIX}outbox`;
    const queue = pending.map((row) => ({
      ...row,
      url: row.url.replaceAll(localId, remoteId),
      body: row.body?.replaceAll(localId, remoteId) ?? null,
    }));
    globalThis.localStorage?.setItem(key, JSON.stringify(queue));
  } else {
    const db = await database();
    for (const item of pending) {
      const url = item.url.replaceAll(localId, remoteId);
      const body = item.body?.replaceAll(localId, remoteId) ?? null;
      if (url === item.url && body === item.body) continue;
      await db.runAsync("UPDATE outbox SET url = ?, body = ? WHERE id = ?", url, body, item.id);
    }
  }
}

/** Replays local mutations in order. Always re-reads the queue head so
 * local→remote id rewrites from earlier posts are picked up. A failed
 * request stays queued for the next sync. */
export function syncPending(client: AxiosInstance): Promise<SyncPushResult> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    let synced = 0;
    while (true) {
      const items = await outbox();
      if (items.length === 0) break;

      const item = items[0];
      try {
        const response = await client.request({
          method: item.method,
          url: item.url,
          data: item.body ? JSON.parse(item.body) : undefined,
        });

        if (response.data) {
          if (item.method === "post" && item.localId && response.data?._id) {
            await replaceLocalId(item.localId, response.data._id);
          }
          await updateItemWithServerResponse(item.url, response.data, item.localId);
        }

        await removeOutboxItem(item.id);
        synced += 1;
      } catch (error) {
        // Stop on first failure so ordering is preserved; remaining stay queued.
        const failure = syncFailureMessage(error);
        return {
          synced,
          error: failure.message,
          authExpired: failure.authExpired,
        };
      }
    }
    return { synced };
  })();
  return activeSync.finally(() => {
    activeSync = undefined;
  });
}
