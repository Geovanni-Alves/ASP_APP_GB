import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  StyleSheet,
  AppState,
} from "react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRoutesContext } from "../../contexts/RoutesContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import RemoteImage from "../../components/RemoteImage";
import { setActAs, getActAs } from "../../lib/api";
import styles from "./styles";

// The routes that are sent (waiting) or already going
const OPEN_STATUSES = ["waiting_to_start", "in_progress"];

// "2026-10-19" -> "Monday, Oct 19" (noon, so the day never moves with the timezone)
const formatDay = (isoDate) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

const PickupListScreen = () => {
  const defaultVanImage = require("../../../assets/defaultVan.png");

  const navigation = useNavigation();
  const { routesData, loading, refreshing, refreshRoutes, reloadRoutes } =
    useRoutesContext();
  const reloadRef = useRef(reloadRoutes);
  reloadRef.current = reloadRoutes; // always the latest one, for the timer below
  const { dbUser } = useUsersContext();

  // Test mode: the super admin (the programmer) sees every route and chooses who to open it as
  const isSuperAdmin = (dbUser?.userType || "").toLowerCase() === "superadmin";
  const [chooserRoute, setChooserRoute] = useState(null); // the route waiting for the choice

  // While this list is open it keeps looking by itself: when it opens (for example from the push), every
  // 30 seconds (the push makes it immediate), and when the app comes back from the background. A route the manager sends shows up
  // without anybody pulling the list.
  // Back on this list the test mode also ends, and the super admin sees every route again.
  useFocusEffect(
    useCallback(() => {
      if (getActAs()) setActAs(null);
      reloadRef.current();

      const timer = setInterval(() => reloadRef.current(), 30000); // safety net: the push makes it immediate
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") reloadRef.current();
      });

      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, []),
  );

  // ----------------------------------------------------
  // My pickup routes (for the super admin: every route). The API says when each one is ("today",
  // "upcoming"), by the clock of the server, so a wrong clock on the phone changes nothing.
  // ----------------------------------------------------
  const { todayRoute, upcomingRoutes } = useMemo(() => {
    if (!dbUser || !routesData?.length) {
      return { todayRoute: null, upcomingRoutes: [] };
    }

    const open = routesData.filter(
      (route) =>
        route.type === "pickup" && OPEN_STATUSES.includes(route.status),
    );
    const mine = isSuperAdmin
      ? open
      : open.filter((route) =>
          route.vans.some(
            (van) =>
              van.driverUser?.id === dbUser.id ||
              van.helperUsers?.some((h) => h.id === dbUser.id),
          ),
        );

    return {
      todayRoute: mine.find((route) => route.when === "today") || null,
      upcomingRoutes: mine
        .filter((route) => route.when === "upcoming")
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }, [routesData, dbUser, isSuperAdmin]);

  // My van in a route, and my role in it
  const myVanIn = (route) =>
    route.vans.find(
      (van) =>
        van.driverUser?.id === dbUser.id ||
        van.helperUsers?.some((h) => h.id === dbUser.id),
    );
  const roleIn = (route) =>
    myVanIn(route)?.driverUser?.id === dbUser.id ? "Driver" : "Helper";

  // The people of a route, for the super admin to choose from
  const peopleOf = (route) => {
    const people = [];
    route.vans.forEach((van) => {
      const vanName = van.van?.name || "Van";
      if (van.driverUser) {
        people.push({
          key: `${van.id}-driver`,
          id: van.driverUser.id,
          name: van.driverUser.name,
          role: "Driver",
          vanName,
        });
      }
      (van.helperUsers || []).forEach((helper) =>
        people.push({
          key: `${van.id}-${helper.id}`,
          id: helper.id,
          name: helper.name,
          role: "Helper",
          vanName,
        }),
      );
    });
    return people;
  };

  // Opens the route AS that person: from now on the API answers as them
  const openAs = async (person) => {
    const routeId = chooserRoute.id;
    setActAs(person.id);
    await refreshRoutes(); // the routes the way this person sees them
    setChooserRoute(null);
    navigation.navigate(
      person.role === "Driver" ? "DriverPickupScreen" : "PickupCheckInScreen",
      { routeId },
    );
  };

  // ----------------------------------------------------
  // Loading indicator
  // ----------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10 }}>Loading routes...</Text>
      </View>
    );
  }

  // ----------------------------------------------------
  // Render each van
  // ----------------------------------------------------
  const renderVan = (van) => {
    const vanData = van.van;

    return (
      <View key={van.id} style={styles.vanWrapper}>
        <RemoteImage
          path={vanData?.image}
          bucketName="vans"
          fallback={defaultVanImage}
          name={vanData?.name || "Van"}
          style={styles.vanImage}
        />

        <View style={styles.vanInfo}>
          <Text style={styles.vanTitle}>{vanData?.name || "Van"}</Text>

          <View style={styles.userRow}>
            <Text style={styles.userName}>
              Driver: {van.driverUser?.name || "No Driver"}
            </Text>
          </View>

          {van.helperUsers?.length ? (
            van.helperUsers.map((h) => (
              <Text key={h.id} style={styles.userName}>
                Helper: {h.name}
              </Text>
            ))
          ) : (
            <Text style={{ marginLeft: 5 }}>Helpers: None</Text>
          )}
        </View>
      </View>
    );
  };

  // ----------------------------------------------------
  // Today's route: the only one that opens
  // ----------------------------------------------------
  const renderTodayRoute = () => {
    if (!todayRoute) {
      return (
        <View style={styles.center}>
          <Text>No pickup route for today.</Text>
          {/* Pulling the list down also works, but a button is easier to find */}
          <TouchableOpacity
            onPress={refreshRoutes}
            style={{
              marginTop: 16,
              paddingVertical: 10,
              paddingHorizontal: 22,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#0d6efd",
            }}
          >
            <Text style={{ color: "#0d6efd", fontWeight: "600" }}>
              {refreshing ? "Looking..." : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const role = isSuperAdmin ? null : roleIn(todayRoute);

    return (
      <View>
        <Text style={styles.containerTitle}>
          {isSuperAdmin
            ? "Today's route (test mode)"
            : `You have a route today as ${role}`}
        </Text>

        <TouchableOpacity
          style={styles.routeContainer}
          onPress={() => {
            if (isSuperAdmin) {
              setChooserRoute(todayRoute); // asks: as the driver or as a helper?
              return;
            }
            navigation.navigate(
              role === "Driver" ? "DriverPickupScreen" : "PickupCheckInScreen",
              { routeId: todayRoute.id },
            );
          }}
        >
          <Text style={styles.routeTitle}>Route</Text>
          <Text>Date: {todayRoute.date}</Text>
          {todayRoute.vans.map(renderVan)}
        </TouchableOpacity>
      </View>
    );
  };

  // ----------------------------------------------------
  // The next days: only to know what is coming (nothing can be done until the day)
  // ----------------------------------------------------
  const renderUpcoming = () => {
    if (upcomingRoutes.length === 0) return null;

    return (
      <View style={{ marginTop: 24 }}>
        <Text style={styles.containerTitle}>Coming up</Text>

        {upcomingRoutes.map((route) => (
          <TouchableOpacity
            key={route.id}
            activeOpacity={isSuperAdmin ? 0.7 : 1}
            style={[
              styles.routeContainer,
              { opacity: isSuperAdmin ? 0.85 : 0.6 },
            ]}
            onPress={() => {
              // Only the super admin (test mode) opens a route before its day
              if (isSuperAdmin) setChooserRoute(route);
            }}
          >
            <Text style={styles.routeTitle}>{formatDay(route.date)}</Text>
            {isSuperAdmin ? (
              <Text style={{ marginBottom: 6 }}>
                Test mode: tap to open it as a driver or a helper.
              </Text>
            ) : (
              <>
                <Text>You are the {roleIn(route)} on this route.</Text>
                <Text style={{ marginBottom: 6 }}>It opens on the day.</Text>
              </>
            )}
            {route.vans.map(renderVan)}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }} // the whole screen answers to the pull, even with no route
        alwaysBounceVertical
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshRoutes} />
        }
      >
        {renderTodayRoute()}
        {renderUpcoming()}
      </ScrollView>

      {/* Test mode (super admin): who to open this route as */}
      <Modal
        visible={!!chooserRoute}
        transparent
        animationType="slide"
        onRequestClose={() => setChooserRoute(null)}
      >
        <View style={chooser.overlay}>
          <View style={chooser.sheet}>
            <Text style={chooser.title}>Open this route as...</Text>
            <Text style={chooser.sub}>
              Test mode (super admin): the app will act as the person you
              choose.
            </Text>

            {chooserRoute && peopleOf(chooserRoute).length === 0 && (
              <Text style={chooser.empty}>
                Nobody is assigned to this route yet.
              </Text>
            )}

            {chooserRoute &&
              peopleOf(chooserRoute).map((person) => (
                <TouchableOpacity
                  key={person.key}
                  style={chooser.option}
                  onPress={() => openAs(person)}
                >
                  <Text style={chooser.optionRole}>{person.role}</Text>
                  <Text style={chooser.optionName}>{person.name}</Text>
                  <Text style={chooser.optionVan}>{person.vanName}</Text>
                </TouchableOpacity>
              ))}

            <TouchableOpacity
              style={chooser.cancel}
              onPress={() => setChooserRoute(null)}
            >
              <Text style={chooser.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// The sheet of the test mode
const chooser = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
  },
  sub: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 4,
    marginBottom: 12,
  },
  empty: {
    color: "#6c757d",
    marginVertical: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  optionRole: {
    width: 64,
    fontSize: 12,
    fontWeight: "700",
    color: "#0d6efd",
  },
  optionName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
  optionVan: {
    fontSize: 12,
    color: "#6c757d",
  },
  cancel: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelText: {
    color: "#dc3545",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default PickupListScreen;
