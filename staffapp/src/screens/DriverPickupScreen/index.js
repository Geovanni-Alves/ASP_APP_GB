import React, { useEffect, useRef, useState } from "react";
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
  AppState,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import api, { getActAs } from "../../lib/api";
import { useRoutesContext } from "../../contexts/RoutesContext";
import { useUsersContext } from "../../contexts/UsersContext";
import styles from "./styles";
import RemoteImage from "../../components/RemoteImage";

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

// How close (in metres) the van must be to the ASP to be "at the ASP"
const ASP_RADIUS = 120;

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
  const [openingMaps, setOpeningMaps] = useState(false); // the phone takes a moment to switch to the maps
  const [nearDestination, setNearDestination] = useState(false);
  const [distance, setDistance] = useState(null); // metres to the school of the current leg
  // "checking" | "ok" | "denied" (no permission) | "error" | "nocoords" (the school has no position)
  const [locationStatus, setLocationStatus] = useState("checking");
  const [navLeg, setNavLeg] = useState(null); // the leg whose route is shown before the maps open
  // The way back to the ASP: the schools where a helper was left (from the last to the first)
  const [returnStops, setReturnStops] = useState([]);
  const [ownKidsCount, setOwnKidsCount] = useState(0); // the kids the driver picks up himself
  const [myPosition, setMyPosition] = useState(null); // where the van is, on the way back
  const [returnArrived, setReturnArrived] = useState([]); // ids of the schools already reached on the way back
  const askedAtAsp = useRef(false); // it asks to finish the route once per arrival

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

  // The check-in of the driver's own kids is a screen (not a modal): what it opens, like the profile of a
  // student, would stay HIDDEN behind a modal
  const openCheckIn = () =>
    navigation.navigate("PickupCheckInScreen", { routeId });

  // While the phone switches to Google Maps (it can take a few seconds) a spinner shows that it is
  // working. It goes away when the person comes back to the app, or after 10 seconds.
  useEffect(() => {
    if (!openingMaps) return;

    const timer = setTimeout(() => setOpeningMaps(false), 10000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setOpeningMaps(false);
        setNavLeg(null);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [openingMaps]);

  // "85 m" or "1.2 km"
  const formatDistance = (metres) =>
    metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;

  // How far a place is from the van (null while the position or the place is not known)
  const distanceTo = (place) =>
    myPosition && place?.lat != null && place?.lng != null
      ? Math.round(
          getDistanceInMeters(
            myPosition.lat,
            myPosition.lng,
            place.lat,
            place.lng,
          ),
        )
      : null;
  const aspDistance = distanceTo(baseLocation);

  // Opens Google Maps with the route from where the phone is NOW to the school. The map app knows the
  // position by itself, so the app does not read the GPS to open it (that was slow and could fail).
  // (Choosing another map app will come later, in the settings.)
  const openGoogleMaps = async () => {
    const destination = placeOf(navLeg?.to);

    if (!destination) {
      Alert.alert(
        "No address",
        navLeg?.to?.isBase
          ? "The start address of the route is not set. Ask a manager to set it in the dashboard (Settings)."
          : "This school has no address yet. Ask a manager to add it in the dashboard.",
      );
      return;
    }

    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&destination=${encodeURIComponent(destination)}` +
      "&travelmode=driving";

    setOpeningMaps(true);
    try {
      await Linking.openURL(url);
    } catch (error) {
      setOpeningMaps(false);
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

  const buildRouteLegs = (base, schools, kidsBySchool) => {
    const legs = [];
    let from = base;

    schools.forEach((school, index) => {
      legs.push({
        id: `leg-${index}`,
        from,
        to: school,
        kids: kidsBySchool[school.id] || [], // who the driver picks up at this school
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

    // The kids of the van, by school (the ones the driver picks up there)
    const kidsBySchool = {};
    (myVan.kids || []).forEach((k) => {
      if (!k.school || !k.kid) return;
      if (!kidsBySchool[k.school.id]) kidsBySchool[k.school.id] = [];
      kidsBySchool[k.school.id].push(k.kid);
    });
    Object.values(kidsBySchool).forEach((list) =>
      list.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    );

    // The way back: the schools where a HELPER was left, from the last to the first. (The school the
    // driver did himself is not a stop: those kids are already in the van.) Nothing to tap there: the
    // helpers already checked their kids in, and the driver only needs to know where to go and who.
    const driverId = myVan.driver_id;
    const helperName = {};
    (myVan.helperUsers || []).forEach((h) => {
      helperName[h.id] = h.name;
    });
    const stops = [...orderedSchools]
      .reverse()
      .map((school) => {
        const stopKids = (myVan.kids || []).filter(
          (k) =>
            k.school?.id === school.id &&
            k.responsible_staff_id &&
            k.responsible_staff_id !== driverId,
        );
        const helperIds = [
          ...new Set(stopKids.map((k) => k.responsible_staff_id)),
        ];
        return {
          school,
          helpers: helperIds.map((id) => helperName[id] || "Helper"),
          kids: stopKids,
        };
      })
      .filter((stop) => stop.kids.length > 0);
    setReturnStops(stops);
    setReturnArrived(myVan.return_arrived || []);
    setOwnKidsCount(
      (myVan.kids || []).filter((k) => k.responsible_staff_id === driverId)
        .length,
    );

    setLegs(buildRouteLegs(baseLocation, orderedSchools, kidsBySchool));
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
    setDistance(null);
    setNearDestination(false);
    if (!currentLeg?.to?.lat || !currentLeg?.to?.lng) {
      setLocationStatus("nocoords");
      return;
    }
    setLocationStatus("checking");

    let subscription = null;
    let cancelled = false;

    const watchProximity = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationStatus("denied");
          return;
        }

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

            setLocationStatus("ok");
            setDistance(Math.round(distance));
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
        setLocationStatus("error");
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

  // Far from the school (the position is known): it asks first, so a wrong tap does not move the route
  const handleArrivedAtSchool = () => {
    if (
      !nearDestination &&
      locationStatus === "ok" &&
      distance != null &&
      distance > 300
    ) {
      Alert.alert(
        "Not at the school yet?",
        `You are ${formatDistance(distance)} from the school. Mark as arrived anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark arrived", onPress: markArrived },
        ],
      );
      return;
    }
    markArrived();
  };

  const markArrived = async () => {
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
      // The last school: the driver checks in his own kids (when he has some). The way back shows below.
      if (ownKidsCount > 0) openCheckIn();
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

  // On the way back the list looks again every 20 seconds (to see who the helpers already checked in)
  useEffect(() => {
    if (!allLegsDone) return;
    const timer = setInterval(() => refreshRoutes(), 20000);
    return () => clearInterval(timer);
  }, [allLegsDone]);

  // On the way back: where is the van? (how far each school is, and the ASP). At the ASP it asks ONCE if
  // the route should be finished (the driver still confirms); when the van goes away it can ask again.
  useEffect(() => {
    if (!allLegsDone) return;

    let subscription = null;
    let cancelled = false;

    const watchPosition = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 20,
            timeInterval: 3000,
          },
          (location) => {
            setMyPosition({
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            });

            if (baseLocation.lat == null || baseLocation.lng == null) return;

            const metres = Math.round(
              getDistanceInMeters(
                location.coords.latitude,
                location.coords.longitude,
                baseLocation.lat,
                baseLocation.lng,
              ),
            );

            if (metres <= ASP_RADIUS) {
              if (!askedAtAsp.current) {
                askedAtAsp.current = true;
                Alert.alert("You are at the ASP", "Finish the route?", [
                  { text: "Not yet", style: "cancel" },
                  { text: "Finish route", onPress: doFinishRoute },
                ]);
              }
            } else if (metres > ASP_RADIUS * 3) {
              askedAtAsp.current = false;
            }
          },
        );

        if (cancelled) {
          watcher.remove();
        } else {
          subscription = watcher;
        }
      } catch (error) {
        console.error(
          "Could not follow the position (way back):",
          error?.message,
        );
      }
    };

    watchPosition();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [allLegsDone, baseLocation.lat, baseLocation.lng]);

  // The driver reached a school on the way back (any order): the server keeps it and counts it
  const markReturnArrived = async (stop) => {
    try {
      await api.post(`/my/routes/${routeId}/return-arrived`, {
        schoolId: stop.school.id,
      });
      setReturnArrived((previous) =>
        previous.includes(stop.school.id)
          ? previous
          : [...previous, stop.school.id],
      );
      await refreshRoutes();
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          "Failed to save the arrival. Please try again.",
      );
    }
  };

  // Far from the school (the position is known): it asks first, so a wrong tap does not mark it
  const handleReturnArrived = (stop) => {
    const metres = distanceTo(stop.school);
    if (metres != null && metres > 300) {
      Alert.alert(
        "Not at the school yet?",
        `You are ${formatDistance(metres)} from the school. Mark as arrived anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark arrived", onPress: () => markReturnArrived(stop) },
        ],
      );
      return;
    }
    markReturnArrived(stop);
  };

  const doFinishRoute = async () => {
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
  };

  const confirmFinishRoute = () => {
    const missing = returnStops.filter(
      (stop) => !returnArrived.includes(stop.school.id),
    ).length;

    Alert.alert(
      "Finish the route?",
      missing > 0
        ? `${missing} school${missing > 1 ? "s" : ""} on the way back ${
            missing > 1 ? "are" : "is"
          } not marked as arrived. Finish anyway?`
        : "Do this when the pickup is done and the van is back.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Finish route", onPress: doFinishRoute },
      ],
    );
  };

  const isFirstLeg = currentLegIndex === 0;

  // --------------------------------------------------
  // Render route leg card
  // --------------------------------------------------

  // What the phone knows about the school of the current leg
  const proximityText = () => {
    if (nearDestination) return "You are at the school ✔";
    if (locationStatus === "ok" && distance != null) {
      return `You are ${formatDistance(distance)} from the school`;
    }
    if (locationStatus === "denied") {
      return "Location is off: turn it on to know when you are at the school.";
    }
    if (locationStatus === "nocoords") {
      return "This school has no position on the map.";
    }
    if (locationStatus === "error") return "Could not get your position.";
    return "Looking for your position...";
  };

  const renderLeg = ({ item, index }) => {
    const status =
      index < currentLegIndex
        ? "completed"
        : index === currentLegIndex
          ? "current"
          : "upcoming";
    const atSchool = status === "current" && routeStarted && nearDestination;

    return (
      <View
        style={[
          styles.legCard,
          status === "current" && styles.legCurrent,
          status === "completed" && styles.legCompleted,
          atSchool && { borderColor: "#198754", borderWidth: 2 },
        ]}
      >
        <Text style={styles.legTitle}>
          {item.from.name} → {item.to.name}
        </Text>

        {/* Who is picked up here: one line when it is not the current school */}
        {status !== "current" && item.kids.length > 0 && (
          <Text style={styles.routeSubValue}>
            Pick up ({item.kids.length}):{" "}
            {item.kids.map((kid) => kid.name).join(", ")}
          </Text>
        )}

        {status === "current" && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Origin</Text>
            <Text style={styles.routeValue}>{item.from.address}</Text>

            <Text style={[styles.routeLabel, { marginTop: 6 }]}>
              Destination
            </Text>
            <Text style={styles.routeValue}>{item.to.name}</Text>
            <Text style={styles.routeSubValue}>{item.to.address}</Text>

            {/* How far the school is (this is what decides "at the school") */}
            {routeStarted && (
              <Text
                style={[
                  styles.routeSubValue,
                  { marginTop: 6 },
                  nearDestination && { color: "#198754", fontWeight: "700" },
                ]}
              >
                {proximityText()}
              </Text>
            )}

            {/* Who the driver picks up at this school */}
            {item.kids.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.routeLabel}>
                  PICK UP ({item.kids.length})
                </Text>
                {item.kids.map((kid) => (
                  <View key={kid.id} style={local.kidRow}>
                    <RemoteImage
                      bucketName="profilePhotos"
                      path={kid.photo}
                      name={kid.name}
                      style={local.kidAvatar}
                    />
                    <Text style={styles.routeValue}>{kid.name}</Text>
                  </View>
                ))}
              </View>
            )}
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
            style={[
              styles.arrivedBtn,
              atSchool && { backgroundColor: "#198754" },
            ]}
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
      <View>
        {/* The driver's own kids (only when he has some) */}
        {ownKidsCount > 0 && (
          <View style={styles.legCard}>
            <Text style={styles.legTitle}>You arrived at the last school</Text>
            <TouchableOpacity
              style={[styles.navigateBtn, { marginTop: 8 }]}
              onPress={openCheckIn}
            >
              <Text style={styles.navigateText}>Check in my kids</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={local.returnTitle}>Back to the ASP</Text>

        {/* The schools where a helper waits, from the last to the first: any of them can be opened in the
            maps (if something happens, the driver can go to another one first) */}
        {returnStops.map((stop, index) => {
          const arrived = returnArrived.includes(stop.school.id);
          const isNext =
            !arrived &&
            returnStops.findIndex(
              (s) => !returnArrived.includes(s.school.id),
            ) === index;
          const metres = distanceTo(stop.school);
          const atStop = !arrived && metres != null && metres <= 80;

          return (
            <View
              key={stop.school.id}
              style={[
                styles.legCard,
                arrived && styles.legCompleted,
                isNext && styles.legCurrent,
                atStop && { borderColor: "#198754", borderWidth: 2 },
              ]}
            >
              <Text style={styles.legTitle}>
                {index + 1}. {stop.school.name}
                {arrived ? "  ✔ Arrived" : isNext ? "  · NEXT" : ""}
              </Text>
              <Text style={styles.routeSubValue}>
                {stop.helpers.length > 0
                  ? `Pick up the helper: ${stop.helpers.join(", ")}`
                  : "Pick up the kids"}
              </Text>

              <View style={local.kidChips}>
                {stop.kids.map((k) => {
                  const here = k.attendance?.checked_in;
                  const absent = k.attendance?.is_absent;
                  return (
                    <Text
                      key={k.kid.id}
                      style={[
                        local.kidChip,
                        here && local.kidHere,
                        absent && local.kidAbsent,
                      ]}
                    >
                      {here ? "✔ " : absent ? "✖ " : ""}
                      {k.kid.name}
                      {absent ? " (absent)" : ""}
                    </Text>
                  );
                })}
              </View>

              {!arrived && metres != null && (
                <Text
                  style={[
                    styles.routeSubValue,
                    { marginTop: 8 },
                    atStop && { color: "#198754", fontWeight: "700" },
                  ]}
                >
                  {atStop
                    ? "You are at the school ✔"
                    : `You are ${formatDistance(metres)} from the school`}
                </Text>
              )}

              {!arrived && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.arrivedBtn,
                      atStop && { backgroundColor: "#198754" },
                    ]}
                    onPress={() => handleReturnArrived(stop)}
                  >
                    <Text style={styles.arrivedText}>Arrived at school</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navigateBtn, { marginTop: 8 }]}
                    onPress={() => navigateToLeg({ to: stop.school })}
                  >
                    <Text style={styles.navigateText}>Navigate to school</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}

        {/* The end of the way back */}
        <View style={styles.legCard}>
          <Text style={styles.legTitle}>{baseLocation.name}</Text>
          {!!baseLocation.address && (
            <Text style={styles.routeSubValue}>{baseLocation.address}</Text>
          )}
          {aspDistance != null && (
            <Text
              style={[
                styles.routeSubValue,
                { marginTop: 6 },
                aspDistance <= ASP_RADIUS && {
                  color: "#198754",
                  fontWeight: "700",
                },
              ]}
            >
              {aspDistance <= ASP_RADIUS
                ? "You are at the ASP ✔"
                : `You are ${formatDistance(aspDistance)} from the ASP`}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.navigateBtn, { marginTop: 10 }]}
            onPress={() => navigateToLeg({ to: baseLocation })}
          >
            <Text style={styles.navigateText}>Navigate to the ASP</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.arrivedBtn,
            aspDistance != null &&
              aspDistance <= ASP_RADIUS && { backgroundColor: "#198754" },
          ]}
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
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", marginTop: 40, color: "#6c757d" }}
          >
            There are no schools in this route for your van.
          </Text>
        }
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
            <Text style={preview.title}>
              {navLeg?.to?.isBase ? "Route to the ASP" : "Route to school"}
            </Text>

            <Text style={preview.label}>FROM</Text>
            <Text style={preview.value}>Your current location</Text>

            <Text style={[preview.label, { marginTop: 14 }]}>TO</Text>
            <Text style={preview.value}>{navLeg?.to?.name}</Text>
            {!!navLeg?.to?.address && (
              <Text style={preview.sub}>{navLeg.to.address}</Text>
            )}

            {openingMaps ? (
              <View style={{ alignItems: "center", marginTop: 22 }}>
                <ActivityIndicator size="large" />
                <Text style={[preview.sub, { marginTop: 10 }]}>
                  Opening Google Maps...
                </Text>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// The kids that are picked up at a school
const local = StyleSheet.create({
  returnTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212529",
    marginTop: 18,
    marginBottom: 6,
  },
  kidChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  kidChip: {
    fontSize: 13,
    color: "#495057",
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  kidHere: {
    backgroundColor: "#d1e7dd",
    color: "#0f5132",
  },
  kidAbsent: {
    backgroundColor: "#f8d7da",
    color: "#842029",
  },
  kidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  kidAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
});

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
