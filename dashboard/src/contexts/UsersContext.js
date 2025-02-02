import { createContext, useState, useEffect, useContext } from "react";
import supabase from "../lib/supabase";
import { useAuthContext } from "./AuthContext";
import CompleteProfile from "../components/CompleteProfile";

const UsersContext = createContext({});

const UsersContextProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false); // Track if profile completion is needed
  const { session } = useAuthContext();

  useEffect(() => {
    if (session) {
      setAuthUser(session.user);
      setUserEmail(session.user.email);
    }
  }, [session]);

  const listUser = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select()
        .eq("sub", authUser?.id);

      if (error) {
        throw error;
      }

      if (data.length > 0) {
        setDbUser(data[0]); // User already exists
      } else {
        setShowCompleteProfile(true); // Show profile completion screen
      }
    } catch (error) {
      console.error("Error fetching or creating user:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (profileData) => {
    try {
      const userType =
        authUser.email === "geo-estevam@hotmail.com" ? "SuperAdmin" : "Staff";

      const { data, error } = await supabase
        .from("users")
        .insert({
          email: authUser.email,
          sub: authUser.id,
          name: profileData.name,
          phoneNumber: profileData.phoneNumber,
          address: profileData.address || null,
          userType,
          firstLogin: false, // Profile is now complete
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setDbUser(data);
      setShowCompleteProfile(false); // Hide profile completion screen
      console.log("New user created:", data);
    } catch (error) {
      console.error("Error creating user:", error.message);
    }
  };

  useEffect(() => {
    if (authUser) {
      listUser(); // Fetch or check user when authUser is set
    }
  }, [authUser]);

  const getCurrentUserData = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select()
        .eq("id", dbUser.id)
        .single();
      if (error) {
        throw error;
      }
      setCurrentUserData(data);
    } catch (error) {
      console.error("Error fetching user data:", error.message);
    }
  };

  useEffect(() => {
    if (dbUser) {
      getCurrentUserData();
    }
  }, [dbUser]);

  const getUsersData = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        throw error;
      }
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error.message);
    }
  };

  useEffect(() => {
    getUsersData();
  }, [authUser]);

  const RefreshCurrentUserData = async () => {
    await getCurrentUserData();
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        authUser,
        dbUser,
        setDbUser,
        userEmail,
        currentUserData,
        RefreshCurrentUserData,
      }}
    >
      {loading ? (
        <div>Loading...</div>
      ) : showCompleteProfile ? (
        <CompleteProfile email={authUser.email} onCreateUser={createUser} />
      ) : (
        children
      )}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;

export const useUsersContext = () => useContext(UsersContext);
