import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getToken } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';


const client = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true
});

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const CACHE_TTL = 30_000;
const cache = new Map<string, { ts: number; data: AxiosResponse }>();

function cachedGet(path: string): Promise<AxiosResponse> {
    const entry = cache.get(path);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
        return Promise.resolve(entry.data);
    }
    return client.get(path).then((res: AxiosResponse) => {
        cache.set(path, { ts: Date.now(), data: res });
        return res;
    });
}

function invalidate(...prefixes: string[]): void {
    for (const key of cache.keys()) {
        if (prefixes.some((p) => key.startsWith(p))) cache.delete(key);
    }
}

function invalidateAll(): void {
    cache.clear();
}

const post = (path: string, data?: any) => client.post(path, data);
const patch = (path: string, data?: any) => client.patch(path, data);
const del = (path: string) => client.delete(path);

const api = {
    healthCheck: () => client.get('/health'),

    // Auth
    register: (email: string, password: string, name: string) => post('/auth/register', { email, password, name }),
    login: (email: string, password: string) => post('/auth/login', { email, password }),
    logout: () => post('/auth/logout', {}),
    forgotPassword: (email: string) => post('/auth/forgot-password', { email }),
    resetPassword: (email: string, password: string) => post('/auth/reset-password', { email, password }),
    getMe: () => client.get('/auth/me'),
    updateProfile: (data: any) => {
        invalidateAll();
        return patch('/auth/profile', data);
    },

    // Dashboard
    getDashboardSummary: () => cachedGet('/dashboard/summary'),
    getAnalytics: () => cachedGet('/dashboard/analytics'),
    getClientAnalytics: () => cachedGet('/dashboard/clients'),
    getMonthlyHistory: () => cachedGet('/dashboard/monthly-history'),

    // Work Logs
    getWorkLogs: () => cachedGet('/work-logs'),
    createWorkLog: (data: any) => {
        invalidate('/work-logs', '/dashboard');
        return post('/work-logs', data);
    },
    updateWorkLog: (id: string | number, data: any) => {
        invalidate('/work-logs', '/dashboard');
        return patch(`/work-logs/${id}`, data);
    },
    deleteWorkLog: (id: string | number) => {
        invalidate('/work-logs', '/dashboard');
        return del(`/work-logs/${id}`);
    },

    // Expenses
    getExpenses: () => cachedGet('/expenses'),
    createExpense: (data: any) => {
        invalidate('/expenses', '/dashboard');
        return post('/expenses', data);
    },
    updateExpense: (id: string | number, data: any) => {
        invalidate('/expenses', '/dashboard');
        return patch(`/expenses/${id}`, data);
    },
    deleteExpense: (id: string | number) => {
        invalidate('/expenses', '/dashboard');
        return del(`/expenses/${id}`);
    },

    // Loans
    getLoans: () => cachedGet('/loans'),
    createLoan: (data: any) => {
        invalidate('/loans', '/dashboard');
        return post('/loans', data);
    },
    updateLoan: (id: string | number, data: any) => {
        invalidate('/loans', '/dashboard');
        return patch(`/loans/${id}`, data);
    },
    deleteLoan: (id: string | number) => {
        invalidate('/loans', '/dashboard');
        return del(`/loans/${id}`);
    },
    getLoanRepayments: (id: string | number) => cachedGet(`/loans/${id}/repayments`),
    addLoanRepayment: (id: string | number, data: any) => {
        invalidate('/loans', '/dashboard');
        return post(`/loans/${id}/repayments`, data);
    },
    addLoanInterest: (id: string | number, data: any) => {
        invalidate('/loans', '/dashboard');
        return post(`/loans/${id}/repayments`, { ...data, type: 'Interest' });
    },
    updateLoanRepayment: (loanId: string | number, repaymentId: string | number, data: any) => {
        invalidate('/loans', '/dashboard');
        return patch(`/loans/${loanId}/repayments/${repaymentId}`, data);
    },
    deleteLoanRepayment: (loanId: string | number, repaymentId: string | number) => {
        invalidate('/loans', '/dashboard');
        return del(`/loans/${loanId}/repayments/${repaymentId}`);
    },
};

export { api, client };
