// src/contexts/RoutesContext.js
import { createContext, useState, useEffect, useContext, useRef } from "react";
import api, { getActAs } from "../lib/api";
import { useUsersContext } from "./UsersContext";
import { onRoutePush } from "../lib/pushEvents";

const RoutesContext = createContext({});

export const RoutesContextProvider = ({ children, routeType = null }) => {
  const { dbUser } = useUsersContext();

  const [routesData, setRoutesData] = useState([]);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoad = useRef(true);

  // -----------------------------------------------------
  // Fetch my routes (pickup OR dropoff OR both)
  // -----------------------------------------------------
  // ONE request. The API only returns the routes the manager SENT to me, and inside each route only
  // my van(s), with everything a screen needs. Every route has this shape (the same as before):
  //   { ...route, vans: [ { ...route_van, van, driverUser, helperUsers,
  //                         kids: [ { stopId, responsible_staff_id, kid, school, attendance } ] } ] }
  const getRoutesData = async () => {
    try {
      // The spinner of the WHOLE screen is only for the first load: a refresh never hides the screen
      // (it used to, and that made the pull-to-refresh of the lists disappear)
      if (firstLoad.current) setLoading(true);

      // Test mode: the super admin, when not acting as somebody, sees every route
      const seesEverything =
        (dbUser?.userType || "").toLowerCase() === "superadmin" && !getActAs();

      const { data: routes } = await api.get("/my/routes", {
        params: {
          ...(routeType ? { type: routeType } : {}),
          ...(seesEverything ? { all: true } : {}),
        },
      });

      setRoutesData(routes);

      // check if current user has a route
      const me = getActAs() || dbUser?.id;
      const mine = routes.find((route) =>
        route.vans.some(
          (v) => v.driver_id === me || v.helper_ids?.includes(me),
        ),
      );

      setCurrentRouteData(mine || null);

      return routes;
    } catch (err) {
      console.error("❌ getRoutesData:", err?.response?.data || err.message);
      return [];
    } finally {
      firstLoad.current = false;
      setLoading(false);
    }
  };

  // The person pulled the list down: the little spinner of the pull shows
  const refreshRoutes = async () => {
    setRefreshing(true);
    await getRoutesData();
    setRefreshing(false);
  };

  // Looks again without any spinner (when a screen opens, every few seconds, when the app comes back)
  const reloadRoutes = () => getRoutesData();

  useEffect(() => {
    if (!dbUser) return;
    getRoutesData();
  }, [dbUser, routeType]);

  // A push about a route (sent, changed, re-opened) arrived: the routes are looked at again right now
  useEffect(() => {
    if (!dbUser) return;
    return onRoutePush(() => getRoutesData());
  }, [dbUser, routeType]);

  return (
    <RoutesContext.Provider
      value={{
        routesData,
        currentRouteData,
        loading,
        refreshing,
        refreshRoutes,
        reloadRoutes,
      }}
    >
      {children}
    </RoutesContext.Provider>
  );
};

export default RoutesContextProvider;

export const useRoutesContext = () => useContext(RoutesContext);
