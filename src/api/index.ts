import axios from "axios";
import {
  createLocalId,
  enqueue,
  getCached,
  invalidateCache,
  notifyDataSynced,
  onDataSynced,
  setCached,
  syncPending,
} from "./localData";
import { getToken } from "./storage";

export { onDataSynced };

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:3000";

/** Bound every request so pages cannot spin forever when the server stalls. */
const REQUEST_TIMEOUT_MS = 12_000;

export const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: REQUEST_TIMEOUT_MS,
});

let activeFullSync: Promise<number> | undefined;

// Add JWT token automatically
client.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type LocalCollection = "work-logs" | "expenses" | "loans";

async function readCollection(collection: LocalCollection, request: () => Promise<any>) {
  const cached = await getCached<any[]>(collection);

  // Background fetch to keep SQLite updated with server changes
  const fetchFresh = async () => {
    try {
      const response = await request();
      if (response && response.data !== undefined) {
        await setCached(collection, response.data ?? []);
      }
    } catch {
      // Offline or network error; keep SQLite cache intact
    }
  };

  if (cached !== null) {
    void fetchFresh();
    return { data: cached };
  }

  try {
    const response = await request();
    await setCached(collection, response.data ?? []);
    return response;
  } catch (error) {
    // If initial fetch fails offline, return empty list gracefully
    return { data: [] };
  }
}

/** Keys that aggregate data across collections — always stale after a mutation. */
const DASHBOARD_KEYS = [
  "dashboard-summary",
  "dashboard-analytics",
  "dashboard-clients",
  "dashboard-monthly-history",
];

async function invalidateDashboard() {
  await Promise.all(DASHBOARD_KEYS.map(invalidateCache));
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
  // Invalidate aggregated caches so dashboard reflects changes immediately.
  void invalidateDashboard();
  // Sync is deliberately best-effort: a mutation has already been saved on-device.
  void syncPending(client);
  return { data: responseData };
}

async function cachedRequest(key: string, request: () => Promise<any>) {
  const cached = await getCached<any>(key);

  const fetchFresh = async () => {
    try {
      const response = await request();
      if (response && response.data !== undefined) {
        await setCached(key, response.data);
      }
    } catch {
      // Offline; keep SQLite cache intact
    }
  };

  if (cached !== null) {
    void fetchFresh();
    return { data: cached };
  }

  try {
    const response = await request();
    await setCached(key, response.data);
    return response;
  } catch (error) {
    return { data: null };
  }
}

/**
 * Pull fresh data from the server into SQLite without wiping the existing cache
 * first. Keeps the app usable if the request fails or times out.
 */
export async function refreshCollection(
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
  void invalidateDashboard();
  if (key.startsWith("loan-repayments:")) {
    void invalidateCache("loans");
  }
  void syncPending(client);
  return { data: responseData };
}

async function mutateCachedObject(key: string, url: string, data: any) {
  const current = (await getCached<any>(key)) ?? {};
  const next = { ...current, ...data };
  await setCached(key, next);
  await enqueue("patch", url, data);
  void syncPending(client);
  return { data: next };
}

export async function syncLocalData(): Promise<number> {
  if (activeFullSync) return activeFullSync;

  activeFullSync = (async () => {
    const synced = await syncPending(client);
    const resources: [string, () => Promise<any>][] = [
      ["work-logs", () => client.get("/work-logs")],
      ["expenses", () => client.get("/expenses")],
      ["loans", () => client.get("/loans")],
      ["dashboard-summary", () => client.get("/dashboard/summary")],
      ["dashboard-analytics", () => client.get("/dashboard/analytics")],
      ["dashboard-clients", () => client.get("/dashboard/clients")],
      [
        "dashboard-monthly-history",
        () => client.get("/dashboard/monthly-history"),
      ],
      ["profile", () => client.get("/auth/me")],
    ];

    const results = await Promise.allSettled(
      resources.map(async ([key, request]) => refreshCollection(key, request)),
    );

    const updated = results.some(
      (result) => result.status === "fulfilled" && result.value.changed,
    );

    notifyDataSynced({ synced, updated: updated || synced > 0 });
    return synced;
  })();

  return activeFullSync.finally(() => {
    activeFullSync = undefined;
  });
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

  resetPassword: (email: string, password: string) =>
    client.post("/auth/reset-password", {
      email,
      password,
    }),

  getMe: () =>
    cachedRequest("profile", () => client.get("/auth/me")),

  updateProfile: (data: any) =>
    // Password changes still use this durable queue, but passwords are never cached.
    data.password
      ? client.patch("/auth/profile", data)
      : mutateCachedObject("profile", "/auth/profile", data),

  // ==================== Dashboard ====================
  getDashboardSummary: () =>
    cachedRequest("dashboard-summary", () => client.get("/dashboard/summary")),

  getAnalytics: () =>
    cachedRequest("dashboard-analytics", () => client.get("/dashboard/analytics")),

  getClientAnalytics: () =>
    cachedRequest("dashboard-clients", () => client.get("/dashboard/clients")),

  getMonthlyHistory: () =>
    cachedRequest("dashboard-monthly-history", () => client.get("/dashboard/monthly-history")),

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
