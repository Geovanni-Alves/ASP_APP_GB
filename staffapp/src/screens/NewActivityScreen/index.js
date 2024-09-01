import styles from "./styles";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useNavigation, useRoute } from "@react-navigation/native";
//import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { useKidsContext } from "../../contexts/KidsContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { supabase } from "../../lib/supabase";

const NewActivityScreen = () => {
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [bucketName, setBucketName] = useState(null);
  const [mediaPath, setMediaPath] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { kidId } = route.params || {};
  const { kids } = useKidsContext();
  const { currentUserData } = useUsersContext();

  const handlePhotoPress = () => {
    setCameraMode("photo");
    setBucketName("feedPhotos");
    setCallOpenCamera(true);
  };

  const handleVideoPress = () => {
    setCameraMode("video");
    setBucketName("feedVideos");
    setCallOpenCamera(true);
  };

  function handleRetake() {
    setMediaUris([]);
    setRecordedTime(0);
  }

  // const handleTaggingComplete = (selectedKids) => {
  //   //setTagModalVisible(false);
  //   console.log("Selected kids:", selectedKids);
  //   console.log("Media path:", mediaPath);
  //   // Save the media with the selected kids or proceed as necessary
  //   // navigation.goBack(); // Or navigate to the next screen if needed
  // };

  const handleActivityPress = (activityType) => {
    console.log(`Selected activity: ${activityType}`);
  };

  const handleSelectOption = (paths, selectedKids) => {
    console.log("paths", paths);
    console.log("selectedKids", selectedKids);
    //setMediaPath(path);
    if (selectedKids.length > 0) {
      selectedKids.forEach((kidId) => {
        paths.forEach((path) => {
          const mediaType = cameraMode === "photo" ? "PHOTO" : "VIDEO";
          createNewFeedForKid(kidId, path, mediaType);
        });
      });
    }
  };

  const createNewFeedForKid = async (kidId, mediaPath, mediaType) => {
    try {
      // format correct time
      const currentTime = new Date();
      const year = currentTime.getFullYear();
      const month = String(currentTime.getMonth() + 1).padStart(2, "0");
      const day = String(currentTime.getDate()).padStart(2, "0");
      const hours = String(currentTime.getHours()).padStart(2, "0");
      const minutes = String(currentTime.getMinutes()).padStart(2, "0");
      const seconds = String(currentTime.getSeconds()).padStart(2, "0");

      const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      // Format mediaType to capitalize the first letter and lowercase the rest

      const formattedMediaType =
        mediaType.charAt(0).toUpperCase() + mediaType.slice(1).toLowerCase();

      const feedData = {
        type: mediaType, // "photo" or "video"
        dateTime: formattedTime, // Current date and time
        studentId: kidId,
        mediaName: mediaPath, // Path to the media
        text: `has a new ${formattedMediaType}`, // Text for the feed
        creatorId: currentUserData.id, // Replace with actual creatorId when available
      };

      // Insert the data into the Supabase "kidFeeds" table
      //console.log("feedData", feedData);
      const { data, error } = await supabase
        .from("kidFeeds")
        .insert([feedData]);

      if (error) {
        throw new Error(`Failed to create feed: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error creating feed for kid ${kidId}:`, error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.activityIcons}>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={handlePhotoPress}
            style={styles.cameraIcon}
          >
            <Entypo name="camera" size={45} color="black" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Photo</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={handleVideoPress} style={styles.videoIcon}>
            <Entypo name="video-camera" size={45} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Video</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={() => handleActivityPress("incident")}
            style={styles.patchIcon}
          >
            <Fontisto name="bandage" size={45} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Incident</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={() => handleActivityPress("trophy")}
            style={styles.trophyIcon}
          >
            <MaterialIcons name="workspace-premium" size={45} color="#000080" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Promotions</Text>
        </View>
      </View>
      <OpenCamera
        isVisible={callOpenCamera}
        //onPhotoTaken={handlePhotoTaken}
        onSelectOption={handleSelectOption}
        onClose={() => setCallOpenCamera(false)}
        mode={cameraMode}
        bucketName={bucketName}
        tag={true}
      />
    </View>
  );
};

export default NewActivityScreen;
