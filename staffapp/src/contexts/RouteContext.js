import { createContext, useState, useEffect, useContext } from "react";
import { useAuthContext } from "./AuthContext";
import { API } from "aws-amplify";
import {
  listRoutes,
  kidsByRouteID,
  getVan,
  getUser,
} from "../../src/graphql/queries";
import { Auth } from "aws-amplify";
import { useNavigation } from "@react-navigation/native";

const RouteContext = createContext({});

const RouteContextProvider = ({ children }) => {
  const navigation = useNavigation();
  const [routesData, setRoutesData] = useState(null);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const { dbUser, isDriver, currentUserData, userEmail } = useAuthContext();
  const [refreshing, setRefreshing] = useState(false);

  const updateRoutesData = async () => {
    setRefreshing(true); // Start refreshing indicator

    try {
      // Fetch new data and update the routesData state
      const success = await getRoutesData();
      if (success) {
        // Data fetching was successful
        setRefreshing(false); // Stop refreshing indicator
      } else {
        // Handle the case where data fetching failed
        setRefreshing(false); // Stop refreshing indicator
      }
    } catch (error) {
      console.error("Error updating data:", error);
      setRefreshing(false); // Stop refreshing indicator
    }
  };

  const getRoutesData = async () => {
    try {
      //console.log("isDriver? ", isDriver);
      const variables = {
        filter: {
          or: [
            { status: { eq: "WAITING_TO_START" } },
            { status: { eq: "IN_PROGRESS" } }, //status: { eq: "IN_PROGRESS" }, //
            { status: { eq: "PAUSED" } }, //status: { eq: "IN_PROGRESS" }, //
          ],
        },
      };

      // Fetch route data
      const responseListRoutes = await API.graphql({
        query: listRoutes,
        variables: variables,
      });
      const routeData = responseListRoutes.data.listRoutes.items;
      //console.log(routeData);

      // Fetch kids data for each route
      const mergedData = await Promise.all(
        routeData.map(async (route) => {
          const responseKidsByRouteID = await API.graphql({
            query: kidsByRouteID,
            variables: { routeID: route.id },
          });
          const kidsData = responseKidsByRouteID.data.kidsByRouteID.items;
          // fetch the van
          const responseGetVan = await API.graphql({
            query: getVan,
            variables: { id: route.routeVanId },
          });
          const vansData = responseGetVan.data.getVan;

          let driverUser = null;
          let helperUser = null;

          // Fetch the driver's user data

          if (route.driver) {
            const responseGetDriverUser = await API.graphql({
              query: getUser,
              variables: { id: route.driver },
            });
            driverUser = responseGetDriverUser.data.getUser;
          }
          // Fetch the helper's user data
          if (route.helper) {
            const responseGetHelperUser = await API.graphql({
              query: getUser,
              variables: { id: route.helper },
            });
            helperUser = responseGetHelperUser.data.getUser;
          }
          return {
            ...route,
            Kid: kidsData,
            Van: vansData,
            driverUser,
            helperUser,
          };
        })
      );
      //console.log("merged Data", mergedData);
      setRoutesData(mergedData);
      return true;
    } catch (error) {
      console.error("Error fetching data getROutesData: ", error);
    }
    return false;
  };
  //

  const callCheckStaffInRoutes = async () => {
    const isUserOnRoute = await checkStaffInRoutes();
    //console.log(isUserOnRoute);
    if (!isUserOnRoute) {
      navigation.navigate("Home");
    }
  };

  const checkStaffInRoutes = async () => {
    if (routesData) {
      const roleToCheck = isDriver ? "driver" : "helper";
      //console.log(roleToCheck);
      //console.log(routesData);
      const routeWithMatchingRole = routesData.find((item) => {
        if (item[roleToCheck] && item[roleToCheck] === dbUser?.id) {
          return true;
        }
        return false;
      });
      if (routeWithMatchingRole) {
        // Update the state variable with the route that has matching role
        setCurrentRouteData(routeWithMatchingRole);
        return true;
      } else {
        // Handle case when no matching route is found
        console.log(
          `No route found for ${roleToCheck} with user ID ${dbUser?.id}`
        );
      }
    }
    return false;
  };
  ///
  // Starting the useEffects
  ///
  useEffect(() => {
    if (dbUser && userEmail) {
      // Fetch initial data when the component mounts
      const fetchInitialData = async () => {
        await getRoutesData();
      };

      fetchInitialData();
    }
  }, [dbUser]);

  return (
    <RouteContext.Provider
      value={{
        routesData,
        updateRoutesData,
        //currentRouteData,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

export default RouteContextProvider;

export const useRouteContext = () => useContext(RouteContext);
