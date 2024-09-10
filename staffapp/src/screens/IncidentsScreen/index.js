import styles from "./styles";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Image,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { FontAwesome } from "@expo/vector-icons";
import { useFeedContext } from "../../contexts/FeedContext";
import InfoModal from "../../components/InfoModal";
import { usePicturesContext } from "../../contexts/PicturesContext";
import CustomLoading from "../../components/CustomLoading";

const IncidentsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedStudents } = route.params;
  const { savePhotoInBucket } = usePicturesContext();

  const [note, setNote] = useState("");
  const [incidentImage, setIncidentImage] = useState(null);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [bucketName, setBucketName] = useState(null);
  const { createNewFeedForKid } = useFeedContext();
  const [fullScreenModalVisible, setFullScreenModalVisible] = useState(false);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const initialNoteRef = useRef("");
  const initialMediaPathRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Reset state when entering the screen
  useEffect(() => {
    setNote("");
    setIncidentImage(null);
    initialNoteRef.current = "";
    initialMediaPathRef.current = null;
  }, [route]);

  // Check if there are changes
  const hasChanges = () => {
    return (
      note !== initialNoteRef.current ||
      incidentImage !== initialMediaPathRef.current
    );
  };

  const goBack = () => {
    if (hasChanges()) {
      Alert.alert(
        "Discard Changes",
        "If you go back now, you will lose the changes you made. Do you want to continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, discard",
            onPress: () => {
              // if (incidentImage) {
              //   deleteMediaFromBucket(incidentImage, "feedPhotos");
              // }
              navigation.navigate("StudentSelection");
            },
            style: "destructive",
          },
        ]
      );
    } else {
      navigation.navigate("StudentSelection");
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
  }, [route, note, incidentImage]); // Ensure dependencies track changes

  const renderStudent = ({ item }) => (
    <View style={styles.studentItem}>
      <RemoteImage
        path={item.photo}
        name={item.name}
        style={styles.studentImage}
        bucketName="profilePhotos"
      />
    </View>
  );

  const saveMedia = async () => {
    setLoading(true);
    const uri = incidentImage;
    try {
      const path = await savePhotoInBucket({ uri }, bucketName);
      return path;
    } catch (error) {
      console.error("Error saving media to storage", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPhotoVideo = (path) => {
    //console.log("path", path);
    if (path) {
      setIncidentImage(path[0]); // Set selected media path
    }
    setCallOpenCamera(false);
  };

  const handlePhotoPress = () => {
    setCameraMode("photo");
    setBucketName("feedPhotos");
    setCallOpenCamera(true);
  };

  const handleAddActivity = async () => {
    let mediaPath = "";
    if (incidentImage) {
      mediaPath = await saveMedia();
    }
    const mediaType = "INCIDENT";
    selectedStudents.forEach((student) => {
      createNewFeedForKid(student.id, mediaPath, mediaType, note);
    });
    setShowPostConfirmation(true);
  };

  const openImageModal = () => {
    setFullScreenModalVisible(true);
  };

  const closeModal = () => {
    setFullScreenModalVisible(false);
  };

  const deletePhoto = () => {
    setIncidentImage(null);
  };

  if (loading) {
    return (
      <Modal animationType="slide" transparent={true}>
        <CustomLoading imageSize={80} text="Loading..." />
        {/* <Text style={styles.loadingText}>Loading...</Text> */}
      </Modal>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Kids on the Incident</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("StudentSelection")}
            style={styles.editButton}
          >
            <Ionicons name="pencil-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedStudents}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          horizontal
          contentContainerStyle={styles.studentsContainer}
          showsHorizontalScrollIndicator={false}
        />

        <Text style={styles.timeText}>
          Today at {new Date().toLocaleTimeString()}
        </Text>

        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Notes:</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Optional note - Type here or use the microphone button to say it aloud"
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        {incidentImage && (
          <View style={styles.mediaContainer}>
            <Text style={styles.mediaLabel}>Attached Photo:</Text>
            <TouchableOpacity onPress={openImageModal}>
              <Image
                source={{ uri: incidentImage }}
                style={styles.mediaImage}
              />
            </TouchableOpacity>
            <View style={styles.trashIconContainer}>
              <TouchableOpacity onPress={deletePhoto}>
                <Ionicons name="trash" size={25} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!incidentImage && (
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handlePhotoPress}
          >
            <Ionicons name="camera-outline" size={34} color="black" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddActivity}>
          <Text style={styles.addButtonText}>Add Activity</Text>
        </TouchableOpacity>

        <OpenCamera
          isVisible={callOpenCamera}
          onSelectOption={handleSelectPhotoVideo}
          onClose={() => setCallOpenCamera(false)}
          mode={cameraMode}
          bucketName={bucketName}
          tag={false}
          allowMultipleImages={false}
          allowNotes={false}
          saveMediaOnCamera={false}
        />

        <Modal
          visible={fullScreenModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <Image source={{ uri: incidentImage }} style={styles.fullImage} />
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 70,
                right: 20,
                backgroundColor: "gray",
                borderRadius: 30,
                padding: 7,
              }}
              onPress={closeModal}
            >
              <Ionicons name="close" size={25} color="white" />
            </TouchableOpacity>
          </View>
        </Modal>
        <InfoModal
          isVisible={showPostConfirmation}
          onClose={() => setShowPostConfirmation(false)}
          infoItems={[
            { label: "Success!", value: "New incident successfully created" },
            { label: "", value: "we hope its was nothing serious!!" },
          ]}
          labelStyle={{ textAlign: "center" }}
          shouldNavigateAfterFinish
          whereToNavigate="Activities"
        />
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default IncidentsScreen;
