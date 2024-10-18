import { createContext, useState, useEffect, useContext } from "react";
import supabase from "../lib/supabase";
import { useAuthContext } from "./AuthContext";

const UsersContext = createContext({});

const UsersContextProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
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
      //if (data.length > 0) {
      setDbUser(data[0]);
      //}
    } catch (error) {
      console.error("Error fetching user:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      listUser(); //setDbUser
    }
  }, [authUser]);

  const getCurrentUserData = async () => {
    try {
      //console.log("dbUser", dbUser);
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
    let { data, error } = await supabase.from("users").select("*");
    if (error) {
      throw error;
    }
    setUsers(data);
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
      {children}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;

export const useUsersContext = () => useContext(UsersContext);
