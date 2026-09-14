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

const DATABASE_NAME = "gig-finance.db";
const WEB_PREFIX = "gig-finance:";
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
let activeSync: Promise<number> | undefined;

type SyncResult = { synced: number; updated: boolean };
type SyncListener = (result: SyncResult) => void;
const syncListeners = new Set<SyncListener>();

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

  if (Platform.OS !== "web") {
    const db = await database();
    const pending = await db.getAllAsync<OutboxRow>("SELECT id, url, body FROM outbox");
    for (const item of pending) {
      const url = item.url.replaceAll(localId, remoteId);
      const body = item.body?.replaceAll(localId, remoteId) ?? null;
      await db.runAsync("UPDATE outbox SET url = ?, body = ? WHERE id = ?", url, body, item.id);
    }
  }
}

/** Replays local mutations in order. A failed request stays queued for the next sync. */
export function syncPending(client: AxiosInstance): Promise<number> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    let synced = 0;
    for (const item of await outbox()) {
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
      } catch {
        break;
      }
    }
    return synced;
  })();
  return activeSync.finally(() => {
    activeSync = undefined;
  });
}
