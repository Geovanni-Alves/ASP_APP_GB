import styles from "./styles";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { useFeedContext } from "../../contexts/FeedContext";

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
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default IncidentsScreen;
