import { createContext, useState, useEffect, useContext } from "react";
import { useUsersContext } from "./UsersContext";
import { supabase } from "../lib/supabase";

const RoutesContext = createContext({});

export const RoutesContextProvider = ({ children, routeType = "pickup" }) => {
  const { dbUser, isDriver, userEmail } = useUsersContext();

  const [routesData, setRoutesData] = useState([]);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------
  // FETCH ALL ROUTES + VANS + DRIVERS + HELPERS
  // ----------------------------------------------------
  const getRoutesData = async () => {
    try {
      const { data: routes, error } = await supabase
        .from("routes")
        .select("*")
        .eq("type", routeType)
        .in("status", [
          "waiting_to_start",
          "in_progress",
          "paused",
          "planning",
          "open",
        ]);

      if (error) throw error;

      // Fetch vans + driver + helpers + van details for each route
      const merged = await Promise.all(
        routes.map(async (route) => {
          const { data: routeVans, error: vansErr } = await supabase
            .from("route_vans")
            .select("*")
            .eq("route_id", route.id);

          if (vansErr) throw vansErr;

          const vansWithDetails = await Promise.all(
            routeVans.map(async (rv) => {
              // Fetch van details
              const { data: vanDetails } = await supabase
                .from("vans")
                .select("*")
                .eq("id", rv.van_id)
                .single();

              // Fetch driver
              const driverUser =
                rv.driver_id &&
                (
                  await supabase
                    .from("users")
                    .select("*")
                    .eq("id", rv.driver_id)
                    .single()
                ).data;

              // Fetch helpers
              const helperUsers = rv.helper_ids?.length
                ? (
                    await supabase
                      .from("users")
                      .select("*")
                      .in("id", rv.helper_ids)
                  ).data
                : [];

              // -------------------------------------------------------
              //  🆕  FETCH STOPS (kids + schools)
              // -------------------------------------------------------
              const { data: stopsRaw } = await supabase
                .from("route_stops")
                .select("*")
                .eq("route_van_id", rv.id)
                .order("stop_order", { ascending: true });

              const stops = await Promise.all(
                (stopsRaw || []).map(async (stop) => {
                  // fetch kid
                  const { data: kid } = await supabase
                    .from("students")
                    .select("*")
                    .eq("id", stop.student_id)
                    .single();

                  // fetch school
                  const { data: school } = await supabase
                    .from("schools")
                    .select("*")
                    .eq("id", kid.schoolId)
                    .single();

                  return {
                    ...stop,
                    kid,
                    school,
                  };
                })
              );

              return {
                ...rv,
                van: vanDetails || null, // adiciona os dados completos da van
                driverUser: driverUser || null,
                helperUsers: helperUsers || [],
                stops,
              };
            })
          );

          return {
            ...route,
            vans: vansWithDetails,
          };
        })
      );

      setRoutesData(merged);
      return merged;
    } catch (err) {
      console.error("❌ Error fetching routes:", err);
      return [];
    }
  };

  // ----------------------------------------------------
  // Refresh wrapper
  // ----------------------------------------------------
  const updateRoutesData = async () => {
    setRefreshing(true);
    const res = await getRoutesData();
    setRefreshing(false);
    return res;
  };

  // ----------------------------------------------------
  // CHECK IF CURRENT USER IS ASSIGNED TO ANY ROUTE
  // ----------------------------------------------------
  const checkStaffInRoutes = (allRoutes = routesData) => {
    if (!dbUser || !allRoutes.length) return false;

    const route = allRoutes.find((route) =>
      route.vans.some((van) =>
        isDriver
          ? van.driver_id === dbUser.id
          : van.helper_ids?.includes(dbUser.id)
      )
    );

    setCurrentRouteData(route || null);
    return Boolean(route);
  };

  // ----------------------------------------------------
  // FIRST LOAD
  // ----------------------------------------------------
  useEffect(() => {
    if (!dbUser || !userEmail) return;

    const load = async () => {
      setLoading(true);
      const loaded = await getRoutesData();
      checkStaffInRoutes(loaded);
      setLoading(false);
    };

    load();
  }, [dbUser, userEmail]);

  return (
    <RoutesContext.Provider
      value={{
        routesData,
        currentRouteData,
        refreshRoutes: updateRoutesData,
        refreshing,
        loading,
        checkStaffInRoutes,
      }}
    >
      {children}
    </RoutesContext.Provider>
  );
};

export default RoutesContextProvider;

export const useRoutesContext = () => useContext(RoutesContext);
