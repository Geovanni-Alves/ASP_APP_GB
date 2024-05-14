import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { API } from "aws-amplify";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { listKids } from "../../graphql/queries";
import { updateKid } from "../../graphql/mutations";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePicturesContext } from "../../contexts/PicturesContext";
import styles from "./styles";
//import SideDrawer from "../SideDrawer/SideDrawer";
import { differenceInHours } from "date-fns";
const PickScreen = () => {
  const { userEmail } = useAuthContext();
  const { savePhotoInBucket, getPhotoInBucket } = usePicturesContext();

  const [kids, setKids] = useState([]);
  const [actualPhotos, setActualPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  //const [isSideDrawerVisible, setSideDrawerVisible] = useState(false);
  const getKidPhotos = async () => {
    try {
      setLoadingPhotos(true);

      const photosPromises = kids.map(async (kidItem) => {
        if (kidItem.photo) {
          const imageURL = await getPhotoInBucket(kidItem.photo);
          return { id: kidItem.id, imageURL };
        }
        return null;
      });

      const photos = await Promise.all(photosPromises);
      setActualPhotos(photos.filter((photo) => photo !== null));
    } finally {
      setLoadingPhotos(false);
    }
  };

  const fetchKidData = async () => {
    if (userEmail) {
      try {
        const variables = {
          filter: {
            or: [
              { parent1Email: { eq: userEmail } },
              { parent2Email: { eq: userEmail } },
            ],
          },
        };
        const response = await API.graphql({
          query: listKids,
          variables: variables,
        });
        const fetchedKids = response.data.listKids.items;
        //console.log(fetchedKids);

        if (fetchedKids.length !== 0) {
          setKids(fetchedKids);
        }
        // setKids(response.data.listKids.items);
      } catch (error) {
        console.error("Error fetching kids:", error);
      } finally {
        //setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    await fetchKidData();
    await getKidPhotos();
    setRefreshing(false);
  };
  useEffect(() => {
    if (kids) {
      getKidPhotos();
    }
  }, [kids]);

  const updateKidImage = async (kid, fileName) => {
    try {
      const kidDetails = {
        id: kid,
        photo: fileName,
      };

      // const updatedKid = await API.graphql(
      //   graphqlOperation(updateKid, { input: kidDetails })
      // );

      const updatedKid = await API.graphql({
        query: updateKid,
        variables: { input: kidDetails },
      });
    } catch (error) {
      console.error("Error saving image:", error);
    }
  };

  const handleChangePhoto = async (kidId) => {
    try {
      setLoading(true);
      const { filename, result } = await savePhotoInBucket(
        `kid-photo-${kidId}-${Date.now()}`
      );
      //console.log(result.canceled);
      if (result) {
        await updateKidImage(kidId, filename);
        alert("Image successfully updated!!");
        //await getKidPhotos();
        await fetchKidData();
      } else {
        console.log("Image selection canceled or encountered an error");
        // Handle the case where the user canceled or an error occurred
      }
    } catch (error) {
      console.log("Error saving image to storage", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    const nameArray = name.split(" ");
    return nameArray
      .map((word) => word[0])
      .join("")
      .toUpperCase();
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

  // const toggleSideDrawer = () => {
  //   setSideDrawerVisible(!isSideDrawerVisible);
  // };

  const updateCheckedInStatus = async (kidId, checkedInStatus) => {
    try {
      const response = await API.graphql({
        query: updateKid,
        variables: {
          input: {
            id: kidId,
            checkedIn: checkedInStatus,
          },
        },
      });
      //console.log("Backend updated:", response.data.updateKid);
    } catch (error) {
      console.error("Error updating backend:", error);
    }
  };

  const renderKidItem = ({ item }) => {
    const lastCheckInTime = item.lastCheckIn
      ? new Date(item.lastCheckIn)
      : null;
    const isLastCheckInExpired =
      lastCheckInTime && differenceInHours(new Date(), lastCheckInTime) > 8;

    if (isLastCheckInExpired) {
      updateCheckedInStatus(item.id, false);
      item.checkedIn = false;
    }
    return (
      <View key={item.id} style={styles.kidContainer}>
        <View style={styles.kidInfoContainer}>
          <Text style={styles.kidName}>Name: {item.name}</Text>
          <Text style={styles.kidAddress}>Address: {item.dropOffAddress}</Text>
        </View>
        <View style={styles.photoContainer}>
          {actualPhotos &&
          actualPhotos.length > 0 &&
          actualPhotos.find((photo) => photo.id === item.id)?.imageURL ? (
            <Image
              style={styles.kidPhoto}
              source={{
                uri: actualPhotos.find((photo) => photo.id === item.id)
                  .imageURL,
              }}
            />
          ) : (
            <View style={styles.initialsContainer}>
              <Text style={styles.initialsText}>{getInitials(item.name)}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => handleChangePhoto(item.id)}>
            <View style={styles.button}>
              <MaterialIcons
                name="add-photo-alternate"
                size={40}
                color="#FF7276"
              />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.cardSeparator} />
        <View style={styles.checkInStatus}>
          <Text style={{ color: item.checkedIn ? "green" : "red" }}>
            {item.checkedIn ? "Checked In" : "Not Checked In"}
          </Text>
        </View>
      </View>
    );
  };
  if (!kids) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }
  return (
    <View>
      {loading && (
        <ActivityIndicator
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 999,
          }}
          size="large"
          color="#0000ff"
        />
      )}
      {loadingPhotos ? (
        <ActivityIndicator style={{ padding: 50 }} size={"large"} />
      ) : (
        <View style={styles.container}>
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
          <View>
            <FlatList
              data={kids}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={fetchKidData}
                />
              }
              renderItem={renderKidItem}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default PickScreen;
