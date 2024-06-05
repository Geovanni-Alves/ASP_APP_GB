import { createContext, useState, useEffect, useContext } from "react";
import { ActivityIndicator } from "react-native";
import { supabase } from "../../backend/lib/supabase";
import { usePushNotificationsContext } from "./PushNotificationsContext";
import { useAuthContext } from "./AuthContext";

const UsersContext = createContext({});

const UsersContextProvider = ({ children }) => {
  const { session } = useAuthContext();
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const { expoPushToken } = usePushNotificationsContext();

  useEffect(() => {
    if (session) {
      setAuthUser(session.user);
      setUserEmail(session.user.email);
    }
  }, [session]);

  const updatePushToken = async (id, updatedPushToken) => {
    //console.log("pushToken", expoPushToken);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ pushToken: updatedPushToken })
        .eq("id", id);

      if (error) {
        throw error;
      }

      console.log("Push token updated successfully:", data);
    } catch (error) {
      console.log("Error updating push token:", error);
    }
  };

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
    }
  };

  useEffect(() => {
    if (authUser) {
      //console.log("authUser", authUser);
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

  useEffect(() => {
    const checkPushToken = async () => {
      if (currentUserData) {
        if (currentUserData.pushToken) {
          const actualPushToken = currentUserData.pushToken;
          if (
            actualPushToken !== expoPushToken.data ||
            actualPushToken === null
          ) {
            await updatePushToken(currentUserData.id, expoPushToken.data);
          }
        }
      }
    };
    checkPushToken();
  }, [currentUserData]);

  // useEffect(() => {
  //   console.log(dbUser);
  //   if (authUser && dbUser && userEmail && currentUserData) {
  //     setLoading(false);
  //   }
  // });

  return (
    <UsersContext.Provider
      value={{
        authUser,
        dbUser,
        setDbUser,
        userEmail,
        currentUserData,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

// {loading ? (
//   // Render a loading indicator while the context is loading
//   <ActivityIndicator />
// ) : (
//   // Render children when context has finished loading
//   children
// )}

export default UsersContextProvider;

export const useUsersContext = () => useContext(UsersContext);
