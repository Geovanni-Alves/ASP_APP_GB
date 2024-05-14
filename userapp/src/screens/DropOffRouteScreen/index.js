import { useRef, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  Pressable,
  Modal,
  SafeAreaView,
} from "react-native";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import styles from "./styles";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_MAPS_APIKEY } from "@env";
import { useNavigation } from "@react-navigation/native";
import { useRouteContext } from "../../contexts/RouteContext";
//import { Auth } from "aws-amplify";
import houseIcon from "../../../assets/icon-house.png";
import vanIcon from "../../../assets/van.png";
//import SideDrawer from "../SideDrawer/SideDrawer";

const DropOffRouteScreen = () => {
  //const { kids, dbUser, currentUserData, userEmail } = useAuthContext();
  const {
    driver,
    helper,
    currentRouteData,
    dropOffLatLng,
    dropOffAddress,
    matchingKids,
    busLocation,
    isLoading,
    isRouteInProgress,
    //noKidsAvailable,
    addressList,
  } = useRouteContext();

  const [selectedItem, setSelectedItem] = useState(null);
  const bottomSheetRef = useRef(null);
  const mapRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [strokeColor, setStrokeColor] = useState("rgba(0, 0, 0, 0)");
  // const [isDropdownVisible, setDropdownVisible] = useState(false);
  // const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const snapPoints = useMemo(() => ["12%", "95%"], []);
  const navigation = useNavigation();
  //const [isSideDrawerVisible, setSideDrawerVisible] = useState(false);

  const LoadingScreen = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text>Loading...</Text>
    </View>
  );

  const currentDateTime = new Date(); // Get the current date and time
  currentDateTime.setMinutes(currentDateTime.getMinutes() + totalMinutes); // Add the totalMinutes to the current time

  const timeArrival = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const zoomInOnDriver = () => {
    mapRef.current.animateToRegion({
      latitude: busLocation.latitude,
      longitude: busLocation.longitude,
      latitudeDelta: 0.0007,
      longitudeDelta: 0.0007,
    });
  };

  // const handleLogout = async () => {
  //   try {
  //     // Sign out the user using Amplify Auth
  //     await Auth.signOut();
  //   } catch (error) {
  //     console.error("Logout error:", error);
  //   } finally {
  //     setDropdownVisible(false);
  //     setLogoutModalVisible(false);
  //   }
  // };
  // const toggleDropdown = () => {
  //   setDropdownVisible(!isDropdownVisible);
  //   setLogoutModalVisible(false);
  // };
  // const toggleLogoutModal = () => {
  //   setLogoutModalVisible(!isLogoutModalVisible);
  //   setDropdownVisible(false);
  // };

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

  ///
  /// Start UseEffect
  ///
  useEffect(() => {
    if (busLocation) {
      // Calculate the bearing angle between the current and next locations
      const bearing = calculateBearing(
        busLocation.latitude,
        busLocation.longitude,
        dropOffLatLng.latitude,
        dropOffLatLng.longitude
      );

      // Animate the map to the next location and rotate it based on the bearing
      if (mapRef.current) {
        mapRef.current.animateCamera({
          center: {
            latitude: busLocation.latitude,
            longitude: busLocation.longitude,
          },
          heading: bearing,
          // pitch: 0,
          // altitude: 1000, // You can adjust the altitude as needed
          // zoom: 15, // You can adjust the zoom level as needed
        });
      }
    }
  }, [busLocation, dropOffLatLng, mapRef.current]);

  useEffect(() => {
    if (!isRouteInProgress) {
      navigation.navigate("Wait");
    }
  }, [isRouteInProgress]);

  if (!busLocation || !dropOffLatLng || !addressList) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }
  if (isLoading) {
    // Render the loading screen while data is being fetched
    return <LoadingScreen />;
  }

  // if (noKidsAvailable) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <Text>No kids available for today.</Text>
  //     </View>
  //   );
  // }

  const waypoints = addressList.map((address) => ({
    latitude: address.latitude,
    longitude: address.longitude,
  }));

  const dropOffIndex = waypoints.findIndex(
    (waypoint) =>
      waypoint.latitude === dropOffLatLng.latitude &&
      waypoint.longitude === dropOffLatLng.longitude
  );

  const filteredWaypoints =
    dropOffIndex !== -1 ? waypoints.slice(0, dropOffIndex + 1) : null;

  const finalWaypoints =
    filteredWaypoints && filteredWaypoints.length === 1
      ? null
      : filteredWaypoints;

  // const toggleSideDrawer = () => {
  //   setSideDrawerVisible(!isSideDrawerVisible);
  // };

  return (
    <View style={styles.mapContainer}>
      {/* <View style={styles.containerMenu}>
        <TouchableOpacity onPress={toggleSideDrawer}>
          <MaterialIcons name="menu" size={30} color="white" />
        </TouchableOpacity>

        <SideDrawer
          isVisible={isSideDrawerVisible}
          onClose={toggleSideDrawer}
          onLogout={handleLogout}
        />
      </View> */}

      <MapView
        ref={mapRef}
        //provider={MapView.PROVIDER_GOOGLE}
        style={{ width, height }}
        //showsUserLocation={true}
        //followsUserLocation={true}
        initialRegion={{
          latitude: busLocation?.latitude,
          longitude: busLocation?.longitude,
          latitudeDelta: 0.007,
          longitudeDelta: 0.007,
        }}
      >
        <MapViewDirections
          apikey={GOOGLE_MAPS_APIKEY}
          origin={busLocation}
          destination={dropOffLatLng}
          waypoints={finalWaypoints ? finalWaypoints : []}
          mode={"DRIVING"}
          precision="high"
          timePrecision="now"
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          onReady={(result) => {
            const isClose = result.distance <= 2;
            if (isClose) {
              setStrokeWidth(5);
              setStrokeColor("blue");
            } else {
              setStrokeWidth(1);
              setStrokeColor("rgba(0, 0, 0, 0)");
            }
            // Handle the route information here
            //setIsDriverClose(result.distance <= 0.1);
            // console.log(
            //   `Parent ${index + 1}: ETA ${result.duration.toFixed(
            //     0
            //   )} min, Distance ${result.distance.toFixed(2)} Km`
            // );
            setTotalMinutes(result.duration);
            setTotalKm(result.distance);
          }}
        />
        <Marker
          coordinate={{
            latitude: busLocation?.latitude,
            longitude: busLocation?.longitude,
          }}
          title={"Gracie Barra Bus"}
          description={currentRouteData?.Van?.name}
          // icon={vanIcon}
          rotation={calculateBearing(
            busLocation.latitude,
            busLocation.longitude,
            dropOffLatLng.latitude,
            dropOffLatLng.longitude
          )}
        >
          <View style={{ padding: 5 }}>
            <Image source={vanIcon} style={{ width: 55, height: 55 }} />
          </View>
        </Marker>
        <Marker
          coordinate={{
            latitude: dropOffLatLng?.latitude,
            longitude: dropOffLatLng?.longitude, //van.waypoints[address].longitude
          }}
          title={matchingKids.map((kid) => `${kid.name} House's`).join(" - ")}
          // title={`${kids.map((kid) => `${kid.name}`).join(" - ")} House's`} //{kids[0].name} //van.kidsInRoute[address].first_name + " " +van.kidsInRoute[address].last_name + "  House's"}
          description={dropOffAddress}
        >
          <View style={{ padding: 5 }}>
            <Image source={houseIcon} style={{ width: 40, height: 40 }} />
          </View>
        </Marker>
      </MapView>
      <TouchableOpacity style={styles.zoomButton} onPress={zoomInOnDriver}>
        <MaterialIcons name="place" size={24} color="white" />
      </TouchableOpacity>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        handleIndicatorStyle={styles.handleIndicator}
        //topInset={100}
      >
        <View style={styles.handleIndicatorContainer}>
          <Text style={styles.routeDetailsText}>
            {" "}
            ETA {timeArrival} - {totalMinutes.toFixed(0)} min
          </Text>
          <Image source={vanIcon} style={{ width: 40, height: 40 }} />
          <Text style={styles.routeDetailsText}>{totalKm.toFixed(2)} Km</Text>
        </View>
        <View style={{ padding: 5, marginBottom: 1, flex: 1 }}>
          <Text style={{ textAlign: "center", fontSize: 15 }}>
            Kids on the Route ({currentRouteData?.Van?.name} -{" "}
            {currentRouteData?.Van?.model})
          </Text>
          <View style={{ flex: 1, color: "red" }}>
            <BottomSheetFlatList
              data={currentRouteData.Kid}
              renderItem={({ item }) => (
                <View>
                  <View
                    style={{
                      backgroundColor: "white",
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 20, textAlign: "center" }}>
                      {" "}
                      {item.name}
                    </Text>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{
                paddingBottom: 20,
                backgroundColor: "white",
              }}
              ListFooterComponent={() => (
                <View>
                  <View style={styles.container}>
                    <Pressable
                      onPress={(e) => {
                        setSelectedItem(driver);
                      }}
                    >
                      <View style={styles.driverContainer}>
                        <View style={styles.profile}>
                          <Image
                            source={{ uri: driver?.photo }}
                            resizeMethod="scale"
                            resizeMode="contain"
                            style={styles.profileAvatar}
                          />
                          <View style={styles.profileBody}>
                            <Text style={styles.profileName}>
                              {driver?.name}
                            </Text>

                            <Text style={styles.profileHandle}>Driver</Text>
                          </View>
                        </View>
                      </View>
                      {helper && (
                        <View style={styles.driverContainer}>
                          <View style={styles.profile}>
                            <Image
                              source={{ uri: helper?.photo }}
                              resizeMethod="scale"
                              resizeMode="contain"
                              style={styles.profileAvatar}
                            />
                            <View style={styles.profileBody}>
                              <Text style={styles.profileName}>
                                {helper?.name}
                              </Text>

                              <Text style={styles.profileHandle}>Helper</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  </View>
                  <View style={{ alignItems: "center", marginTop: 1 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const phoneNumber = "2368652297";
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
                      style={{
                        backgroundColor: "#FF7276",
                        padding: 10,
                        borderRadius: 10,
                      }}
                    >
                      <View style={styles.callBtn}>
                        <Text style={{ color: "white", fontSize: 20 }}>
                          Call Us{" "}
                        </Text>
                        <MaterialIcons name="call" size={24} color="white" />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
            <Modal
              visible={selectedItem !== null}
              animationType="slide"
              transparent={true}
              onRequestClose={() => {
                setSelectedItem(null);
              }}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f6" }}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    {selectedItem && (
                      <View>
                        <Image
                          source={
                            driver?.photo
                              ? { uri: driver.photo }
                              : { uri: "https://i.imgur.com/5gc6290.jpg" }
                          }
                          style={styles.profileAvatar}
                        />
                        <Text style={styles.profileName}>
                          {selectedItem.name}
                        </Text>
                        <Text>{selectedItem.userType}</Text>
                        <Text style={styles.staffNumber}>
                          {selectedItem.phoneNumber}
                        </Text>
                        <Text style={styles.profileEmail}>
                          {selectedItem.email}
                        </Text>
                        {helper && (
                          <View style={styles.helperDsc}>
                            <Image
                              source={
                                helper?.photo
                                  ? { uri: helper.photo }
                                  : { uri: "https://i.imgur.com/5gc6290.jpg" }
                              }
                              style={styles.profileAvatar}
                            />
                            <Text style={styles.profileName}>
                              {helper.name}
                            </Text>
                            <Text>{helper.userType}</Text>
                            <Text style={styles.staffNumber}>
                              {helper.phoneNumber}
                            </Text>
                            <Text style={styles.profileEmail}>
                              {helper.email}
                            </Text>
                          </View>
                        )}
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
              </SafeAreaView>
            </Modal>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
};

export default DropOffRouteScreen;
