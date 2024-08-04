import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  LayoutAnimation,
  TouchableOpacity,
  UIManager,
  Platform,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RouteInfoComponent = ({
  currentRoute,
  addressList,
  driver,
  helper,
  driverAction,
  currentWaypoint,
  isBottomSheetExpanded,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [wasExpandedBeforeBottomSheet, setWasExpandedBeforeBottomSheet] =
    useState(true);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isBottomSheetExpanded) {
      setWasExpandedBeforeBottomSheet(isExpanded);
      setIsExpanded(false);
    } else {
      setIsExpanded(wasExpandedBeforeBottomSheet);
    }
  }, [isBottomSheetExpanded]);
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View
      style={[
        styles.container,
        isExpanded ? styles.expandedContainer : styles.contractedContainer,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toggleButton,
          {
            bottom: isExpanded ? 8 : -35,
            left: isExpanded ? 340 : 5,
          },
        ]}
        onPress={toggleExpand}
        disabled={isBottomSheetExpanded}
      >
        <AntDesign
          name={isExpanded ? "upcircle" : "infocirlceo"}
          size={30}
          color={isExpanded ? "green" : "blue"}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.content}>
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
                <Text style={{ color: "red", fontSize: 15 }}>
                  In progress - Departed Time {currentRoute.departTime}
                </Text>
              )}
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
                  {currentRoute.Van.name} - {currentRoute.Van.model}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 15,
    left: 10,
    backgroundColor: "rgba(255, 255, 255, 1)",
    elevation: 5,
  },
  expandedContainer: {
    width: "95%",
    borderRadius: 10,
    padding: 3,
  },
  contractedContainer: {
    width: 0,
    height: 0,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 1)",
  },
  toggleButton: {
    position: "absolute",
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },
  content: {
    padding: 10,
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
    letterSpacing: 1.5,
  },
  infoColumn: {
    flex: 1,
    alignItems: "center",
    marginTop: 8,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
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
  waypointInfo: {
    flexDirection: "row",
    padding: 5,
  },
  waypointName: {
    fontWeight: "bold",
  },
  waypointAddress: {
    fontSize: 13,
  },
});

export default RouteInfoComponent;
