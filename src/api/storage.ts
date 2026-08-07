import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'gf_token';
const EXPIRY_KEY = 'gf_token_expiry';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// ── Helpers for web (localStorage) and native (SecureStore) ──

async function storeItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function fetchItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// ── Public API ──

/** Save token + record the current timestamp as the login time. */
export const setToken = async (token: string): Promise<void> => {
  await storeItem(TOKEN_KEY, token);
  await storeItem(EXPIRY_KEY, String(Date.now()));
};

/**
 * Return the token only if it was stored within the last 7 days.
 * If the session has expired, clear stored data and return null.
 */
export const getToken = async (): Promise<string | null> => {
  const token = await fetchItem(TOKEN_KEY);
  if (!token) return null;

  const savedAt = await fetchItem(EXPIRY_KEY);
  if (!savedAt) {
    // No expiry recorded — treat as expired for safety
    await removeToken();
    return null;
  }

  const age = Date.now() - Number(savedAt);
  if (age > ONE_WEEK_MS) {
    // Session older than 7 days — force re-login
    await removeToken();
    return null;
  }

  return token;
};

/** Clear both the token and its expiry timestamp. */
export const removeToken = async (): Promise<void> => {
  await deleteItem(TOKEN_KEY);
  await deleteItem(EXPIRY_KEY);
};
