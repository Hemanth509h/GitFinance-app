import axios from "axios";
import {
  createLocalId,
  enqueue,
  getCached,
  setCached,
  syncPending,
} from "./localData";
import { getToken } from "./storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:3000";

export const client = axios.create({
  baseURL: `${API_URL}/api`,
});

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
  if (cached) return { data: cached };
  const response = await request();
  await setCached(collection, response.data ?? []);
  return response;
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
  // Sync is deliberately best-effort: a mutation has already been saved on-device.
  void syncPending(client);
  return { data: responseData };
}

async function cachedRequest(key: string, request: () => Promise<any>) {
  const cached = await getCached<any>(key);
  if (cached !== null) return { data: cached };
  const response = await request();
  await setCached(key, response.data);
  return response;
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
  const synced = await syncPending(client);
  const resources: [string, () => Promise<any>][] = [
    ["work-logs", () => client.get("/work-logs")],
    ["expenses", () => client.get("/expenses")],
    ["loans", () => client.get("/loans")],
    ["dashboard-summary", () => client.get("/dashboard/summary")],
    ["dashboard-analytics", () => client.get("/dashboard/analytics")],
    ["dashboard-clients", () => client.get("/dashboard/clients")],
    ["dashboard-monthly-history", () => client.get("/dashboard/monthly-history")],
    ["profile", () => client.get("/auth/me")],
  ];
  await Promise.all(
    resources.map(async ([key, request]) => {
      const response = await request();
      await setCached(key, response.data ?? []);
    }),
  );
  return synced;
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
