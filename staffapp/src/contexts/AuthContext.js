import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabase";
import { ActivityIndicator, View } from "react-native";
import Auth from "../components/Auth";
import CustomLoading from "../components/CustomLoading";

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        setSession(data.session);
        supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        logout,
      }}
    >
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <CustomLoading imageSize={40} showContainer={false} />
          {/* <ActivityIndicator size="large" color="#0000ff" /> */}
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

export const useAuthContext = () => useContext(AuthContext);
