// src/lib/api.js
// The ONE place that talks to our API (it replaces src/lib/supabase.js).
// Usage in any screen or context:
//   import api from "../lib/api";
//   const { data } = await api.get("/users/me");
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "asp.staff.token";

// The address of the API. It comes from the .env file of the app (EXPO_PUBLIC_API_URL).
// A phone cannot use "localhost" (that would be the phone itself), so for tests the address is
// the one of a tunnel that points to the API running on the computer.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

/* ---------- the login token ---------- */
// Kept in memory (fast) and in AsyncStorage (so the person stays signed in after closing the app)
let memoryToken = null;

export async function loadToken() {
  memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  return memoryToken;
}

export async function saveToken(token) {
  memoryToken = token || null;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export const getToken = () => memoryToken;

// Every request carries the token
api.interceptors.request.use((config) => {
  if (memoryToken) config.headers.Authorization = `Bearer ${memoryToken}`;
  return config;
});

/* ---------- expired or invalid token ---------- */
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    // A wrong password also answers 401: only a token that stopped working signs the person out
    if (status === 401 && memoryToken && !url.startsWith("/auth/")) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/* ---------- a message a person can understand ---------- */
export function errorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  if (!error?.response) {
    return "Cannot reach the server. Check your internet connection.";
  }
  const { code, error: message } = error.response.data || {};
  if (code === "app_not_allowed") return "This account cannot use the staff app.";
  if (code === "account_disabled")
    return "This account is deactivated. Please contact your manager.";
  if (error.response.status === 401) return "Wrong email or password.";
  return message || fallback;
}

export default api;
