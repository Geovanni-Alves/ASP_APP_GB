// src/contexts/AuthContext.js
import { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import api, { loadToken, saveToken, setUnauthorizedHandler } from "../lib/api";
import Auth from "../components/Auth";
import { AuthContext, useAuthContext } from "./AuthState";
import { getPushToken } from "../lib/pushToken";
import CustomLoading from "../components/CustomLoading";

const AuthContextProvider = ({ children }) => {
  // "session" keeps the shape the other contexts already use: session.user.id, session.user.email...
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    // This phone stops receiving the pushes of this person (before the session ends)
    try {
      const pushToken = getPushToken();
      if (pushToken) {
        await api.delete("/push/register", { data: { token: pushToken } });
      }
    } catch (error) {
      // no connection, or the session is already invalid: signing out goes on
    }
    await saveToken(null);
    setSession(null);
  }, []);

  // Stores the token and opens the session. "data" is the answer of the API: { token, user }
  const startSession = async (data) => {
    await saveToken(data.token);
    setSession({ access_token: data.token, user: data.user });
    return data.user;
  };

  // "app: staff" tells the API which app is signing in: staff, drivers and managers may use it
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", {
      email: email.trim(),
      password,
      app: "staff",
    });
    return startSession(data);
  };

  // The person got an invite by e-mail: sets the password and signs in
  const acceptInvite = async (email, code, password) => {
    const { data } = await api.post("/auth/accept-invite", {
      email: email.trim(),
      code: code.trim(),
      password,
      app: "staff",
    });
    return startSession(data);
  };

  useEffect(() => {
    // If any screen gets a 401 (token expired), go back to the login screen
    setUnauthorizedHandler(logout);

    // When the app opens: if a token is stored, check that it still works
    const restoreSession = async () => {
      try {
        const token = await loadToken();
        if (!token) return;
        const { data } = await api.get("/auth/me");
        setSession({ access_token: token, user: data });

        // Renews the session: another 30 days from today. The person only types the password again after
        // 30 days without opening the app. If it fails (no connection, an older API), the token that works stays.
        try {
          const { data: renewed } = await api.post("/auth/refresh", {
            app: "staff",
          });
          await saveToken(renewed.token);
          setSession({ access_token: renewed.token, user: renewed.user });
        } catch (error) {
          console.log("Could not renew the session:", error.message);
        }
      } catch (error) {
        console.log("Could not restore the session:", error.message);
        // Only a rejected token is thrown away; with no connection it stays for the next try
        if (error.response?.status === 401) await saveToken(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        session,
        login,
        acceptInvite,
        logout,
      }}
    >
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <CustomLoading imageSize={40} showContainer={false} />
        </View>
      ) : session ? (
        children
      ) : (
        <Auth />
      )}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

// The hook lives in AuthState.js; it is also exported from here, so the files that already import it
// from this file keep working
export { useAuthContext };
