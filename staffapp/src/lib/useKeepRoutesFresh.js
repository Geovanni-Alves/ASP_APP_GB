// src/lib/useKeepRoutesFresh.js
// For the screens of a route (the driver's and the check-in): the routes of the phone are looked at again
// while the screen is open, so a route that the manager changes or re-opens does not stay on the screen as
// if nothing happened.
import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import { useRoutesContext } from "../contexts/RoutesContext";

// Looks again when the screen opens, every few seconds, and when the app comes back from the background
// (The push makes it immediate; the timer is only a safety net, for when a push does not arrive)
export default function useKeepRoutesFresh(everyMs = 30000) {
  const { reloadRoutes } = useRoutesContext();
  const reloadRef = useRef(reloadRoutes);
  reloadRef.current = reloadRoutes; // always the latest one, for the timer

  useFocusEffect(
    useCallback(() => {
      reloadRef.current();

      const timer = setInterval(() => reloadRef.current(), everyMs);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") reloadRef.current();
      });

      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [everyMs]),
  );
}

// True when the route is not among the routes of the phone any more (the manager re-opened it, or it was
// removed). The screen must show that and stop offering actions: a check-in on a route that is being
// changed could be for the wrong kid. The first time it also says so and takes the person to the list.
// If the route comes back (it was sent again) the screen works again by itself.
export function useGoBackWhenRouteGone(routeId) {
  const { routesData, loading } = useRoutesContext();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const warned = useRef(false);

  const gone =
    !!routeId &&
    !loading &&
    Array.isArray(routesData) &&
    !routesData.some((route) => route.id === routeId);

  useEffect(() => {
    if (!gone) {
      warned.current = false; // it is back: it can warn again next time
      return;
    }
    // Only the screen that is in front says it (not the ones behind it)
    if (isFocused && !warned.current) {
      warned.current = true;
      Alert.alert(
        "The route changed",
        "The manager re-opened this route to change it. Wait for the new one.",
        [{ text: "OK", onPress: () => navigation.navigate("PickupList") }],
      );
    }
  }, [gone, isFocused]);

  return gone;
}
