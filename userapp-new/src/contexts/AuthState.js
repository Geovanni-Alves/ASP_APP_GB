// src/contexts/AuthState.js
// Only the "channel" of the login: the context and the hook that reads it. It lives in its own file so
// that the login screen (Auth.js) and the provider (AuthContext.js) do not import each other.
import { createContext, useContext } from "react";

export const AuthContext = createContext({});

export const useAuthContext = () => useContext(AuthContext);
