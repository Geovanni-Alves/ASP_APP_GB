// src/lib/api.js
// Single API client. Replaces the old "lib/supabase": every screen imports this file.
//
// Usage in screens:
//   import api from "../lib/api";
//   const { data } = await api.get("/vans");
//   await api.post("/vans", { name: "Van 1" });
//   await api.delete(`/vans/${id}`);

import axios from "axios";

const TOKEN_KEY = "asp_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

const api = axios.create({
  // Set in the dashboard .env file: VITE_API_URL=http://localhost:8080
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

// Before every request: attach the login token automatically.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// After every response: if the token is expired/invalid (401), tell the app to go back to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      setToken(null);
      window.dispatchEvent(new Event("asp:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
