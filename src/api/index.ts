import axios from "axios";
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
    client.get("/auth/me"),

  updateProfile: (data: any) =>
    client.patch("/auth/profile", data),

  // ==================== Dashboard ====================
  getDashboardSummary: () =>
    client.get("/dashboard/summary"),

  getAnalytics: () =>
    client.get("/dashboard/analytics"),

  getClientAnalytics: () =>
    client.get("/dashboard/clients"),

  getMonthlyHistory: () =>
    client.get("/dashboard/monthly-history"),

  // ==================== Work Logs ====================
  getWorkLogs: () =>
    client.get("/work-logs"),

  createWorkLog: (data: any) =>
    client.post("/work-logs", data),

  updateWorkLog: (id: string | number, data: any) =>
    client.patch(`/work-logs/${id}`, data),

  deleteWorkLog: (id: string | number) =>
    client.delete(`/work-logs/${id}`),

  // ==================== Expenses ====================
  getExpenses: () =>
    client.get("/expenses"),

  createExpense: (data: any) =>
    client.post("/expenses", data),

  updateExpense: (id: string | number, data: any) =>
    client.patch(`/expenses/${id}`, data),

  deleteExpense: (id: string | number) =>
    client.delete(`/expenses/${id}`),

  // ==================== Loans ====================
  getLoans: () =>
    client.get("/loans"),

  createLoan: (data: any) =>
    client.post("/loans", data),

  updateLoan: (id: string | number, data: any) =>
    client.patch(`/loans/${id}`, data),

  deleteLoan: (id: string | number) =>
    client.delete(`/loans/${id}`),

  // ==================== Loan Repayments ====================
  getLoanRepayments: (loanId: string | number) =>
    client.get(`/loans/${loanId}/repayments`),

  addLoanRepayment: (loanId: string | number, data: any) =>
    client.post(`/loans/${loanId}/repayments`, data),

  addLoanInterest: (loanId: string | number, data: any) =>
    client.post(`/loans/${loanId}/repayments`, {
      ...data,
      type: "Interest",
    }),

  updateLoanRepayment: (
    loanId: string | number,
    repaymentId: string | number,
    data: any,
  ) =>
    client.patch(
      `/loans/${loanId}/repayments/${repaymentId}`,
      data
    ),

  deleteLoanRepayment: (
    loanId: string | number,
    repaymentId: string | number,
  ) =>
    client.delete(
      `/loans/${loanId}/repayments/${repaymentId}`
    ),










};