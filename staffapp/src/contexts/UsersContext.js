import { createContext, useState, useEffect, useContext } from "react";
import { View } from "react-native";
import { supabase } from "../lib/supabase";
import { usePushNotificationsContext } from "./PushNotificationsContext";
import { useAuthContext } from "./AuthContext";
import CustomLoading from "../components/CustomLoading";

const UsersContext = createContext({});

const UsersContextProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuthContext();
  const { fcmToken, expoToken, deviceType } = usePushNotificationsContext();

  useEffect(() => {
    if (session) {
      setAuthUser(session.user);
      setUserEmail(session.user.email);
    }
  }, [session]);

  // const updatePushToken = async (id, updatedPushToken) => {
  //   console.log({ updatePushToken });
  //   try {
  //     const { data, error } = await supabase
  //       .from("users")
  //       .update({ pushToken: updatedPushToken })
  //       .eq("id", id)
  //       .select();

  //     if (error) {
  //       throw error;
  //     }

  //     console.log("Push token updated successfully:");
  //   } catch (error) {
  //     console.log("Error updating push token:", error);
  //   }
  // };

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

  // useEffect(() => {
  //   console.log({ expoToken, fcmToken, deviceType });
  //   // const checkPushToken = async () => {
  //   //   if (currentUserData && pushToken) {
  //   //     const actualPushToken = currentUserData.pushToken;
  //   //     if (actualPushToken !== pushToken.data || actualPushToken === null) {
  //   //       await updatePushToken(currentUserData.id, pushToken.data);
  //   //     }
  //   //   }
  //   // };
  //   // checkPushToken();
  // }, [expoToken, fcmToken]);

  useEffect(() => {
    const updateTokensIfNeeded = async () => {
      // current tokens from Db Users Table
      const currentIosToken = currentUserData.pushToken;
      const currentAndroidToken = currentUserData.fcmToken;

      // console.log({ currentAndroidToken, currentIosToken });

      if (!currentUserData) return;

      const updates = {};

      // iOS Expo token
      if (expoToken && currentIosToken !== expoToken) {
        updates.pushToken = expoToken;
      }

      // Android FCM token
      if (fcmToken && currentAndroidToken !== fcmToken) {
        updates.fcmToken = fcmToken;
      }

      if (Object.keys(updates).length === 0) return;

      console.log("🔄 Updating tokens:", updates);

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", currentUserData.id);

      if (error) {
        console.log("❌ Token update failed:", error);
      } else {
        console.log("✅ Tokens updated!");
        getCurrentUserData();
      }
    };

    updateTokensIfNeeded();
  }, []);

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
      {loading ? ( // Show loading indicator while loading
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {/* <ActivityIndicator size="large" color="#0000ff" /> */}
          <CustomLoading imageSize={40} showContainer={false} />
        </View>
      ) : (
        children
      )}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;

export const useUsersContext = () => useContext(UsersContext);
