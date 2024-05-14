import { createContext, useState, useEffect, useContext } from "react";
import { ActivityIndicator } from "react-native";
import { Auth } from "aws-amplify";
import { API } from "aws-amplify";
import { listUsers, getUser } from "../graphql/queries";
import { usePushNotificationsContext } from "./PushNotificationsContext";
import { usePicturesContext } from "./PicturesContext";
import { updateUser } from "../graphql/mutations";
//import { useNavigation } from "@react-navigation/native";

const AuthContext = createContext({});

const AuthContextProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const sub = authUser?.attributes?.sub;
  const [userEmail, setUserEmail] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState(null);
  const { expoPushToken } = usePushNotificationsContext();
  const { getPhotoInBucket } = usePicturesContext();
  //const navigation = useNavigation();

  useEffect(() => {
    Auth.currentAuthenticatedUser({ bypassCache: true })
      .then((user) => {
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
    const response = getUserBySub.data.listUsers.items[0];
    setDbUser(response);
    setLoading(false);
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
    }
  };

  const getCurrentUserData = async () => {
    // get current user data and check the expoPushToken
    const responseGetUser = await API.graphql({
      query: getUser,
      variables: { id: dbUser.id },
    });

    const userData = responseGetUser.data.getUser;
    //console.log(userData);

    const uriUser = await getPhotoInBucket(userData.photo);
    setCurrentUserData({ ...userData, uriUser });
    console.log("expoPushToken", expoPushToken);

    if (expoPushToken) {
      const actualPushToken = responseGetUser.data.getUser.pushToken;
      //console.log("actualPushToken", actualPushToken);
      if (actualPushToken !== expoPushToken.data || actualPushToken === null) {
        await updatePushToken(
          responseGetUser.data.getUser.id,
          expoPushToken.data
        );
      }
    }
    //setCurrentUserData(responseGetUser.data.getUser);
  };

  // const fetchKidsData = async (userEmail) => {
  //   if (userEmail) {
  //     try {
  //       const variables = {
  //         filter: {
  //           or: [
  //             { parent1Email: { eq: userEmail } },
  //             { parent2Email: { eq: userEmail } },
  //           ],
  //         },
  //       };
  //       const response = await API.graphql({
  //         query: listKids,
  //         variables: variables,
  //       });
  //       const fetchedKids = response.data.listKids.items;
  //       //console.log("fetchedKids", fetchedKids);

  //       if (fetchedKids.length === 0) {
  //         //navigation.navigate("Wait");
  //         //await Auth.signOut();
  //       } else {
  //         const completeKids = await Promise.all(
  //           fetchedKids.map(async (kid) => {
  //             if (kid.currentStateId) {
  //               //console.log(kid.currentStateId);
  //               const currentStateData = await API.graphql({
  //                 query: getCheckInOut,
  //                 variables: { id: kid.currentStateId },
  //               });

  //               kid.CurrentState = currentStateData.data.getCheckInOut;
  //             }
  //             if (kid.photo) {
  //               const uriKid = await getPhotoInBucket(kid.photo);
  //               return { ...kid, uriKid };
  //             } else {
  //               return kid;
  //             }
  //           })
  //         );
  //         //console.log("completeKids", completeKids);
  //         // Set the kids state if there is data
  //         setKids(completeKids);
  //       }
  //       // setKids(response.data.listKids.items);
  //     } catch (error) {
  //       console.error("Error fetching kids:", error);
  //     } finally {
  //       //setLoading(false);
  //     }
  //   }
  // };

  useEffect(() => {
    if (!sub) {
      return;
    }
    listUserFromQl();
  }, [sub]);

  useEffect(() => {
    //console.log(dbUser);
    if (dbUser) {
      getCurrentUserData();
    }
  }, [dbUser]);

  // useEffect(() => {
  //   fetchKidsData(userEmail);
  //   //console.log(isEmailVerified);
  // }, [userEmail]);

  const getUsersData = async () => {
    const getAllUsers = await API.graphql({
      query: listUsers,
    });
    const response = getAllUsers.data.listUsers.items;
    setUsers(response);
  };

  useEffect(() => {
    getUsersData();
  }, [sub]);

  // Check if all necessary data has been fetched, then set loading to false
  useEffect(() => {
    if (authUser && dbUser && userEmail && currentUserData && users) {
      setLoading(false);
    }
  }, [authUser, dbUser, userEmail, currentUserData, users]);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        dbUser,
        setDbUser,
        sub,
        userEmail,
        loading,
        currentUserData,
        users,
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
