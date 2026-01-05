import React, { use, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { supabase } from "../../../lib/supabase";
import { useUsersContext } from "../../../contexts/UsersContext";
import styles from "./styles";
import PickupCheckInScreen from "../PickupCheckInScreen";

/**
 * Fixed base location
 * (future: load from settings table)
 */
const BASE_LOCATION = {
  id: "base-gb-guildford",
  name: "Gracie Barra Guildford",
  address: "15310 103A Ave #205, Surrey, BC V3R 7A2",
  isBase: true,
};

const DriverPickupScreen = () => {
  const route = useRoute();
  const routeId = route.params?.routeId;
  const navigation = useNavigation();

  const { dbUser } = useUsersContext();

  const [legs, setLegs] = useState([]);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPickupCheckInModal, setShowPickupCheckInModal] = useState(false);

  // const [routeStarted, setRouteStarted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeVanId, setRouteVanId] = useState(null);
  const [nearDestination, setNearDestination] = useState(false);
  const [startedManually, setStartedManually] = useState(false);

  const routeStarted = startedManually || currentLegIndex > 0;

  // --------------------------------------------------
  // Location helpers
  // --------------------------------------------------

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Location permission is required to start the route."
      );
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  };

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

  const openGoogleMapsWithOrigin = (origin, destinationAddress) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${
      origin.lng
    }&destination=${encodeURIComponent(destinationAddress)}`;

    Linking.openURL(url);
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

  const loadDriverRoute = async () => {
    if (!routeId || !dbUser) return;

    setLoading(true);

    const { data: routeVan, error } = await supabase
      .from("route_vans")
      .select("id, school_order, current_leg_index")
      .eq("route_id", routeId)
      .eq("driver_id", dbUser.id)
      .single();

    if (error || !routeVan?.school_order?.length) {
      setLegs([]);
      setLoading(false);
      return;
    }

    const { data: schoolsData } = await supabase
      .from("schools")
      .select("id, name, address,lat,lng")
      .in("id", routeVan.school_order);

    const orderedSchools = routeVan.school_order
      .map((id) => schoolsData.find((s) => s.id === id))
      .filter(Boolean);

    setLegs(buildRouteLegs(BASE_LOCATION, orderedSchools));
    setRouteVanId(routeVan.id);
    setCurrentLegIndex(routeVan.current_leg_index || 0);

    setLoading(false);
  };

  useEffect(() => {
    loadDriverRoute();
  }, [routeId, dbUser]);

  useEffect(() => {
    if (currentLegIndex > 0) {
      setStartedManually(true);
    }
  }, [currentLegIndex]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverRoute();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!routeStarted) return;

    const currentLeg = legs[currentLegIndex];
    if (!currentLeg?.to?.lat || !currentLeg?.to?.lng) return;

    let subscription;

    const watchProximity = async () => {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,
          timeInterval: 3000,
        },
        (location) => {
          const distance = getDistanceInMeters(
            location.coords.latitude,
            location.coords.longitude,
            currentLeg.to.lat,
            currentLeg.to.lng
          );

          // console.log({ distance });

          setNearDestination(distance <= 80);
        }
      );
    };

    watchProximity();

    return () => subscription?.remove();
  }, [routeStarted, currentLegIndex, legs]);

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  const confirmStartRoute = (leg) => {
    Alert.alert(
      "Confirm start the route",
      "Do you want to start the route now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start (Open maps)",
          onPress: async () => {
            const location = await getCurrentLocation();
            if (!location) return;

            setCurrentLocation(location);
            setStartedManually(true);

            // openGoogleMapsWithOrigin(location, leg.to.address);
          },
        },
      ]
    );
  };

  const navigateToCurrentLeg = async (leg) => {
    let origin = currentLocation;

    if (!origin) {
      origin = await getCurrentLocation();
      if (!origin) return;
      setCurrentLocation(origin);
    }

    openGoogleMapsWithOrigin(origin, leg.to.address);
  };

  const handleArrivedAtSchool = async () => {
    const currentLeg = legs[currentLegIndex];
    const nextIndex = currentLegIndex + 1;
    const hasNextLeg = nextIndex < legs.length;

    try {
      // await supabase
      //   .from("route_vans")
      //   .update({ current_leg_index: nextIndex })
      //   .eq("id", routeVanId);
    } catch (err) {
      Alert.alert(
        "Error",
        "Failed to update route progress. Please try again.",
        err
      );
    }

    setCurrentLegIndex(nextIndex);
    setNearDestination(false);

    if (!hasNextLeg) {
      console.log({ hasNextLeg });
      // Alert.alert("Route completed", "You have arrived at the last school.");
      setShowPickupCheckInModal(true);
      // return;
      // navigation.navigate("PickupCheckInScreen", {
      //   routeId,
      //   mode: "driver",
      //   schoolId: currentLeg.to.id,
      //   from: "driverRoute",
      // });
      return;
    }

    Alert.alert("Arrived", "Do you want to navigate to the next school?", [
      { text: "Later", style: "cancel" },
      {
        text: "Navigate",
        onPress: () => navigateToCurrentLeg(legs[nextIndex]),
      },
    ]);
  };

  const isFirstLeg = currentLegIndex === 0;
  const isRouteInProgress = currentLegIndex > 0;

  // console.log({ routeStarted });

  // const handleNavigateLeg = (leg) => {
  //   if (!currentLocation) return;

  //   Alert.alert("Navigate", `Navigate to:\n${leg.to.name}`, [
  //     { text: "Cancel", style: "cancel" },
  //     {
  //       text: "Open Maps",
  //       onPress: () =>
  //         openGoogleMapsWithOrigin(currentLocation, leg.to.address),
  //     },
  //   ]);
  // };

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
            <Text style={styles.routeValue}>{BASE_LOCATION.address}</Text>

            <Text style={[styles.routeLabel, { marginTop: 6 }]}>
              Destination
            </Text>
            <Text style={styles.routeValue}>{item.to.name}</Text>
            <Text style={styles.routeSubValue}>{item.to.address}</Text>
          </View>
        )}

        <Text style={styles.legStatus}>{status.toUpperCase()}</Text>

        {/* FIRST LEG → Start route */}
        {/* Start route */}
        {status === "current" && isFirstLeg && !routeStarted && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => confirmStartRoute(item)}
          >
            <Text style={styles.navigateText}>Start the route</Text>
          </TouchableOpacity>
        )}

        {/* Arrived only when near */}

        {status === "current" &&
          routeStarted && ( //&& nearDestination && (
            <TouchableOpacity
              style={styles.arrivedBtn}
              onPress={handleArrivedAtSchool}
            >
              <Text style={styles.arrivedText}>Arrived at school</Text>
            </TouchableOpacity>
          )}
        {/* Navigate to current leg */}
        {status === "current" && routeStarted && !nearDestination && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => navigateToCurrentLeg(item)}
          >
            <Text style={styles.navigateText}>Navigate to school</Text>
          </TouchableOpacity>
        )}
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
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
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

export default DriverPickupScreen;
