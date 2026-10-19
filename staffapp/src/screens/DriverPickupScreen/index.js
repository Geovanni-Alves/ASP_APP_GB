import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import api, { getActAs } from "../../lib/api";
import { useRoutesContext } from "../../contexts/RoutesContext";
import { useUsersContext } from "../../contexts/UsersContext";
import styles from "./styles";
import PickupCheckInScreen from "../PickupCheckInScreen";

/**
 * Where the route starts. The real place comes from the settings (the dashboard sets it);
 * this is only used until they arrive.
 */
const BASE_LOCATION = {
  id: "base",
  name: "Start",
  address: "",
  isBase: true,
};

const DriverPickupScreen = () => {
  const route = useRoute();
  const routeId = route.params?.routeId;
  const navigation = useNavigation();

  const { dbUser } = useUsersContext();
  const { routesData, refreshRoutes } = useRoutesContext();
  // The super admin may open a route AS a driver (test mode): then the routes are that person's
  const effectiveId = getActAs() || dbUser?.id;
  const [baseLocation, setBaseLocation] = useState(BASE_LOCATION);

  const [legs, setLegs] = useState([]);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [routeStatus, setRouteStatus] = useState(null); // the status of the route, as the server has it
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPickupCheckInModal, setShowPickupCheckInModal] = useState(false);
  const [nearDestination, setNearDestination] = useState(false);
  const [navLeg, setNavLeg] = useState(null); // the leg whose route is shown before the maps open

  // The route is going when the SERVER says so (it survives leaving the screen or reloading the app)
  const routeStarted = routeStatus === "in_progress" || currentLegIndex > 0;

  // --------------------------------------------------
  // Location and maps helpers
  // --------------------------------------------------

  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Where a stop is, for the maps: its coordinates when we have them (more exact), or its address
  const placeOf = (place) =>
    place?.lat != null && place?.lng != null
      ? `${place.lat},${place.lng}`
      : place?.address || "";

  // Opens Google Maps with the route from the START of the leg (the start address of the route, or the
  // school before) to the school. Both ends are written in the link, so the map shows exactly that route.
  // (Choosing another map app will come later, in the settings.)
  const openGoogleMaps = async () => {
    const origin = placeOf(navLeg?.from);
    const destination = placeOf(navLeg?.to);

    if (!origin) {
      Alert.alert(
        "No start address",
        "The start address of the route is not set. Ask a manager to set it in the dashboard (Settings).",
      );
      return;
    }
    if (!destination) {
      Alert.alert(
        "No address",
        "This school has no address yet. Ask a manager to add it in the dashboard.",
      );
      return;
    }

    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}` +
      "&travelmode=driving";

    try {
      await Linking.openURL(url);
      setNavLeg(null);
    } catch (error) {
      console.error("Could not open the maps:", error?.message);
      Alert.alert(
        "Could not open the maps",
        "Please open Google Maps and search for the school.",
      );
    }
  };

  // --------------------------------------------------
  // Route building (outbound only)
  // --------------------------------------------------

  const buildRouteLegs = (base, schools) => {
    const legs = [];
    let from = base;

    schools.forEach((school, index) => {
      legs.push({
        id: `leg-${index}`,
        from,
        to: school,
      });
      from = school;
    });

    return legs;
  };

  // --------------------------------------------------
  // Load driver route
  // --------------------------------------------------

  // The start of the route (the settings the dashboard sets)
  useEffect(() => {
    const loadBaseLocation = async () => {
      try {
        const { data } = await api.get("/app/settings");
        const value = (key) =>
          data.find((setting) => setting.key === key)?.value;
        const coords = value("pickup_start_coords")
          ? JSON.parse(value("pickup_start_coords"))
          : null;

        setBaseLocation({
          id: "base",
          name: value("after_school_name") || "Start",
          address: value("pickup_start_address") || "",
          lat: coords?.lat,
          lng: coords?.lng,
          isBase: true,
        });
      } catch (error) {
        console.error(
          "Error loading the start of the route:",
          error?.response?.data || error.message,
        );
      }
    };
    loadBaseLocation();
  }, []);

  // The route, my van and the schools are already in the routes the API sent (no extra request):
  // the order of the schools is in the van, and each school comes with the kids of the van.
  const loadDriverRoute = () => {
    if (!routeId || !dbUser) return;

    const routeData = routesData.find((r) => r.id === routeId);
    const myVan = routeData?.vans?.find((v) => v.driver_id === effectiveId);

    setRouteStatus(routeData?.status || null);

    if (!myVan?.school_order?.length) {
      setLegs([]);
      setLoading(false);
      return;
    }

    const schoolsById = {};
    (myVan.kids || []).forEach((k) => {
      if (k.school) schoolsById[k.school.id] = k.school;
    });

    const orderedSchools = myVan.school_order
      .map((id) => schoolsById[id])
      .filter(Boolean);

    setLegs(buildRouteLegs(baseLocation, orderedSchools));
    setCurrentLegIndex(myVan.current_leg_index || 0);

    setLoading(false);
  };

  useEffect(() => {
    loadDriverRoute();
  }, [routeId, dbUser, routesData, baseLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshRoutes();
    setRefreshing(false);
  };

  // While the route goes: is the van close to the school of the current leg?
  useEffect(() => {
    if (!routeStarted) return;

    const currentLeg = legs[currentLegIndex];
    if (!currentLeg?.to?.lat || !currentLeg?.to?.lng) return;

    let subscription = null;
    let cancelled = false;

    const watchProximity = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 15,
            timeInterval: 3000,
          },
          (location) => {
            const distance = getDistanceInMeters(
              location.coords.latitude,
              location.coords.longitude,
              currentLeg.to.lat,
              currentLeg.to.lng,
            );

            setNearDestination(distance <= 80);
          },
        );

        // The screen may have been left while the watcher was being created
        if (cancelled) {
          watcher.remove();
        } else {
          subscription = watcher;
        }
      } catch (error) {
        console.error("Could not follow the position:", error?.message);
      }
    };

    watchProximity();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [routeStarted, currentLegIndex, legs]);

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  // Shows the route (from and to) before the maps open
  const navigateToLeg = (leg) => setNavLeg(leg);

  const confirmStartRoute = (leg) => {
    Alert.alert(
      "Confirm start the route",
      "Do you want to start the route now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: async () => {
            // The route is now in progress: the manager sees it in the dashboard.
            // The server decides first (a route only starts on its day): the screen follows.
            try {
              await api.post(`/my/routes/${routeId}/start`);
            } catch (error) {
              console.error(
                "Error starting the route:",
                error?.response?.data || error.message,
              );
              Alert.alert(
                "The route could not be started",
                error?.response?.data?.error || "Please try again.",
              );
              return;
            }

            // The new status comes back with the routes (the screen reads it from there)
            await refreshRoutes();

            navigateToLeg(leg);
          },
        },
      ],
    );
  };

  const handleArrivedAtSchool = async () => {
    const nextIndex = currentLegIndex + 1;
    const hasNextLeg = nextIndex < legs.length;

    try {
      // The API keeps the number of the current leg, so the progress survives closing the app
      await api.put(`/my/routes/${routeId}/leg`, { index: nextIndex });
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          "Failed to update route progress. Please try again.",
      );
      return; // the screen stays where the server is
    }

    setCurrentLegIndex(nextIndex);
    setNearDestination(false);

    if (!hasNextLeg) {
      // The last school: the driver checks in their own kids (and can finish the route below)
      setShowPickupCheckInModal(true);
      return;
    }

    Alert.alert("Arrived", "Do you want to navigate to the next school?", [
      { text: "Later", style: "cancel" },
      {
        text: "Navigate",
        onPress: () => navigateToLeg(legs[nextIndex]),
      },
    ]);
  };

  // After the last school: check in my own kids, and finish the route
  const allLegsDone = legs.length > 0 && currentLegIndex >= legs.length;

  const confirmFinishRoute = () => {
    Alert.alert(
      "Finish the route?",
      "Do this when the pickup is done and the van is back.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish route",
          onPress: async () => {
            try {
              const { data } = await api.post(`/my/routes/${routeId}/finish`);
              await refreshRoutes();
              Alert.alert(
                "Done",
                data.status === "finished"
                  ? "The route is finished. Thank you!"
                  : "Your van is finished. The route closes when the other vans finish.",
              );
              navigation.goBack();
            } catch (error) {
              console.error(
                "Error finishing the route:",
                error?.response?.data || error.message,
              );
              Alert.alert(
                "The route could not be finished",
                error?.response?.data?.error || "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const isFirstLeg = currentLegIndex === 0;

  // --------------------------------------------------
  // Render route leg card
  // --------------------------------------------------

  const renderLeg = ({ item, index }) => {
    const status =
      index < currentLegIndex
        ? "completed"
        : index === currentLegIndex
          ? "current"
          : "upcoming";

    return (
      <View
        style={[
          styles.legCard,
          status === "current" && styles.legCurrent,
          status === "completed" && styles.legCompleted,
        ]}
      >
        <Text style={styles.legTitle}>
          {item.from.name} → {item.to.name}
        </Text>

        {status === "current" && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Origin</Text>
            <Text style={styles.routeValue}>{item.from.address}</Text>

            <Text style={[styles.routeLabel, { marginTop: 6 }]}>
              Destination
            </Text>
            <Text style={styles.routeValue}>{item.to.name}</Text>
            <Text style={styles.routeSubValue}>{item.to.address}</Text>
          </View>
        )}

        <Text style={styles.legStatus}>{status.toUpperCase()}</Text>

        {/* FIRST LEG → Start route */}
        {status === "current" && isFirstLeg && !routeStarted && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => confirmStartRoute(item)}
          >
            <Text style={styles.navigateText}>Start the route</Text>
          </TouchableOpacity>
        )}

        {/* Arrived at the school */}
        {status === "current" && routeStarted && (
          <TouchableOpacity
            style={styles.arrivedBtn}
            onPress={handleArrivedAtSchool}
          >
            <Text style={styles.arrivedText}>Arrived at school</Text>
          </TouchableOpacity>
        )}

        {/* Navigate to the school of this leg */}
        {status === "current" && routeStarted && !nearDestination && (
          <TouchableOpacity
            style={[styles.navigateBtn, { marginTop: 8 }]}
            onPress={() => navigateToLeg(item)}
          >
            <Text style={styles.navigateText}>Navigate to school</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // --------------------------------------------------
  // The end of the list: after the last school
  // --------------------------------------------------

  const renderFooter = () => {
    if (!allLegsDone) return null;

    return (
      <View style={styles.legCard}>
        <Text style={styles.legTitle}>You arrived at the last school</Text>
        <TouchableOpacity
          style={[styles.navigateBtn, { marginTop: 8 }]}
          onPress={() => setShowPickupCheckInModal(true)}
        >
          <Text style={styles.navigateText}>Check in my kids</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.arrivedBtn}
          onPress={confirmFinishRoute}
        >
          <Text style={styles.arrivedText}>Finish route</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  if (loading) {
    return (
      <View style={{ marginTop: 50, alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading route…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Route</Text>

      <FlatList
        data={legs}
        keyExtractor={(item) => item.id}
        renderItem={renderLeg}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      {/* The route shown before the maps open: from and to */}
      <Modal
        visible={!!navLeg}
        transparent
        animationType="slide"
        onRequestClose={() => setNavLeg(null)}
      >
        <View style={preview.overlay}>
          <View style={preview.sheet}>
            <Text style={preview.title}>Route to school</Text>

            <Text style={preview.label}>FROM</Text>
            <Text style={preview.value}>{navLeg?.from?.name}</Text>
            {!!navLeg?.from?.address && (
              <Text style={preview.sub}>{navLeg.from.address}</Text>
            )}

            <Text style={[preview.label, { marginTop: 14 }]}>TO</Text>
            <Text style={preview.value}>{navLeg?.to?.name}</Text>
            {!!navLeg?.to?.address && (
              <Text style={preview.sub}>{navLeg.to.address}</Text>
            )}

            <TouchableOpacity
              style={[styles.navigateBtn, { marginTop: 18 }]}
              onPress={openGoogleMaps}
            >
              <Text style={styles.navigateText}>Open Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={preview.cancel}
              onPress={() => setNavLeg(null)}
            >
              <Text style={preview.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPickupCheckInModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPickupCheckInModal(false)}
      >
        <PickupCheckInScreen
          routeId={routeId}
          onClose={() => setShowPickupCheckInModal(false)}
        />
      </Modal>
    </View>
  );
};

// The sheet that shows the route before the maps open
const preview = StyleSheet.create({
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
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6c757d",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginTop: 2,
  },
  sub: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
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

export default DriverPickupScreen;
