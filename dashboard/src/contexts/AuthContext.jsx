import { createContext, useState, useEffect, useContext } from "react";
import supabase from "../lib/supabase"; // Import Supabase client
import Auth from "../components/Auth/Auth"; // Login form component

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(data.session);

        // Listen for auth state changes
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
        <div>Loading...</div> // You can add a loading spinner here
      ) : session ? (
        children // Render children if authenticated
      ) : (
        <Auth /> // Render the login form if not authenticated
      )}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

export const useAuthContext = () => useContext(AuthContext);
