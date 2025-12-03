import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabase";
import { useUsersContext } from "./UsersContext";

const RoutesContext = createContext({});

export const RoutesContextProvider = ({ children, routeType = null }) => {
  const { dbUser } = useUsersContext();

  const [routesData, setRoutesData] = useState([]);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------------------------------
  // UNIVERSAL: Fetch routes (pickup OR dropoff OR both)
  // -----------------------------------------------------
  const getRoutesData = async () => {
    try {
      setLoading(true);

      // 1) Load all routes we care about
      let query = supabase.from("routes").select("*");

      if (routeType) {
        // if staff app asks for only pickup or dropoff
        query = query.eq("type", routeType);
      }

      // load routes that are actively relevant
      query = query.in("status", [
        "waiting_to_start",
        "in_progress",
        "planning",
        "open",
        "paused",
      ]);

      const { data: routes, error } = await query;

      if (error) throw error;

      // 2) Load vans, kids, attendance
      const enriched = await Promise.all(
        routes.map(async (route) => {
          const { data: vansRaw } = await supabase
            .from("route_vans")
            .select("*")
            .eq("route_id", route.id);

          const vans = await Promise.all(
            vansRaw.map(async (rv) => {
              // van details
              const { data: vanDetails } = await supabase
                .from("vans")
                .select("*")
                .eq("id", rv.van_id)
                .single();

              // driver
              let driverUser = null;
              if (rv.driver_id) {
                const { data } = await supabase
                  .from("users")
                  .select("*")
                  .eq("id", rv.driver_id)
                  .single();
                driverUser = data;
              }

              // helpers
              const helperUsers = rv.helper_ids?.length
                ? (
                    await supabase
                      .from("users")
                      .select("*")
                      .in("id", rv.helper_ids)
                  ).data
                : [];

              // stops
              const { data: stops } = await supabase
                .from("route_stops")
                .select("*")
                .eq("route_van_id", rv.id)
                .order("stop_order", { ascending: true });

              const studentIds = stops.map((s) => s.student_id);

              // students
              const { data: kidsRaw } = await supabase
                .from("students")
                .select("*")
                .in("id", studentIds);

              // schools
              const schoolIds = kidsRaw.map((k) => k.schoolId);
              const { data: schoolsRaw } = await supabase
                .from("schools")
                .select("*")
                .in("id", schoolIds);

              const schools = {};
              schoolsRaw.forEach((s) => (schools[s.id] = s));

              // attendance
              const { data: attendanceRaw } = await supabase
                .from("student_attendance")
                .select("*")
                .eq("date", route.date)
                .in("student_id", studentIds);

              // console.log(attendanceRaw);
              // console.log(route);

              const attendance = {};
              attendanceRaw?.forEach((a) => (attendance[a.student_id] = a));

              // assemble kids[]
              const kids = stops.map((stop) => {
                const kid = kidsRaw.find((k) => k.id === stop.student_id);
                return {
                  stopId: stop.id,
                  responsible_staff_id: stop.responsible_staff_id,
                  kid,
                  school: schools[kid.schoolId],
                  attendance: attendance[kid.id] || null,
                };
              });

              return {
                ...rv,
                van: vanDetails,
                driverUser,
                helperUsers,
                kids,
              };
            })
          );

          return {
            ...route,
            vans,
          };
        })
      );

      setRoutesData(enriched);

      // check if current user has a route
      const mine = enriched.find((route) =>
        route.vans.some(
          (v) =>
            v.driver_id === dbUser?.id || v.helper_ids?.includes(dbUser?.id)
        )
      );

      setCurrentRouteData(mine || null);

      return enriched;
    } catch (err) {
      console.error("❌ getRoutesData:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const refreshRoutes = async () => {
    setRefreshing(true);
    await getRoutesData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!dbUser) return;
    getRoutesData();
  }, [dbUser, routeType]);

  return (
    <RoutesContext.Provider
      value={{
        routesData,
        currentRouteData,
        loading,
        refreshing,
        refreshRoutes,
      }}
    >
      {children}
    </RoutesContext.Provider>
  );
};

export default RoutesContextProvider;

export const useRoutesContext = () => useContext(RoutesContext);
