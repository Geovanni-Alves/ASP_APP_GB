import { createContext, useState, useEffect, useContext } from "react";
import { Auth } from "aws-amplify";
import { API } from "aws-amplify";
import { updateUser } from "../graphql/mutations";
import { listUsers, getUser } from "../graphql/queries";
import { usePicturesContext } from "./PicturesContext";
import { usePushNotificationsContext } from "./PushNotificationsContext";
import { ActivityIndicator } from "react-native";

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null); //authUser?.attributes?.email
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState(null);
  const { getPhotoInBucket } = usePicturesContext();
  const { expoPushToken } = usePushNotificationsContext();
  const sub = authUser?.attributes?.sub;

  useEffect(() => {
    Auth.currentAuthenticatedUser({ bypassCache: true })
      .then((user) => {
        //console.log("execute the authUser");
        setAuthUser(user);
        setUserEmail(user.attributes.email);
      })
      .catch((error) => {
        console.error("Error fetching authenticated user:", error);
      });
  }, []);

  const listUserFromQl = async () => {
    const getUserBySub = await API.graphql({
      query: listUsers,
      variables: { filter: { sub: { eq: sub } } },
    });
    const response = getUserBySub.data.listUsers.items;
    if (response.length > 0) {
      const userResponse = response[0];

      // if (userResponse.userType === "DRIVER") {
      //   setIsDriver(true);
      // }
      setDbUser(userResponse);
      setLoading(false);
    }
  };

  const updatePushToken = async (id, updatedPushToken) => {
    try {
      const userDetails = {
        id: id,
        pushToken: updatedPushToken,
      };
      const updatedUser = await API.graphql({
        query: updateUser,
        variables: { input: userDetails },
      });
    } catch (error) {
      console.log("error updating token", error);
    } finally {
      console.log("push token updated successfully!!");
    }
  };

  const getCurrentUserData = async () => {
    const responseGetUser = await API.graphql({
      query: getUser,
      variables: { id: dbUser.id },
    });
    const user = responseGetUser.data.getUser;

    if (expoPushToken) {
      console.log("Push Token", expoPushToken);
      const actualPushToken = user.pushToken;
      if (actualPushToken !== expoPushToken.data || actualPushToken === null) {
        await updatePushToken(
          responseGetUser.data.getUser.id,
          expoPushToken.data
        );
      }
    }

    const uriUser = await getPhotoInBucket(user.photo);
    const userWithPhotos = { ...user, uriUser };

    setCurrentUserData(userWithPhotos);
  };

  useEffect(() => {
    if (!sub) {
      return;
    }
    listUserFromQl();
  }, [sub]);

  useEffect(() => {
    if (!dbUser) {
      return;
    }
    getCurrentUserData();
  }, [dbUser]);

  // Check if all necessary data has been fetched, then set loading to false
  useEffect(() => {
    if (authUser && dbUser && userEmail && currentUserData) {
      setLoading(false);
    }
  }, [authUser, dbUser, userEmail, currentUserData]);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        dbUser,
        sub,
        setDbUser,
        userEmail,
        loading,
        currentUserData,
      }}
    >
      {loading ? (
        // Render a loading indicator while the context is loading
        <ActivityIndicator />
      ) : (
        // Render children when context has finished loading
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

export const useAuthContext = () => useContext(AuthContext);
