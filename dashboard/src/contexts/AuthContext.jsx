import { createContext, useState, useEffect, useContext, useCallback } from "react";
import api, { getToken, setToken } from "../lib/api";
import Auth from "../components/Auth/Auth"; // Login form component

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  // "session" keeps the same shape as before: session.user.id, session.user.email...
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
  }, []);

  // Called by the login form
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setSession({ access_token: data.token, user: data.user });
    return data.user;
  };

  useEffect(() => {
    // On app start: if a token is already stored, check that it is still valid.
    const restoreSession = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setSession({ access_token: getToken(), user: data });
      } catch (error) {
        setToken(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();

    // If the API answers 401 on any screen, go back to the login form.
    window.addEventListener("asp:unauthorized", logout);
    return () => window.removeEventListener("asp:unauthorized", logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        session,
        login,
        logout,
      }}
    >
      {loading ? (
        <div>Loading...</div> // You can add a loading spinner here
      ) : session ? (
        children // Render children if authenticated
      ) : (
        <Auth onLogin={login} /> // Render the login form if not authenticated
      )}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

export const useAuthContext = () => useContext(AuthContext);
