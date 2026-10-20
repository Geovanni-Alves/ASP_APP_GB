import styles from "./styles";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import OpenCamera from "../../components/OpenCamera";
import { useKidsContext } from "../../contexts/KidsContext";
import { useFeedContext } from "../../contexts/FeedContext";
import { useTodayContext } from "../../contexts/TodayContext";
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
  const { createFeedForKids } = useFeedContext();
  const { loaded, statusOf, hereKids } = useTodayContext();

  // From the home (no kid chosen): somebody has to be checked in, or there is nobody to tag
  const nobodyHere = !selectedKid && loaded && hereKids(kids).length === 0;
  // From the page of a kid: posting for a kid who is not checked in today asks first
  const kidNotHere =
    !!selectedKid && loaded && statusOf(selectedKid) !== "checked_in";

  // Photo, video and incident all go through here, BEFORE the camera opens
  const guarded = (action) => () => {
    if (nobodyHere) {
      Alert.alert(
        "Nobody is checked in yet today",
        "There is nobody to tag. Mark the kids who arrived in the Students list. To post for a kid anyway, open the kid there and use New Activity.",
      );
      return;
    }
    if (kidNotHere) {
      Alert.alert(
        "Not checked in today",
        `${selectedKid.name} is not checked in today. Post anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Post anyway", onPress: action },
        ],
      );
      return;
    }
    action();
  };

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

  const handleIncidentPress = () => {
    if (selectedKid) {
      // If a kid is already selected, navigate directly to the IncidentsScreen
      navigation.navigate("Incidents", {
        selectedStudents: [selectedKid],
        from: "Students",
      });
    } else {
      // Otherwise, navigate to the StudentSelection screen
      navigation.navigate("StudentSelection");
    }
  };

  const handlePromotionPress = () => {
    if (selectedKid) {
      navigation.navigate("Promotions", {
        selectedStudents: [selectedKid],
        from: "Students",
      });
    } else {
      navigation.navigate("Promotions");
    }
  };

  const handleSelectPhotoVideo = async (paths, selectedKids, notes) => {
    const mediaType = cameraMode === "photo" ? "PHOTO" : "VIDEO";

    // The kids of the post: the ones that were tagged, or the kid whose feed this is
    const kidIds =
      selectedKids.length > 0
        ? selectedKids
        : selectedKid
          ? [selectedKid.id]
          : [];
    if (kidIds.length === 0 || !paths?.length) return;

    // ONE item for each kid, with all the photos stacked in it
    const created = await createFeedForKids(kidIds, paths, mediaType, notes);
    if (created) {
      setShowPostConfirmation(true); // Show confirmation
    } else {
      Alert.alert("Not posted", "Nothing was posted. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {nobodyHere && (
        <View style={local.notice}>
          <Text style={local.noticeTitle}>Nobody is checked in yet today</Text>
          <Text style={local.noticeText}>
            There is nobody to tag. Mark the kids who arrived in the Students
            list. To post for a kid anyway, open the kid there and use New
            Activity.
          </Text>
        </View>
      )}

      <View style={[styles.activityIcons, nobodyHere && { opacity: 0.35 }]}>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={guarded(handlePhotoPress)}
            style={styles.cameraIcon}
          >
            <Entypo name="camera" size={45} color="black" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Photo</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={guarded(handleVideoPress)}
            style={styles.videoIcon}
          >
            <Entypo name="video-camera" size={45} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Video</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={guarded(handleIncidentPress)}
            style={styles.patchIcon}
          >
            <Fontisto name="bandage" size={45} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.textIcon}>Incident</Text>
        </View>
      </View>
      <OpenCamera
        isVisible={callOpenCamera}
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

const local = StyleSheet.create({
  notice: {
    backgroundColor: "#fff7e6",
    borderColor: "#ffd591",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    margin: 16,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ad6800",
  },
  noticeText: {
    fontSize: 13,
    color: "#ad6800",
    marginTop: 4,
  },
});

export default NewActivityScreen;
