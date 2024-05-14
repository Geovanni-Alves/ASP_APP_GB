import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import styles from "./styles";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useRouteContext } from "../../../src/contexts/RouteContext";
import { useAuthContext } from "../../../src/contexts/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Auth } from "aws-amplify";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";

const HomeScreen = () => {
  const { routesData, updateRoutesData } = useRouteContext();
  const { currentUserData } = useAuthContext();
  const { unreadMessages  } = useMessageContext();
  const { kids } = useKidsContext();


  const [images, setImages] = useState({});
  const navigation = useNavigation();
  const defaultImageUrl = "https://i.imgur.com/R2PRpbV.jpg";
  const [assignedRoute, setAssignedRoute] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [msgsCount, setMsgsCount] = useState(0);

  // useEffect to fetch and update the message count
  useEffect(() => {
    if (unreadMessages && kids) {
      // Count the number of unread messages
      try {
        const unreadCount = unreadMessages.filter(message =>
          kids.some(kid => !message.isRead && message.senderID === kid.id)
        ).length;
        //console.log("unreadMessages", unreadCount);
        setMsgsCount(unreadCount);
      } catch (error) {
        console.log("error updating the unread Message", error);
      }
    }
  }, [unreadMessages,kids]);

  const fetchImage = async (imageURL) => {
    try {
      const response = await fetch(imageURL);
      return response.url;
    } catch (error) {
      console.error("Error fetching image", error);
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await Auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const fetchData = async () => {
    setRefreshing(true);
    //console.log("unread messages ", unreadMessages);
    await updateRoutesData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (routesData) {
      // Fetch images for each route
      const imagePromises = routesData.map((route) => {
        const imageURL = route.Van.image;
        if (imageURL) {
          return fetchImage(imageURL);
        }
      });

      Promise.all(imagePromises)
        .then((fetchedImages) => {
          const imagesMap = {};
          fetchedImages.forEach((image, index) => {
            imagesMap[index] = image;
          });
          setImages(imagesMap);
        })
        .catch((error) => {
          console.error("Error fetching images", error);
        });
    }
  }, [routesData]);

  useEffect(() => {
    if (currentUserData && routesData) {
      // Check if the user is a Driver
      if (currentUserData.userType === "DRIVER") {
        // Find the route where the current user is assigned as the Driver
        const driverAssignedRoute = routesData.find(
          (route) => route.driver === currentUserData.id
        );

        setAssignedRoute(driverAssignedRoute);
      } else if (currentUserData.userType === "STAFF") {
        // Find the route where the current user is assigned as the Driver
        const helperAssignedRoute = routesData.find(
          (route) => route.helper === currentUserData.id
        );

        setAssignedRoute(helperAssignedRoute);
      }
    }
  }, [currentUserData, routesData]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  if (!routesData) {
    return <ActivityIndicator size="large" color="gray" />;
  }

  const handleBusPress = (item, index) => {
    navigation.navigate("Route", { id: item.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate("Chat")}
          >
            <MaterialCommunityIcons
              name="message-text-outline"
              size={25}
              color="white"
            />
            {msgsCount > 0 && (
              <View style={styles.messageCountBadge}>
                <Text style={styles.messageCountText}>
                  {msgsCount} New {msgsCount === 1 ? "Message" : "Messages"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.checkBtn}>
            <TouchableOpacity onPress={() => navigation.navigate("CheckIn")}>
              <MaterialIcons name="account-box" size={20} color="black" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerGreetings}>
          <Text style={styles.title}>{`Hello, ${currentUserData?.name}`}</Text>

          <Text style={styles.subTitle}>
            You are assigned as{" "}
            <Text
              style={{
                color: currentUserData?.userType === "DRIVER" ? "red" : "blue",
              }}
            >
              {currentUserData?.userType === "DRIVER" ? "Driver" : "Helper"}
            </Text>
            {assignedRoute && (
              <Text> on {`(${assignedRoute?.Van.name})`} </Text>
            )}
          </Text>
          <Text style={styles.subTitleDropOff}>List of Drop-Off's</Text>
        </View>
      </View>
      <View style={styles.busContainer}>
        <FlatList
          data={routesData}
          style={{ padding: 2 }}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <View style={styles.noRoutesContainer}>
              <Text style={styles.noRoutesText}>
                Sorry, but there are no routes available.
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={updateRoutesData}
            />
          }
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => {
                handleBusPress(item, index);
              }}
            >
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Image
                    source={
                      images[index]
                        ? { uri: images[index] }
                        : { uri: defaultImageUrl }
                    }
                    style={styles.cardImg}
                  />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      Vehicle: {item.Van.name} {item.Van.model}
                    </Text>
                  </View>
                  <View style={styles.driverHelperContainer}>
                    {item.driverUser && ( // Render "Driver" and "Helper" only if driverUser is not null
                      <Text style={{ marginRight: 10 }}>
                        Driver: {item.driverUser?.name}
                      </Text>
                    )}
                    {item.helperUser && ( // Render "Helper" only if helperUser is not null
                      <Text>Helper: {item.helperUser?.name}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>
                    {item.status === "WAITING_TO_START" && (
                      <Text style={{ color: "green" }}>Waiting to start</Text>
                    )}
                    {item.status === "IN_PROGRESS" && (
                      <Text style={{ color: "blue" }}>
                        In progress - Departed Time{" "}
                        {routesData[index].departTime}
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
