import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { useBackgroundTaskContext } from "../../contexts/BackgroundTaskContext";
import { View, Text, ActivityIndicator } from "react-native";
import { updateLocation } from "../../components/LocationUtils";
//import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

//const locationEmitter = new EventEmitter();
const LOCATION_UPDATE = "LOCATION_UPDATE";

const LocationTrackingComponent = ({ locationEmitter, routeID }) => {
  const {
    registerBackgroundFetchAsync,
    unregisterBackgroundFetchAsync,
    unregisterAllTasks,
  } = useBackgroundTaskContext();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    console.log("stop all register tasks (enter on screen)");
    unregisterAllTasks();
  }, []);

  useEffect(() => {
    const startForegroundLocationTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      const foregroundLocationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
      };

      Location.watchPositionAsync(
        foregroundLocationOptions,
        (updatedLocation) => {
          // Handle foreground location updates
          const { latitude, longitude } = updatedLocation.coords;
          console.log("Foreground Location Update:", latitude, longitude);
          //console.log("props passed", routeID, busLatLng);
          setIsTracking(true);
          if (routeID) {
            updateLocation(routeID, latitude, longitude);
          }
        }
      );
    };
    //
    const startBackgroundLocationTracking = async () => {
      let { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      const locationOptions = {
        accuracy: Platform.OS === "android" ? 6 : 4, //accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5, // Update every  10 seconds
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Tracking Location",
          notificationBody: "Location updates are active",
        },
      };

      const locationTask = Location.startLocationUpdatesAsync(
        "background-location-task",
        locationOptions
      );

      if (locationTask) {
        setIsTracking(true);
      }

      locationEmitter.addListener(LOCATION_UPDATE, (location) => {
        console.log("location Emitter Fired", location);
        //console.log("can possible change the location on db", routeID);
        try {
          updateLocation(
            routeID,
            location.coords.latitude,
            location.coords.longitude
          );
        } catch (error) {
          console.log("error on update location", error);
        }
      });
    };

    startForegroundLocationTracking();
    startBackgroundLocationTracking();
    registerBackgroundFetchAsync();

    // Clean up Logic
    return () => {
      console.log("calling unregister background fetch");
      //unregisterBackgroundFetchAsync();
      unregisterAllTasks();
      Location.stopLocationUpdatesAsync("background-location-task");
      locationEmitter.removeAllListeners();
    };
  }, [routeID, registerBackgroundFetchAsync, unregisterBackgroundFetchAsync]);

  return (
    <View>
      {isTracking ? <Text></Text> : <ActivityIndicator size="large" />}
    </View>
  );
};

export default LocationTrackingComponent;
