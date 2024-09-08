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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { FontAwesome } from "@expo/vector-icons";
import { useFeedContext } from "../../contexts/FeedContext";
import InfoModal from "../../components/InfoModal";
import { usePicturesContext } from "../../contexts/PicturesContext";

const IncidentsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [note, setNote] = useState("");
  const { selectedStudents } = route.params;
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [bucketName, setBucketName] = useState(null);
  const [mediaPath, setMediaPath] = useState(null);
  const { createNewFeedForKid } = useFeedContext();
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const { deleteMediaFromBucket } = usePicturesContext();

  // Use refs to store the initial state
  const initialNoteRef = useRef(note);
  const initialMediaPathRef = useRef(mediaPath);

  // Function to check if any changes were made to the note or mediaPath
  const hasChanges = () => {
    return (
      note !== initialNoteRef.current ||
      mediaPath !== initialMediaPathRef.current
    );
  };

  const goBack = () => {
    console.log(hasChanges());
    if (hasChanges()) {
      //   // If media or note has been changed, ask the user if they want to discard changes
      Alert.alert(
        "Discard Changes",
        "If you go back now, you will lose the changes you made. Do you want to continue?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Yes, discard",
            onPress: () => {
              if (mediaPath) {
                deleteMediaFromBucket(mediaPath, "feedPhotos"); // Assume a function to delete from your bucket
              }
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
  }, [route]);

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

  const handleSelectPhotoVideo = (path) => {
    // Handle the selected media path
    if (path) {
      setMediaPath(path); // Assuming only one image is selected
    }
    setCallOpenCamera(false);
  };

  const handlePhotoPress = () => {
    setCameraMode("photo");
    setBucketName("feedPhotos");
    setCallOpenCamera(true);
  };

  const handleAddActivity = async () => {
    const mediaType = "INCIDENT";

    selectedStudents.map((student) => {
      createNewFeedForKid(student.id, mediaPath, mediaType, note);
      //console.log(student.name);
    });
    setShowPostConfirmation(true);
    //navigation.navigate("Activities");
  };

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
          <Text style={styles.noteLabel}>Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Optional note - Type here or use the microphone button to say it aloud"
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        {mediaPath && (
          <View style={styles.mediaContainer}>
            <Text style={styles.mediaLabel}>Attached Media:</Text>
            <RemoteImage
              path={mediaPath}
              style={styles.mediaImage}
              bucketName="feedPhotos"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handlePhotoPress}
        >
          <Ionicons name="camera-outline" size={24} color="black" />
        </TouchableOpacity>

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
        />
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
