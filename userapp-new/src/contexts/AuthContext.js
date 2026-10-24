// src/contexts/AuthContext.js
import { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import api, { loadToken, saveToken, setUnauthorizedHandler } from "../lib/api";
import Auth from "../components/Auth";
import { AuthContext, useAuthContext } from "./AuthState";
import { getPushToken } from "../lib/pushToken";
import CustomLoading from "../components/CustomLoading";

// "app: parent" tells the API which app is signing in: only the parents (the families) may use this one
const APP = "parent";

const AuthContextProvider = ({ children }) => {
  // session.user is what the API says about the person: id, name, email...
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

  // "beforeStart" (optional): something to do (and wait for) after the API said yes and BEFORE the app opens,
  // for example the sun of the login jumping of joy
  const login = async (email, password, beforeStart) => {
    const { data } = await api.post("/auth/login", {
      email: email.trim(),
      password,
      app: APP,
    });
    if (beforeStart) await beforeStart();
    return startSession(data);
  };

  // The family got an invite by e-mail: sets the password and signs in
  const acceptInvite = async (email, code, password, beforeStart) => {
    const { data } = await api.post("/auth/accept-invite", {
      email: email.trim(),
      code: code.trim(),
      password,
      app: APP,
    });
    if (beforeStart) await beforeStart();
    return startSession(data);
  };

  // "I forgot my password": the API e-mails a code of 6 digits (it always answers the same, so nobody can find
  // out which e-mails have an account)
  const requestPasswordReset = async (email) => {
    await api.post("/auth/forgot-password", { email: email.trim(), app: APP });
  };

  // The code + a new password: when it is right the person is signed in
  const resetPassword = async (email, code, password, beforeStart) => {
    const { data } = await api.post("/auth/reset-password", {
      email: email.trim(),
      code: code.trim(),
      password,
      app: APP,
    });
    if (beforeStart) await beforeStart();
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
        // 30 days without opening the app. If it fails (no connection), the token that works stays.
        try {
          const { data: renewed } = await api.post("/auth/refresh", {
            app: APP,
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
        requestPasswordReset,
        resetPassword,
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

// The hook lives in AuthState.js; it is also exported from here
export { useAuthContext };
