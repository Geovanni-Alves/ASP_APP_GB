// src/contexts/UsersContext.js
import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { View, Text } from "react-native";
import { Button } from "react-native-paper";
import api from "../lib/api";
import { useAuthContext } from "./AuthContext";
import CustomLoading from "../components/CustomLoading";

const UsersContext = createContext({});

const UsersContextProvider = ({ children }) => {
  const { session, logout } = useAuthContext();

  // The old app had two records for a person (the login user and the row of the "users" table).
  // Now there is one: both names point to the same profile, so the screens do not change.
  const [dbUser, setDbUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [users, setUsers] = useState([]); // the list of people (chat) comes in a later step
  const [loading, setLoading] = useState(true);

  const getCurrentUserData = useCallback(async () => {
    try {
      const { data } = await api.get("/users/me");
      setCurrentUserData(data);
      setDbUser(data);
      return data;
    } catch (error) {
      console.error(
        "Error fetching user data:",
        error?.response?.data || error.message,
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) getCurrentUserData();
  }, [session, getCurrentUserData]);

  // Push tokens (iOS and Android) are sent to the API in a later step.

  const RefreshCurrentUserData = async () => {
    await getCurrentUserData();
  };

  const isDriver = (currentUserData?.userType || "").toLowerCase() === "driver";

  return (
    <UsersContext.Provider
      value={{
        users,
        authUser: session?.user ?? null,
        dbUser,
        setDbUser,
        userEmail: session?.user?.email ?? null,
        currentUserData,
        RefreshCurrentUserData,
        isDriver,
      }}
    >
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <CustomLoading imageSize={40} showContainer={false} />
        </View>
      ) : !dbUser ? (
        // The profile did not load (no connection?): do not show the app without it
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text style={{ marginBottom: 16, textAlign: "center" }}>
            We could not load your profile.
          </Text>
          <Button mode="contained" onPress={getCurrentUserData}>
            Try again
          </Button>
          <Button onPress={logout} style={{ marginTop: 8 }}>
            Sign out
          </Button>
        </View>
      ) : (
        children
      )}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;

export const useUsersContext = () => useContext(UsersContext);
