import { createContext, useState, useEffect, useContext } from "react";
import { useUsersContext } from "./UsersContext";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";

const RouteContext = createContext({});

const RouteContextProvider = ({ children }) => {
  const navigation = useNavigation();
  const [routesData, setRoutesData] = useState(null);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const { dbUser, isDriver, currentUserData, userEmail } = useUsersContext();
  const [refreshing, setRefreshing] = useState(false);

  const updateRoutesData = async () => {
    setRefreshing(true); // Start refreshing indicator

    try {
      // Fetch new data and update the routesData state
      const success = await getRoutesData();
      setRefreshing(!success); // Stop refreshing indicator based on success
    } catch (error) {
      console.error("Error updating data:", error);
      setRefreshing(false); // Stop refreshing indicator
    }
  };

  const fetchParentsInfoForKid = async (kid) => {
    try {
      if (kid.parent1Id) {
        const { data: parent1Data, error: parent1Error } = await supabase
          .from("users")
          .select("*")
          .eq("id", kid.parent1Id)
          .single();

        if (parent1Error) throw parent1Error;
        kid.Parent1 = parent1Data;
      }

      if (kid.parent2Id) {
        const { data: parent2Data, error: parent2Error } = await supabase
          .from("users")
          .select("*")
          .eq("id", kid.parent2Id)
          .single();

        if (parent2Error) throw parent2Error;
        kid.Parent2 = parent2Data;
      }
    } catch (error) {
      console.error("Error fetching parents info for kid:", error);
    }
  };

  const getRoutesData = async () => {
    try {
      const { data: routeData, error: routeError } = await supabase
        .from("route")
        .select("*")
        .or(
          "status.eq.WAITING_TO_START,status.eq.IN_PROGRESS,status.eq.PAUSED"
        );

      if (routeError) throw routeError;

      const mergedData = await Promise.all(
        routeData.map(async (route) => {
          const { data: studentsData, error: kidsError } = await supabase
            .from("students")
            .select("*")
            .eq("routeId", route.id);

          if (kidsError) throw kidsError;

          // Fetch parents info for each kid
          await Promise.all(studentsData.map(fetchParentsInfoForKid));

          const { data: vansData, error: vanError } = await supabase
            .from("vans")
            .select("*")
            .eq("id", route.vanId)
            .single();

          if (vanError) throw vanError;

          let driverUser = null;
          let helperUser = null;

          if (route.driver) {
            const { data: driverData, error: driverError } = await supabase
              .from("users")
              .select("*")
              .eq("id", route.driver)
              .single();

            if (driverError) throw driverError;
            driverUser = driverData;
          }

          if (route.helper) {
            const { data: helperData, error: helperError } = await supabase
              .from("users")
              .select("*")
              .eq("id", route.helper)
              .single();

            if (helperError) throw helperError;
            helperUser = helperData;
          }

          return {
            ...route,
            Kid: studentsData,
            Van: vansData,
            driverUser,
            helperUser,
          };
        })
      );

      setRoutesData(mergedData);
      return true;
    } catch (error) {
      console.error("Error fetching data getRoutesData:", error);
      return false;
    }
  };

  const callCheckStaffInRoutes = async () => {
    const isUserOnRoute = await checkStaffInRoutes();
    if (!isUserOnRoute) {
      navigation.navigate("Home");
    }
  };

  const checkStaffInRoutes = async () => {
    if (routesData) {
      const roleToCheck = isDriver ? "driver" : "helper";
      const routeWithMatchingRole = routesData.find(
        (item) => item[roleToCheck] && item[roleToCheck] === dbUser?.id
      );
      if (routeWithMatchingRole) {
        setCurrentRouteData(routeWithMatchingRole);
        return true;
      } else {
        console.log(
          `No route found for ${roleToCheck} with user ID ${dbUser?.id}`
        );
      }
    }
    return false;
  };

  useEffect(() => {
    if (dbUser && userEmail) {
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
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

export default RouteContextProvider;

export const useRouteContext = () => useContext(RouteContext);
