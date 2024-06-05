import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../../backend/lib/supabase";
import { ActivityIndicator } from "react-native-paper";

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    fetchSession();
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
      }}
    >
      {loading ? <ActivityIndicator /> : children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

export const useAuthContext = () => useContext(AuthContext);
