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
//import { supabase } from "../../lib/supabase";
import { useFeedContext } from "../../contexts/FeedContext";
import InfoModal from "../../components/InfoModal";

const NewActivityScreen = () => {
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [bucketName, setBucketName] = useState(null);
  const [selectedKid, setSelectedKid] = useState(null);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const from = route.params?.from;
  const { id: kidId } = route.params || {};
  const { kids } = useKidsContext();
  const { createNewFeedForKid } = useFeedContext();

  const goBack = () => {
    if (from === "home") {
      navigation.navigate("Home");
    } else if (from === "feed") {
      navigation.navigate("StudentFeed", { id: kidId });
    } else {
      navigation.navigate("Home");
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
    setShowPostConfirmation(true);
  };

  const handleSelectPhotoVideo = (paths, selectedKids, notes) => {
    const mediaType = cameraMode === "photo" ? "PHOTO" : "VIDEO";

    if (selectedKids.length > 0) {
      // For each selected kid, create a new feed with the media and notes
      selectedKids.forEach((kidId) => {
        paths.forEach((path) => {
          createNewFeedForKid(kidId, path, mediaType, notes);
        });
      });
    } else if (selectedKid) {
      // If no kids are selected but we have a selectedKid (from route params), use that
      paths.forEach((path) => {
        createNewFeedForKid(selectedKid.id, path, mediaType, notes);
      });
    }

    setShowPostConfirmation(true); // Show confirmation
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
      <InfoModal
        isVisible={showPostConfirmation}
        onClose={() => setShowPostConfirmation(false)}
        infoItems={[
          { label: "Success!", value: "New activity successfully created" },
        ]}
        labelStyle={{ textAlign: "center" }}
      />
    </View>
  );
};

export default NewActivityScreen;
