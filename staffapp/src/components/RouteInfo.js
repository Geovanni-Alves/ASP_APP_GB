import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
//import { Auth } from "aws-amplify";
import { AntDesign } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const RouteInfoComponent = ({
  currentRoute,
  addressList,
  driver,
  helper,
  driverAction,
  setDriverAction,
  currentWaypoint,
}) => {
  const navigation = useNavigation();

  const goBackToHome = async () => {
    if (driverAction !== "Drive") {
      navigation.goBack();
    } else {
      // Display a confirmation prompt
      Alert.alert(
        "Confirm Go Back",
        "You are in the middle of the route. Are you sure you want to go back?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Confirm",
            onPress: async () => {
              // User confirmed, navigate back
              setDriverAction("Waiting");
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  // useEffect(() => {
  //   if (driverAction === "Drive") {
  //   }
  // }, [driverAction]);

  return (
    <View style={styles.container}>
      {/* <TouchableOpacity style={styles.goBackButton} onPress={goBackToHome}>
        <AntDesign name="arrowleft" size={30} color="white" />
      </TouchableOpacity> */}
      <View>
        <Text style={styles.heading}>Route Information</Text>
        <View style={styles.row}>
          <View style={styles.driverInfo}>
            <Text style={styles.driverLabel}>Driver:</Text>
            <Text style={styles.driverName}>{driver?.name}</Text>
            <Text style={styles.driverAction}>
              {driverAction === "Drive" ? "(Driving)" : "(Waiting)"}
            </Text>
          </View>

          <View style={styles.helperInfo}>
            <Text style={styles.helperLabel}>Helper:</Text>
            <Text style={styles.helperName}>{helper?.name}</Text>
          </View>
        </View>
        <View style={styles.infoColumn}>
          <View style={{ flexDirection: "row" }}>
            <Text> Route status: </Text>
            {currentRoute.status === "WAITING_TO_START" ? (
              <Text style={{ color: "green", fontSize: 15 }}>
                Waiting to start
              </Text>
            ) : (
              <Text
                style={{
                  color: "red",
                  fontSize: 15,
                }}
              >
                In progress - Departed Time {currentRoute.departTime}
              </Text>
            )}
            {/* <Text>
              {" "}
              Route Status{" - "}
              {currentRoute.status === "IN_PROGRESS"
                ? `In progress  Time started: ${currentRoute.departTime}`
                : "Waiting to start"}
            </Text> */}
          </View>
          <View style={styles.waypointInfo}>
            <Text style={styles.waypointLabel}>Driving to </Text>
            <Text style={styles.waypointName}>
              {addressList[currentWaypoint].Kid[0].name}
            </Text>
            <Text style={styles.waypointLabel}> home</Text>
          </View>
          <View>
            <Text style={styles.waypointAddress}>
              {addressList[currentWaypoint].Kid[0].dropOffAddress}
            </Text>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleLabel}>Vehicle:</Text>
              <Text style={styles.vehicleName}>
                {currentRoute.Van.name} - {currentRoute.Van.model}{" "}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    //top: 60,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 10,
    padding: 10,
    elevation: 5,
  },
  goBackButton: {
    backgroundColor: "red",
    width: 30, // Adjust the width and height as needed for your circle
    height: 30,
    borderRadius: 15, // Make the borderRadius half of the width/height to make it circular
    alignItems: "center",
    justifyContent: "center",
    left: 10,
    top: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  heading: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  infoColumn: {
    flex: 1,
    alignItems: "center",
    marginTop: 8,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 0,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  driverLabel: {
    fontWeight: "bold",
    marginRight: 5,
  },
  helperName: {
    fontSize: 12,
  },
  vehicleName: {
    fontSize: 13,
    fontWeight: "bold",
  },
  vehicleLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 5,
  },
  helperInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  helperLabel: {
    fontWeight: "bold",
    marginRight: 5,
  },
  driverName: {
    fontSize: 12,
  },
  driverAction: {
    paddingLeft: 5,
    fontSize: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 0,
  },
  addressText: {
    marginLeft: 20,
    fontSize: 12,
    marginBottom: 5,
  },
  kidName: {
    marginLeft: 20,
    fontSize: 16,
    color: "#007BFF", // Custom color for kid names
    marginBottom: 5,
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    //marginLeft: 0,
  },
  addressItem: {
    //marginBottom: 5,
    padding: 5,
  },
  addressItemText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  addressText: {
    fontSize: 13,
  },
  addressList: {
    marginTop: 10,
    //backgroundColor: "red",
    //borderRadius: 10,
    //zIndex: 2,
  },
  waypointInfo: {
    flexDirection: "row",

    padding: 5,
  },
  waypointName: { fontWeight: "bold" },
  waypointAddress: {
    fontSize: 13,
  },
});

export default RouteInfoComponent;
