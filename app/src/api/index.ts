import axios from "axios";
import {
  createLocalId,
  enqueue,
  getCached,
  getPendingOutboxCount,
  notifyDataSynced,
  onDataSynced,
  setCached,
  syncPending,
  type SyncResult,
} from "./localData";
import { getToken } from "./storage";

export { onDataSynced, getPendingOutboxCount };
export type { SyncResult };

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:10000";

/** Bound every request so pages cannot spin forever when the server stalls.
 * Render free-tier cold starts often exceed 12s, so keep this generous. */
const REQUEST_TIMEOUT_MS = 30_000;

export const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: REQUEST_TIMEOUT_MS,
});

let activeFullSync: Promise<SyncResult> | undefined;

// Add JWT token automatically
client.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type LocalCollection = "work-logs" | "expenses" | "loans";

/** Pages always read SQLite/localStorage. Network is only used on first
 * cache miss (bootstrap) or when the user taps Sync in Settings. */
async function readCollection(collection: LocalCollection, request: () => Promise<any>) {
  const cached = await getCached<any[]>(collection);
  if (cached !== null) {
    return { data: cached };
  }

  try {
    const response = await request();
    await setCached(collection, response.data ?? []);
    return response;
  } catch {
    // Offline with no local data yet.
    return { data: [] };
  }
}

async function mutateCollection(
  collection: LocalCollection,
  method: "post" | "patch" | "delete",
  url: string,
  data?: any,
) {
  const current = (await getCached<any[]>(collection)) ?? [];
  const id = url.split("/").at(-1);
  let responseData: any = data;
  let localId: string | undefined;

  if (method === "post") {
    localId = createLocalId();
    responseData = { ...data, _id: localId, createdAt: new Date().toISOString() };
    await setCached(collection, [responseData, ...current]);
  } else if (method === "patch") {
    responseData = { ...(current.find((item) => item._id === id) ?? {}), ...data, _id: id };
    await setCached(collection, current.map((item) => (item._id === id ? responseData : item)));
  } else {
    await setCached(collection, current.filter((item) => item._id !== id));
    responseData = { message: "Deleted locally" };
  }

  await enqueue(method, url, data, localId);
  // Mutations stay queued until Sync. Dashboard caches refresh on Sync only
  // so a server pull cannot wipe unsynced local rows.
  return { data: responseData };
}

async function cachedRequest(key: string, request: () => Promise<any>) {
  const cached = await getCached<any>(key);
  if (cached !== null) {
    return { data: cached };
  }

  try {
    const response = await request();
    await setCached(key, response.data);
    return response;
  } catch {
    return { data: null };
  }
}

/**
 * Pull fresh data from the server into SQLite without wiping the existing cache
 * first. Keeps the app usable if the request fails or times out.
 */
async function refreshCollection(
  key: string,
  request: () => Promise<any>,
): Promise<{ data: any; changed: boolean }> {
  const previous = await getCached<any>(key);
  try {
    const response = await request();
    const next = response.data ?? (Array.isArray(previous) ? [] : previous);
    const changed =
      JSON.stringify(previous ?? null) !== JSON.stringify(next ?? null);
    await setCached(key, next);
    return { data: next, changed };
  } catch (error) {
    // Keep whatever is already on-device; never leave the key empty mid-sync.
    if (previous !== null) {
      return { data: previous, changed: false };
    }
    throw error;
  }
}

async function mutateCachedList(
  key: string,
  method: "post" | "patch" | "delete",
  url: string,
  data?: any,
) {
  const current = (await getCached<any[]>(key)) ?? [];
  const id = url.split("/").at(-1);
  let responseData: any = data;
  let localId: string | undefined;
  if (method === "post") {
    localId = createLocalId();
    responseData = { ...data, _id: localId, createdAt: new Date().toISOString() };
    await setCached(key, [responseData, ...current]);
  } else if (method === "patch") {
    responseData = { ...(current.find((item) => item._id === id) ?? {}), ...data, _id: id };
    await setCached(key, current.map((item) => (item._id === id ? responseData : item)));
  } else {
    await setCached(key, current.filter((item) => item._id !== id));
    responseData = { message: "Deleted locally" };
  }
  await enqueue(method, url, data, localId);
  return { data: responseData };
}

async function mutateCachedObject(key: string, url: string, data: any) {
  const current = (await getCached<any>(key)) ?? {};
  const next = { ...current, ...data };
  await setCached(key, next);
  await enqueue("patch", url, data);
  return { data: next };
}

