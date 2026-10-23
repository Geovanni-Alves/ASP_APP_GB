// src/lib/api.js
// The ONE place of the app that talks to our API.
// Usage in any screen or context:
//   import api from "../lib/api";
//   const { data } = await api.get("/users/me");
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const TOKEN_KEY = "asp.parent.token";

// The address of the API:
//  1. EXPO_PUBLIC_API_URL in the .env file, when it is set (for example the address of a tunnel);
//  2. otherwise the computer that serves the app (Metro), on port 8080. The phone already knows that
//     computer, because the app itself is loaded from it.
function findApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const metroHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (metroHost) return `http://${metroHost}:8080`;

  return "http://localhost:8080";
}

export const API_URL = findApiUrl();
console.log("API address:", API_URL);

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
  if (code === "app_not_allowed") {
    return "This account cannot use the parents app.";
  }
  if (code === "account_disabled") {
    return "This account is deactivated. Please contact the program.";
  }
  if (error.response.status === 401) return "Wrong email or password.";
  return message || fallback;
}

/* ---------- photos and videos ---------- */
// A temporary link to a photo or a video. The API answers with a path ("/files/...?exp=...&sig=...");
// the link is complete once the address of the API is put in front of it. A family only gets a link for
// what belongs to its own children (the API checks it).
export async function getSignedUrl(bucket, path, expires = 3600) {
  const { data } = await api.get("/parent/files/signed-url", {
    params: { bucket, path, expires },
  });
  return `${API_URL}${data.signedUrl}`;
}

export default api;
