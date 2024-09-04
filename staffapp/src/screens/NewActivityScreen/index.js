import styles from "./styles";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
//import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { useKidsContext } from "../../contexts/KidsContext";
import { supabase } from "../../lib/supabase";
import { useFeedContext } from "../../contexts/FeedContext";

const NewActivityScreen = () => {
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [bucketName, setBucketName] = useState(null);
  const [selectedKid, setSelectedKid] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const from = route.params?.from;
  const { id: kidId } = route.params || {};
  const { kids } = useKidsContext();
  const { createNewFeedForKid } = useFeedContext();

  const goBack = () => {
    if (from === "home") {
      navigation.navigate("Home");
    } else {
      navigation.navigate("StudentFeed", { id: kidId });
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack}>
          <FontAwesome name="arrow-left" size={23} color="#fff" left={13} />
        </TouchableOpacity>
      ),
    });
  }, [route]);

  useEffect(() => {
    if (kidId && from === "feed") {
      const foundKid = kids.find((kid) => kid.id === kidId);
      if (foundKid) {
        setSelectedKid(foundKid);
      }
    } else {
      setSelectedKid(null);
    }
  }, [kidId, kids]);

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

  const handleActivityPress = (activityType) => {
    console.log(`Selected activity: ${activityType}`);
    console.log("selectedKid", selectedKid);
  };

  const handleSelectPhotoVideo = (paths, selectedKids) => {
    //setMediaPath(path);
    // console.log("selectedKids", selectedKids);
    // console.log("paths", paths);
    if (selectedKids?.length > 0) {
      selectedKids.forEach((kidId) => {
        paths.forEach((path) => {
          const mediaType = cameraMode === "photo" ? "PHOTO" : "VIDEO";
          createNewFeedForKid(kidId, path, mediaType);
        });
      });
    } else {
      const mediaType = cameraMode === "photo" ? "PHOTO" : "VIDEO";
      createNewFeedForKid(selectedKid.id, paths, mediaType);
    }
  };

  // const createNewFeedForKid = async (kidId, mediaPath, mediaType) => {
  //   try {
  //     // format correct time
  //     const currentTime = new Date();
  //     const year = currentTime.getFullYear();
  //     const month = String(currentTime.getMonth() + 1).padStart(2, "0");
  //     const day = String(currentTime.getDate()).padStart(2, "0");
  //     const hours = String(currentTime.getHours()).padStart(2, "0");
  //     const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  //     const seconds = String(currentTime.getSeconds()).padStart(2, "0");

  //     const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  //     // Format mediaType to capitalize the first letter and lowercase the rest

  //     const formattedMediaType =
  //       mediaType.charAt(0).toUpperCase() + mediaType.slice(1).toLowerCase();

  //     const feedData = {
  //       type: mediaType, // "photo" or "video"
  //       dateTime: formattedTime, // Current date and time
  //       studentId: kidId,
  //       mediaName: mediaPath, // Path to the media
  //       text: `has a new ${formattedMediaType}`, // Text for the feed
  //       creatorId: currentUserData.id, // Replace with actual creatorId when available
  //     };

  //     // Insert the data into the Supabase "kidFeeds" table
  //     //console.log("feedData", feedData);
  //     const { data, error } = await supabase
  //       .from("kidFeeds")
  //       .insert([feedData]);

  //     if (error) {
  //       throw new Error(`Failed to create feed: ${error.message}`);
  //     }
  //   } catch (error) {
  //     console.error(`Error creating feed for kid ${kidId}:`, error);
  //   }
  // };

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
            onPress={() => navigation.navigate("StudentSelection")}
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
        onSelectOption={handleSelectPhotoVideo}
        onClose={() => setCallOpenCamera(false)}
        mode={cameraMode}
        bucketName={bucketName}
        tag={selectedKid ? false : true}
      />
    </View>
  );
};

export default NewActivityScreen;