export async function syncLocalData(): Promise<SyncResult> {
  if (activeFullSync) return activeFullSync;

  activeFullSync = (async () => {
    const push = await syncPending(client);
    const pendingAfterPush = await getPendingOutboxCount();

    // Only pull server → local when the outbox is clear. Otherwise a pull
    // would overwrite rows that still have not been pushed.
    let updated = false;
    let pullError: string | undefined;
    if (pendingAfterPush === 0 && !push.error) {
      const resources: [string, () => Promise<any>][] = [
        ["work-logs", () => client.get("/work-logs")],
        ["expenses", () => client.get("/expenses")],
        ["loans", () => client.get("/loans")],
        ["dashboard-summary", () => client.get("/dashboard/summary")],
        ["dashboard-analytics", () => client.get("/dashboard/analytics")],
        ["profile", () => client.get("/auth/me")],
      ];

      const results = await Promise.allSettled(
        resources.map(async ([key, request]) => refreshCollection(key, request)),
      );

      updated = results.some(
        (result) => result.status === "fulfilled" && result.value.changed,
      );

      const failed = results.find((result) => result.status === "rejected");
      if (failed && failed.status === "rejected") {
        const status = (failed.reason as { response?: { status?: number } })
          ?.response?.status;
        if (status === 401 || status === 403) {
          pullError = "Session expired. Please log in again.";
        }
      }
    }

    if (pendingAfterPush === 0 && !push.error && !pullError) {
      await setCached("last-synced-at", Date.now());
    }

    const result: SyncResult = {
      synced: push.synced,
      updated: updated || push.synced > 0,
      pending: pendingAfterPush,
      error: push.error || pullError,
      authExpired: push.authExpired || Boolean(pullError),
    };
    notifyDataSynced(result);
    return result;
  })();

  return activeFullSync.finally(() => {
    activeFullSync = undefined;
  });
}

export async function getLastSyncedAt(): Promise<number | null> {
  return getCached<number>("last-synced-at");
}

export const api = {
  // ==================== Health ====================
  healthCheck: () =>
    client.get("/health"),

  // ==================== Auth ====================
  register: (email: string, password: string, name: string) =>
    client.post("/auth/register", {
      email,
      password,
      name,
    }),

  login: (email: string, password: string) =>
    client.post("/auth/login", {
      email,
      password,
    }),

  logout: () =>
    client.post("/auth/logout"),

  forgotPassword: (email: string) =>
    client.post("/auth/forgot-password", {
      email,
    }),

  getMe: () =>
    cachedRequest("profile", () => client.get("/auth/me")),

  /** Always hits the network so expired tokens are detected (unlike getMe). */
  getMeOnline: async () => {
    const response = await client.get("/auth/me");
    if (response?.data) {
      await setCached("profile", response.data);
    }
    return response;
  },

  updateProfile: async (data: any) => {
    // Password / email changes go online immediately and refresh local profile.
    if (data.password || data.email) {
      const response = await client.patch("/auth/profile", data);
      if (response?.data) {
        const current = (await getCached<any>("profile")) ?? {};
        await setCached("profile", { ...current, ...response.data });
      }
      return response;
    }
    return mutateCachedObject("profile", "/auth/profile", data);
  },

  // ==================== Dashboard ====================
  getDashboardSummary: () =>
    cachedRequest("dashboard-summary", () => client.get("/dashboard/summary")),

  getAnalytics: () =>
    cachedRequest("dashboard-analytics", () => client.get("/dashboard/analytics")),

  // ==================== Work Logs ====================
  getWorkLogs: () =>
    readCollection("work-logs", () => client.get("/work-logs")),

  createWorkLog: (data: any) =>
    mutateCollection("work-logs", "post", "/work-logs", data),

  updateWorkLog: (id: string | number, data: any) =>
    mutateCollection("work-logs", "patch", `/work-logs/${id}`, data),

  deleteWorkLog: (id: string | number) =>
    mutateCollection("work-logs", "delete", `/work-logs/${id}`),

  // ==================== Expenses ====================
  getExpenses: () =>
    readCollection("expenses", () => client.get("/expenses")),

  createExpense: (data: any) =>
    mutateCollection("expenses", "post", "/expenses", data),

  updateExpense: (id: string | number, data: any) =>
    mutateCollection("expenses", "patch", `/expenses/${id}`, data),

  deleteExpense: (id: string | number) =>
    mutateCollection("expenses", "delete", `/expenses/${id}`),

  // ==================== Loans ====================
  getLoans: () =>
    readCollection("loans", () => client.get("/loans")),

  createLoan: (data: any) =>
    mutateCollection("loans", "post", "/loans", data),

  updateLoan: (id: string | number, data: any) =>
    mutateCollection("loans", "patch", `/loans/${id}`, data),

  deleteLoan: (id: string | number) =>
    mutateCollection("loans", "delete", `/loans/${id}`),

  // ==================== Loan Repayments ====================
  getLoanRepayments: (loanId: string | number) =>
    cachedRequest(`loan-repayments:${loanId}`, () => client.get(`/loans/${loanId}/repayments`)),

  addLoanRepayment: (loanId: string | number, data: any) =>
    mutateCachedList(`loan-repayments:${loanId}`, "post", `/loans/${loanId}/repayments`, data),

  addLoanInterest: (loanId: string | number, data: any) =>
    mutateCachedList(`loan-repayments:${loanId}`, "post", `/loans/${loanId}/repayments`, {
      ...data,
      type: "Interest",
    }),

  updateLoanRepayment: (
    loanId: string | number,
    repaymentId: string | number,
    data: any,
  ) =>
    mutateCachedList(
      `loan-repayments:${loanId}`,
      "patch",
      `/loans/${loanId}/repayments/${repaymentId}`,
      data,
    ),

  deleteLoanRepayment: (
    loanId: string | number,
    repaymentId: string | number,
  ) =>
    mutateCachedList(
      `loan-repayments:${loanId}`,
      "delete",
      `/loans/${loanId}/repayments/${repaymentId}`,
    ),

};
