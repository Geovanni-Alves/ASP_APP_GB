import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import RemoteImage from "../../../components/RemoteImage";
import { useRoutesContext } from "../../../contexts/RoutesContext";
import { useUsersContext } from "../../../contexts/UsersContext";

import styles from "./styles";

const HelperPickupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { routeId } = route.params;

  const { routesData, loading } = useRoutesContext();
  const { dbUser } = useUsersContext();
  const [stops, setStops] = useState([]);

  const getRouteById = (id) => {
    return routesData.find((r) => r.id === id) || null;
  };

  useEffect(() => {
    if (!routeId || !routesData.length) return;

    const routeData = getRouteById(routeId);

    if (!routeData) return;

    const myVan = routeData.vans[0];

    const filteredStops = (myVan?.stops || []).filter(
      (s) => s.responsible_staff_id === dbUser.id
    );

    setStops(filteredStops);

    console.log("Loaded stops:", myVan?.stops);
  }, [routeId, routesData]);

  const goToStudentFeed = (kidId) => {
    navigation.navigate("StudentProfile", { id: kidId });
  };

  const renderStopItem = ({ item: stop }) => (
    <View style={styles.stopCard}>
      <TouchableOpacity onPress={() => goToStudentFeed(stop.kid.id)}>
        <RemoteImage
          bucketName="profilePhotos"
          path={stop.kid.photo}
          name={stop.kid.name}
          style={styles.avatar}
        />
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <TouchableOpacity onPress={() => goToStudentFeed(stop.kid.id)}>
          <Text style={styles.kidName}>{stop.kid.name}</Text>

          <Text style={styles.schoolName}>{stop.school?.name}</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => console.log("Check-in", stop.kid.id)}
          >
            <Text style={styles.btnText}>Check-in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => console.log("Photo", stop.kid.id)}
          >
            <Text style={styles.btnText}>Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Tela de carregamento
  if (loading) {
    return (
      <View style={{ marginTop: 50, alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading route...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={stops}
      renderItem={renderStopItem}
      keyExtractor={(item) => item.kid.id.toString()}
      contentContainerStyle={{ padding: 10 }}
      ListEmptyComponent={
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <Text>No stops available!</Text>
        </View>
      }
    />
  );
};

export default HelperPickupScreen;
