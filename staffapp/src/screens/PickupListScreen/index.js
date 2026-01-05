import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRoutesContext } from "../../contexts/RoutesContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { useNavigation } from "@react-navigation/native";
import RemoteImage from "../../components/RemoteImage";
import styles from "./styles";

const PickupListScreen = () => {
  const defaultVanImage = require("../../../assets/defaultVan.png");

  const navigation = useNavigation();
  const { routesData, loading, refreshing, refreshRoutes } = useRoutesContext();
  const { dbUser } = useUsersContext();

  const [lastRoute, setLastRoute] = useState(null);
  const [userVan, setUserVan] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // ----------------------------------------------------
  // Filter last pickup route assigned to the current user
  // ----------------------------------------------------
  useEffect(() => {
    if (!dbUser || !routesData.length) return;

    const userRoutes = routesData
      .filter(
        (route) =>
          route.type === "pickup" &&
          route.status === "waiting_to_start" &&
          route.vans.some(
            (van) =>
              van.driverUser?.id === dbUser.id ||
              van.helperUsers?.some((h) => h.id === dbUser.id)
          )
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const route = userRoutes[0] || null;
    setLastRoute(route);

    if (route) {
      const van = route.vans.find(
        (v) =>
          v.driverUser?.id === dbUser.id ||
          v.helperUsers?.some((h) => h.id === dbUser.id)
      );
      setUserVan(van);
      setUserRole(van.driverUser?.id === dbUser.id ? "Driver" : "Helper");
    }
  }, [routesData, dbUser]);

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
  // Render route card
  // ----------------------------------------------------
  const renderRouteCard = () => {
    if (!lastRoute || !userVan) {
      return (
        <View style={styles.center}>
          <Text>No pickup routes available!</Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.containerTitle}>
          You have a route as {userRole}
        </Text>

        <TouchableOpacity
          style={styles.routeContainer}
          onPress={() => {
            // console.log({ lastRoute });
            navigation.navigate(
              userRole === "Driver"
                ? "DriverPickupScreen"
                : "PickupCheckInScreen",
              { routeId: lastRoute.id }
            );
          }}
        >
          <Text style={styles.routeTitle}>Route</Text>
          <Text>Date: {lastRoute.date}</Text>
          {lastRoute.vans.map(renderVan)}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshRoutes} />
      }
    >
      {renderRouteCard()}
    </ScrollView>
  );
};

export default PickupListScreen;
