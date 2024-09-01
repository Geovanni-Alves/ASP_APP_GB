import styles from "./styles";
import { useRef, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import BottomSheet from "@gorhom/bottom-sheet";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { FontAwesome5, FontAwesome } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_MAPS_APIKEY } from "@env";
import { useRoute, useNavigation } from "@react-navigation/native";
import RouteInfoComponent from "../../components/RouteInfo";
import * as Location from "expo-location";
import LocationTrackingComponent from "../../components/LocationTrackingComponent";
import { useBackgroundTaskContext } from "../../contexts/BackgroundTaskContext";
import ShowMessage from "../../components/ShowMessage";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { useRouteContext } from "../../contexts/RouteContext";

//

const DropOffRouteScreen = () => {
  const route = useRoute();
  const id = route.params?.id;
  const navigation = useNavigation();

  const bottomSheetRef = useRef(null);
  const mapRef = useRef(null);
  const snapPoints = useMemo(() => ["12%", "92%"], []);
  const { width, height } = useWindowDimensions();
  const [selectedItem, setSelectedItem] = useState(null);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [helper, setHelper] = useState([]);
  const [driver, setDriver] = useState([]);
  const [busLocation, setBusLocation] = useState(null);
  const [addressList, setAddressList] = useState(null);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [nextWaypoints, setNextWaypoints] = useState(null);
  const [notificationSent, setNotificationSent] = useState(false);
  const [notificationToDriver, setNotificationToDriver] = useState(false);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const [showDriveConfirmation, setShowDriveConfirmation] = useState(false);
  const [driveConfirmationResponse, setDriveConfirmationResponse] =
    useState(null);
  const [driverAction, setDriverAction] = useState("Waiting");
  const [handlingNextWaypoint, setHandlingNextWaypoint] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(
    "Do you want to start the route?"
  );
  const [showDriveButton, setShowDriveButton] = useState(true);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [showResumeButton, setResumeButton] = useState(false);
  const [isVanArrived, setIsVanArrived] = useState(false);
  const [routeStatus, setRouteStatus] = useState(null);

  // data from contexts
  const { sendPushNotification, expoPushToken } = usePushNotificationsContext();
  const { routesData } = useRouteContext();
  const { locationEmitter } = useBackgroundTaskContext();
  const { currentUserData } = useUsersContext();
  const [showArrivedModal, setShowArrivedModal] = useState(false);
  const [arrivedAddress, setArrivedAddress] = useState(null);
  const [foregroundLocationPermission, setForegroundLocationPermission] =
    useState(false);
  const [backgroundLocationPermission, setBackgroundLocationPermission] =
    useState(false);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

  const handleSheetChanges = (index) => {
    // Check if the BottomSheet is expanded
    setIsBottomSheetExpanded(index === snapPoints.length - 1);
  };

  const requestLocationPermissions = async () => {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === "granted") {
      setForegroundLocationPermission(true);
      //console.log("Requesting background location permissions...");
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      //console.log("Background location status:", backgroundStatus);
      //console.log(backgroundStatus);
      if (backgroundStatus === "granted") {
        setBackgroundLocationPermission(true);
      } else {
        //Alert.alert("background location needed");
        Alert.alert(
          "Background Location Required",
          "To track the bus and send updates to parents you must accept the background Location on settings.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: async () => {
                // setPermissionMessage(false);
              },
            },
            {
              text: "Open Settings",
              onPress: async () => {
                await Linking.openSettings();
                // setPermissionMessage(false);
              },
            },
          ]
        );
      }
    } else {
      Alert.alert(
        "Foreground Location Required",
        "To track the bus and send updates to parents you must accept the foreground Location on settings.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: async () => {
              // setPermissionMessage(false);
            },
          },
          {
            text: "Open Settings",
            onPress: async () => {
              await Linking.openSettings();
              // setPermissionMessage(false);
            },
          },
        ]
      );
    }
  };

  const sendNotificationToAllParents = async () => {
    if (addressList?.Kid) {
      // Initialize an array to store all the tokens of parents
      const parentTokens = [];

      // Loop through each kid in currentRouteData
      for (const kid of addressList.Kid) {
        if (kid.Parent1Id !== null && kid.Parent1 && kid.Parent1.pushToken) {
          const childName = kid.name;
          const parentToken = kid.Parent1.pushToken;
          const message = `Dear parent of ${childName}, your child is leaving for drop off. Remember that we care about the maximum safety of the children. Thank you`;

          parentTokens.push({ token: parentToken, message });
        }

        if (kid.Parent2Id !== null && kid.Parent2 && kid.Parent2.pushToken) {
          const childName = kid.name;
          const parentToken = kid.Parent2.pushToken;
          const message = `Dear parent of ${childName}, your child is leaving for drop off. Remember that we care about the maximum safety of the children. Thank you`;

          parentTokens.push({ token: parentToken, message });
        }
      }

      // Send notifications to all parent tokens
      for (const { token, message } of parentTokens) {
        await sendPushNotification(token, "Drop-off starting", message);
      }
    }
  };

  const sendNotificationToNextParents = async (duration) => {
    // Check if the currentWaypointIndex is within valid bounds
    if (currentWaypointIndex < addressList.length) {
      // Get the current waypoint
      const currentWaypoint = addressList[currentWaypointIndex];

      // Check if the current waypoint has a Kid property
      if (currentWaypoint.Kid) {
        for (const currentKid of currentWaypoint.Kid) {
          // Find the corresponding kid in currentRouteData.Kid
          const matchedKid = addressList.Kid.find(
            (kid) => kid.id === currentKid.id
          );

          if (matchedKid) {
            // Check if the kid has Parent1 or Parent2
            const parent1 = matchedKid.Parent1;
            const parent2 = matchedKid.Parent2;

            if (parent1 && parent1.pushToken) {
              const childName = currentKid.name;
              const parentToken = parent1.pushToken;
              const message01 = `Dear parent of ${childName}, The driver is approximately ${duration.toFixed(
                0
              )} minutes away from your location.`;

              // Send a push notification to Parent1
              await sendPushNotification(
                parentToken,
                "Current Stop Alert",
                message01
              );
            }

            if (parent2 && parent2.pushToken) {
              const childName = currentKid.name;
              const parentToken = parent2.pushToken;
              const message02 = `Dear parent of ${childName}, The driver is approximately ${duration.toFixed(
                0
              )} minutes away from your location.`;

              // Send a push notification to Parent2
              await sendPushNotification(
                parentToken,
                "Current Stop Alert",
                message02
              );
            }
          }
        }
      } else {
        // Handle the case when currentWaypoint.Kid is undefined
        console.log("No Kid found for the current waypoint");
      }
    }
  };

  const renderKidsItem = ({ item, index }) => {
    if (!addressList) {
      return <ActivityIndicator size="large" color="gray" />;
    }

    return (
      <View>
        {item.Kid.map((kid) => {
          return (
            <Pressable
              key={kid.id}
              onPress={(e) => {
                setSelectedItem(kid);
              }}
            >
              <View style={styles.itemContainer}>
                <Text style={styles.itemText}>
                  {item.order} - {kid.name}
                </Text>
                <Text style={styles.itemText}>{kid.dropOffAddress}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const getOrderAddress = async () => {
    try {
      // Fetch the address list filtered by routeId
      const { data: addressListsData, error: addressError } = await supabase
        .from("drop_off_address_order")
        .select("*")
        .eq("routeId", currentRouteData.id);

      if (addressError) {
        throw addressError;
      }
      // Sort the address list by order
      const sortedAddressList = addressListsData.sort(
        (a, b) => a.order - b.order
      );
      // Fetch kid data for each address and combine them
      const addressListWithKids = await Promise.all(
        sortedAddressList.map(async (addressListItem) => {
          try {
            const { data: kidData, error: kidError } = await supabase
              .from("students")
              .select(`*, students_address(*)`) //.select("*")
              .eq("id", addressListItem.studentId)
              .single();

            if (kidError) {
              console.error("Error fetching Kid data", kidError);
              return addressListItem;
            }

            return {
              ...addressListItem,
              Kid: kidData,
            };
          } catch (kidError) {
            console.error("Error fetching Kid data", kidError);
            return addressListItem;
          }
        })
      );

      // Group addresses by their latitude and longitude
      const groupedAddressList = new Map();

      addressListWithKids.forEach((address) => {
        //console.log("addressListWithKids", addressListWithKids);
        const latitude = address.Kid.students_address[0].lat;
        const longitude = address.Kid.students_address[0].lng;
        const locationKey = `${latitude}_${longitude}`;

        if (!groupedAddressList.has(locationKey)) {
          groupedAddressList.set(locationKey, {
            ...address,
            Kid: [],
            latitude,
            longitude,
          });
        }

        const groupedAddress = groupedAddressList.get(locationKey);
        groupedAddress.Kid.push(address.Kid);
      });

      // Convert the grouped addresses map to an array
      const uniqueAddressList = Array.from(groupedAddressList.values());

      // Update the state with the processed address list
      //console.log("uniqueAddressList", uniqueAddressList);

      setAddressList(uniqueAddressList);
    } catch (error) {
      console.error("Error fetching getOrderAddress: ", error);
    }
  };

  const handleNextWaypoint = async () => {
    setIsVanArrived(false);
    const nextWaypointIndex = currentWaypointIndex + 1;
    setCurrentWaypointIndex(nextWaypointIndex);
    setNotificationSent(false);
    setNotificationToDriver(false);
    //update the origin to the new bus location
    setOrigin({
      latitude: busLocation.latitude,
      longitude: busLocation.longitude,
    });
    const newDestination = {
      latitude: addressList[nextWaypointIndex].latitude,
      longitude: addressList[nextWaypointIndex].longitude,
    };
    setDestination(newDestination);
    // update the route (currentDestination)
    await updateAddressListStatus(
      addressList[currentWaypointIndex].id,
      "FINISHED"
    );
    await updateAddressListStatus(
      addressList[nextWaypointIndex].id,
      "IN_PROGRESS"
    );
    await updateRouteNextDestination(addressList[nextWaypointIndex].id);

    // remove past waypoints from addresslist
    setAddressList((prevAddressList) => {
      return prevAddressList.slice(currentWaypointIndex);
    });
  };

  const getParentsInfo = async () => {
    if (currentRouteData?.Kid) {
      for (const kid of currentRouteData.Kid) {
        await fetchParentsInfoForKid(kid);
      }
    }
    if (addressList) {
      for (const kid of addressList) {
        if (kid.Kid) {
          for (const nestedKid of kid.Kid) {
            await fetchParentsInfoForKid(nestedKid);
          }
        }
      }
    }
  };

  const fetchParentsInfoForKid = async (kid) => {
    try {
      if (kid.parent1Id !== null) {
        const { data: parent1Data, error: parent1Error } = await supabase
          .from("users")
          .select("*")
          .eq("id", kid.parent1Id)
          .single();

        if (parent1Error) {
          throw parent1Error;
        }

        kid.Parent1 = parent1Data;
      }
      if (kid.parent2Id !== null) {
        const { data: parent2Data, error: parent2Error } = await supabase
          .from("users")
          .select("*")
          .eq("id", kid.parent2Id)
          .single();

        if (parent2Error) {
          throw parent2Error;
        }

        kid.Parent2 = parent2Data;
      }
    } catch (error) {
      console.error("Error fetching parents info: ", error);
    }
  };

  const getStaffInfo = async () => {
    if (currentRouteData.driverUser) {
      setDriver(currentRouteData.driverUser);
    }
    if (currentRouteData.helperUser) {
      setHelper(currentRouteData.helperUser);
    }
    // if (currentRouteData.driver) {
    //   const driverData = await API.graphql({
    //     query: getUser,
    //     variables: { id: currentRouteData.driver },
    //   });
    //   setDriver(driverData.data.getUser);
    //   if (currentRouteData.helper !== null) {
    //     const helperData = await API.graphql({
    //       query: getUser,
    //       variables: { id: currentRouteData.helper },
    //     });
    //     setHelper(helperData.data.getUser);
    //   }
    // }
  };

  const showDriveConfirmationMessage = () => {
    setShowDriveConfirmation(true);
  };

  const updateAddressListStatus = async (id, status) => {
    try {
      let input = { id: id, status: status };
      //input.departTime = formattedTime;
      const response = await API.graphql({
        query: updateAddressList,
        variables: { input },
      });
    } catch (error) {
      console.error("error on updating the addresslist status");
    }
  };

  const zoomInOnDriver = () => {
    mapRef.current.animateToRegion({
      latitude: busLocation.latitude,
      longitude: busLocation.longitude,
      latitudeDelta: 0.0007,
      longitudeDelta: 0.0007,
    });
  };

  const updateRouteStatus = async (status) => {
    try {
      const currentTime = new Date();
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      const ampm = hours >= 12 ? "pm" : "am";
      const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const formattedTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

      let input = { status };

      if (status === "IN_PROGRESS") {
        input.departTime = formattedTime;
        setCurrentRouteData((prevData) => ({
          ...prevData,
          status,
          departTime: formattedTime,
        }));
      } else if (status === "FINISHED") {
        input.finishedTime = formattedTime;
        setCurrentRouteData((prevData) => ({
          ...prevData,
          status,
          finishedTime: formattedTime,
        }));
      }

      const { data, error } = await supabase
        .from("drop_off_route")
        .update(input)
        .eq("id", currentRouteData.id);

      if (error) throw error;

      if (status === "FINISHED") {
        Alert.alert(
          "Route Finished",
          "You have successfully completed the route!",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("DropOffList");
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error updating route", error);
    }
  };

  const updateRouteNextDestination = async (nextWaypoint) => {
    try {
      const input = { currentDestination: nextWaypoint };

      const { data, error } = await supabase
        .from("drop_off_route")
        .update(input)
        .eq("id", currentRouteData.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating route", error);
    }
  };

  const handleDriveConfirmationResponse = async (response) => {
    setDriveConfirmationResponse(response);
    setShowDriveConfirmation(false);

    // Handle the user's response
    if (response === "Confirm") {
      setDriverAction("Drive");
      // send push notification to user app
      bottomSheetRef.current?.collapse();
      sendNotificationToAllParents();
      setNotificationSent(false);
      setShowDriveButton(false); // Hide the Drive button
      // update the route status
      await updateRouteStatus("IN_PROGRESS");
      setRouteStatus("IN_PROGRESS");
      setHandlingNextWaypoint(true);
      await updateAddressListStatus(
        addressList[currentWaypointIndex].id,
        "IN_PROGRESS"
      );
      zoomInOnDriver();
      const currentDestination = addressList[currentWaypointIndex].id;
      await updateRouteNextDestination(currentDestination);
      // Create an array of waypoint coordinates
      const waypoints = addressList.map((address) => {
        return `${address.latitude},${address.longitude}`;
      });
      //
      // Separate the first address as the origin
      const origin = `${busLocation.latitude},${busLocation.longitude}`;
      // Separate the last address as the destination
      const destination = waypoints.pop();
      // Join the remaining waypoints into a single string separated by "|"
      const waypointsString = waypoints.join("|");
      // Construct the Google Maps URL with the origin and waypoints
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}&waypoints=${waypointsString}`;
      // Open Google Maps with the origin and waypoints pre-set
      Linking.openURL(googleMapsUrl);
    }
  };

  const currentDateTime = new Date(); // Get the current date and time
  currentDateTime.setMinutes(currentDateTime.getMinutes() + totalMinutes); // Add the totalMinutes to the current time

  const timeArrival = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const fetchCurrentRouteData = async () => {
    const routeWithId = routesData.find((route) => route.id === id);
    setCurrentRouteData(routeWithId);
  };

  const handleContinue = async () => {
    await setIsVanArrived(false);
    await setShowArrivedModal(false);
    await setShowContinueButton(false);
    await setShowDriveButton(true);
    await handleNextWaypoint();
  };

  const handleFinish = async () => {
    setIsVanArrived(false);
    setShowArrivedModal(false);

    await updateRouteStatus("FINISHED");
  };

  const getRouteStatus = async () => {
    const routeStatus = currentRouteData.status;

    if (routeStatus === "IN_PROGRESS") {
      const currentDestinationId = currentRouteData.currentDestination;

      const currentWaypoint = addressList.find(
        (destination) => destination.id === currentDestinationId
      );

      if (currentWaypoint) {
        const currentOrder = currentWaypoint.order - 1;
        setDestination({
          latitude: currentWaypoint.latitude,
          longitude: currentWaypoint.longitude,
        });
        setCurrentWaypointIndex(currentWaypointIndex + currentOrder);
        setResumeButton(true);
      } else {
        console.error("Unable to find the current destination ID");
      }
    }

    setRouteStatus(routeStatus);
  };

  const handleResumeRoute = async () => {
    setDriverAction("Drive");

    //if (driverAction === "Drive") {
    // send push notification to user app
    bottomSheetRef.current?.collapse();

    setHandlingNextWaypoint(true);
    zoomInOnDriver();
  };

  const calculateBearing = (startLat, startLng, endLat, endLng) => {
    const startLatRad = degreesToRadians(startLat);
    const startLngRad = degreesToRadians(startLng);
    const endLatRad = degreesToRadians(endLat);
    const endLngRad = degreesToRadians(endLng);

    const dLng = endLngRad - startLngRad;

    const x = Math.sin(dLng) * Math.cos(endLatRad);
    const y =
      Math.cos(startLatRad) * Math.sin(endLatRad) -
      Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(dLng);

    const bearing = Math.atan2(x, y);
    const bearingDegrees = radiansToDegrees(bearing);

    return bearingDegrees;
  };

  const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;
  const radiansToDegrees = (radians) => (radians * 180) / Math.PI;

  /////
  /////   starting the useEffects ///
  /////

  const goBack = () => {
    if (driverAction !== "Drive") {
      navigation.navigate("DropOffList");
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
              navigation.navigate("DropOffList");
            },
          },
        ]
      );
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title: "Drop off map",
      headerLeft: () => (
        <TouchableOpacity onPress={goBack}>
          <FontAwesome name="arrow-left" size={23} color="#fff" left={13} />
        </TouchableOpacity>
      ),
    });
  }, [route]);

  useEffect(() => {
    requestLocationPermissions();
  }, []);

  useEffect(() => {
    if (!foregroundLocationPermission && !backgroundLocationPermission) {
      return;
    }
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (!status === "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: 5 });
      setBusLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();

    const foregroundSubscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
      },
      (updatedLocation) => {
        setBusLocation({
          latitude: updatedLocation.coords.latitude,
          longitude: updatedLocation.coords.longitude,
        });
      }
    );
    return () => foregroundSubscription;
  }, [foregroundLocationPermission, backgroundLocationPermission]);

  //get the current route (by id)
  useEffect(() => {
    if (routesData) {
      fetchCurrentRouteData();
    }
  }, [routesData, id]);

  //get the driver and helper info
  useEffect(() => {
    if (currentRouteData) {
      getStaffInfo();
    }
  }, [currentRouteData]);

  // get the Addresslist
  useEffect(() => {
    if (currentRouteData) {
      getOrderAddress();
    }
  }, [currentRouteData]);

  //get parents of kids on route info
  useEffect(() => {
    if (currentRouteData) {
      getParentsInfo();
    }
  }, [currentRouteData, addressList]);

  //set the origin and destination
  useEffect(() => {
    if (
      !busLocation ||
      !addressList ||
      currentWaypointIndex >= addressList.length
    ) {
      return;
    }

    const origin = busLocation;
    setOrigin(origin);

    const destination = {
      latitude: addressList[currentWaypointIndex].latitude,
      longitude: addressList[currentWaypointIndex].longitude,
    };

    setDestination(destination);

    if (!origin || !destination) {
      console.error("Origin or destination is undefined.");
      return;
    }

    const nextWaypoints =
      currentWaypointIndex < addressList.length - 1
        ? [
            {
              latitude: addressList[currentWaypointIndex + 1].latitude,
              longitude: addressList[currentWaypointIndex + 1].longitude,
            },
          ]
        : [];

    setNextWaypoints(nextWaypoints);
  }, [addressList, currentWaypointIndex, busLocation]);

  // show the arrived modal if the driver is in the waypoint
  useEffect(() => {
    if (isVanArrived && driverAction === "Drive") {
      setIsVanArrived(false);
      //setShowDriveButton(false);
      setShowArrivedModal(true);
      setArrivedAddress(addressList[currentWaypointIndex]);
    }
    if (!isVanArrived && !driverAction === "Drive") {
      setShowDriveButton(true);
    }
  }, [isVanArrived]);

  //get route status
  useEffect(() => {
    if (currentRouteData && addressList) {
      getRouteStatus();
    }
  }, [currentRouteData, addressList]);

  useEffect(() => {
    if (busLocation && addressList) {
      // Calculate the bearing angle between the current and next locations
      const bearing = calculateBearing(
        busLocation.latitude,
        busLocation.longitude,
        addressList[currentWaypointIndex].latitude,
        addressList[currentWaypointIndex].longitude
      );

      // Animate the map to the next location and rotate it based on the bearing
      if (mapRef.current) {
        mapRef.current.animateCamera({
          center: {
            latitude: busLocation.latitude,
            longitude: busLocation.longitude,
          },
          heading: bearing,
          pitch: 0,
          //altitude: 1000, // You can adjust the altitude as needed
          //zoom: 25, // You can adjust the zoom level as needed
        });
      }
    }
  }, [busLocation, addressList, mapRef.current]);

  ///
  /// finish the use effects
  //

  if (!foregroundLocationPermission) {
    //|| !backgroundLocationPermission) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }

  if (!busLocation || !currentRouteData) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }

  if (addressList === null || origin === null || destination === null) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }

  function generateMarkerTitle(kids) {
    return kids.map((kid) => kid.name).join(" and ") + " Houses";
  }

  function generateMarkerDescription(kids) {
    return kids.map((kid) => kid.dropOffAddress).join("\n");
  }

  //
  /// jsx return
  //

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        //provider={PROVIDER_GOOGLE}
        style={{ width, height: "100%" }}
        //showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={false}
        //followsUserLocation={true}
        initialRegion={{
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          latitudeDelta: 0.07,
          longitudeDelta: 0.07,
        }}
      >
        {origin && destination && (
          <MapViewDirections
            //key={index}
            apikey={GOOGLE_MAPS_APIKEY}
            origin={{ latitude: origin.latitude, longitude: origin.longitude }}
            destination={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            mode={"DRIVING"}
            precision="high"
            strokeWidth={5}
            strokeColor="blue"
            timePrecision="now"
            onReady={(result) => {
              const isClose = result.duration <= 5;
              if (isClose && !notificationSent && driverAction === "Drive") {
                setNotificationSent(true);
                sendNotificationToNextParents(result.duration);
              }
              setTotalMinutes(result.duration);
              setTotalKm(result.distance);

              if (result.distance <= 0.1) {
                if (!notificationToDriver) {
                  setNotificationToDriver(true);
                  sendPushNotification(
                    expoPushToken?.data,
                    "Arrived!",
                    `Driver you arrived at ${addressList[currentWaypointIndex].Kid[0].name} house! `
                  );
                }

                setHandlingNextWaypoint(true);
                //setShowDriveButton(false);
                setShowContinueButton(true);
                setIsVanArrived(true);

                //handleNextWaypoint();
              } else {
                setIsVanArrived(false);
              }
            }}
          />
        )}
        <Marker
          coordinate={{
            latitude: busLocation.latitude,
            longitude: busLocation.longitude,
          }}
          title={"Gracie Barra Bus"}
          description={`${currentRouteData.Van.name} - ${currentRouteData.Van.model}`}
        >
          <View style={{ padding: 5 }}>
            <FontAwesome name="bus" size={30} color="green" />
          </View>
        </Marker>
        {addressList.map((waypoint, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
            }}
            title={generateMarkerTitle(waypoint.Kid)}
            description={generateMarkerDescription(waypoint.Kid)}
          >
            <View
              style={{
                backgroundColor: "white",
                padding: 3,
                borderRadius: 10,
                borderColor: "black",
                borderWidth: 1, // Add border width
              }}
            >
              <Text style={{ color: "black" }}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      <TouchableOpacity style={styles.zoomButton} onPress={zoomInOnDriver}>
        <MaterialIcons name="place" size={20} color="white" />
      </TouchableOpacity>
      <LocationTrackingComponent
        locationEmitter={locationEmitter}
        routeID={currentRouteData.id}
      />

      <RouteInfoComponent
        currentRoute={currentRouteData}
        addressList={addressList}
        driver={driver}
        helper={helper}
        driverAction={driverAction}
        //setDriverAction={setDriverAction}
        currentWaypoint={currentWaypointIndex}
        isBottomSheetExpanded={isBottomSheetExpanded}
      />

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        handleIndicatorStyle={styles.handleIndicator}
        onChange={handleSheetChanges}
      >
        <View style={styles.handleIndicatorContainer}>
          <Text style={styles.routeDetailsText}>
            {" "}
            ETA {timeArrival} - {totalMinutes.toFixed(0)} min
          </Text>
          <FontAwesome5
            name="bus"
            size={30}
            color="#3fc060"
            style={{ marginHorizontal: 10 }}
          />
          <Text style={styles.routeDetailsText}>{totalKm.toFixed(2)} Km</Text>
        </View>
        <Text style={{ textAlign: "center", padding: 5, marginBottom: 5 }}>
          Kids on the Route
        </Text>

        <View
          style={{
            flex: 1,
            color: "red",
          }}
        >
          <BottomSheetFlatList
            data={addressList}
            renderItem={renderKidsItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ backgroundColor: "white" }}
          />

          <Modal
            visible={showArrivedModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              setShowArrivedModal(false);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text>{`You arrived at ${arrivedAddress?.Kid[0]?.name} house's, Click Continue to next destination.`}</Text>
                {currentWaypointIndex === addressList.length - 1 ? (
                  <Pressable onPress={handleFinish} style={styles.finishButton}>
                    <Text style={styles.finishButtonText}>Finish</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleContinue}
                    style={styles.continueButton}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowArrivedModal(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal
            visible={selectedItem !== null}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              setSelectedItem(null);
            }}
            //presentationStyle="overFullScreen"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {/* Render the popup content here with information about selectedItem */}
                {selectedItem && (
                  <View>
                    <Text>
                      <Text style={{ fontWeight: "bold" }}>Kid Name:</Text>{" "}
                      {selectedItem.name}
                    </Text>
                    <Text>
                      <Text style={{ fontWeight: "bold" }}>Parent name:</Text>{" "}
                      {selectedItem.Parent1?.name}
                    </Text>
                    {/* <Text>
                      <Text style={{ fontWeight: "bold" }}>Unit Number:</Text>{" "}
                      {selectedItem.Parent1?.unitNumber}
                    </Text> */}
                    <Text>
                      <Text style={{ fontWeight: "bold" }}>Address: </Text>
                      {selectedItem.students_address[0]?.addressLine1}
                      {selectedItem.students_address[0]?.addressLine2
                        ? `, ${selectedItem.students_address[0]?.addressLine2}`
                        : ""}
                    </Text>
                    {selectedItem.students_address[0]?.addressNotes ? (
                      <Text>
                        <Text style={{ fontWeight: "bold" }}>Notes: </Text>
                        {selectedItem.students_address[0]?.addressNotes}
                      </Text>
                    ) : null}
                    {/* <Text>
                      <Text style={{ fontWeight: "bold" }}>Comments:</Text>{" "}
                      {selectedItem.commentsAddress}
                    </Text> */}
                    <Text>
                      <Text style={{ fontWeight: "bold" }}>Phone number:</Text>{" "}
                      {selectedItem.Parent1?.phoneNumber}
                    </Text>
                    <Pressable
                      onPress={() => {
                        // Handle the action to call the parent here
                        const phoneNumber = selectedItem.Parent1?.phoneNumber;
                        const phoneNumberWithPrefix = `tel:${phoneNumber}`;

                        Linking.canOpenURL(phoneNumberWithPrefix)
                          .then((supported) => {
                            if (!supported) {
                              console.error("Phone number not supported");
                            } else {
                              return Linking.openURL(phoneNumberWithPrefix);
                            }
                          })
                          .catch((error) => console.error(error));
                      }}
                      style={styles.callParentButton}
                    >
                      <Text style={styles.callParentButtonText}>
                        Call Parent
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSelectedItem(null); // Close the popup when pressed
                      }}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeButtonText}>Close</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </View>
        <View style={styles.buttonDriveContainer}>
          {currentUserData.id === currentRouteData.driver &&
            showDriveButton &&
            routeStatus !== "IN_PROGRESS" && (
              <TouchableOpacity
                onPress={async () => {
                  showDriveConfirmationMessage();
                }}
                style={{
                  backgroundColor: "green",
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 40,
                }}
              >
                <Text style={{ color: "white", fontSize: 20 }}>Drive</Text>
              </TouchableOpacity>
            )}
          {handlingNextWaypoint &&
            isVanArrived &&
            driverAction === "Drive" &&
            showContinueButton && (
              <>
                {currentWaypointIndex === addressList.length - 1 ? (
                  // If the current waypoint is the last one, render "Finish" button
                  <TouchableOpacity
                    onPress={() => {
                      handleFinish();
                    }}
                    style={{
                      backgroundColor: "green",
                      padding: 10,
                      borderRadius: 10,
                      marginBottom: 20,
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 20 }}>Finish</Text>
                  </TouchableOpacity>
                ) : (
                  // Otherwise, render "Continue" button
                  <TouchableOpacity
                    onPress={() => {
                      //console.log("isVanArrived", isVanArrived);
                      handleContinue();
                    }}
                    style={{
                      backgroundColor: "blue",
                      padding: 10,
                      borderRadius: 10,
                      marginBottom: 20,
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 20 }}>
                      Continue
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

          {routeStatus === "IN_PROGRESS" &&
            driverAction !== "Drive" &&
            currentUserData.id === currentRouteData.driver &&
            showResumeButton && (
              <TouchableOpacity
                onPress={() => {
                  // Handle the "Resume Route" action
                  handleResumeRoute();
                }}
                style={{
                  backgroundColor: "green",
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 40,
                }}
              >
                <Text style={{ color: "white", fontSize: 20 }}>
                  Resume Route
                </Text>
              </TouchableOpacity>
            )}

          <ShowMessage
            visible={showDriveConfirmation}
            message={confirmationMessage}
            buttons={["Confirm", "Cancel"]}
            onResponse={handleDriveConfirmationResponse}
          />
        </View>
      </BottomSheet>
    </View>
  );
};

export default DropOffRouteScreen;
