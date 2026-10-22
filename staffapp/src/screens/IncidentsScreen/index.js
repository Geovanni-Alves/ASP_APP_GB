import styles from "./styles";
import React, { useState, useEffect } from "react";
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
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { useFeedContext } from "../../contexts/FeedContext";
import InfoModal from "../../components/InfoModal";
import { usePicturesContext } from "../../contexts/PicturesContext";
import CustomLoading from "../../components/CustomLoading";

// A serious incident may need several photos
const MAX_PHOTOS = 5;

const IncidentsScreen = () => {
  const route = useRoute();
  const from = route.params?.from;
  const navigation = useNavigation();
  const { selectedStudents } = route.params;
  const { savePhotoInBucket } = usePicturesContext();
  const { createFeedForKids } = useFeedContext();

  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]); // the photos taken (files of the phone), up to MAX_PHOTOS
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  // Reset state when entering the screen
  useEffect(() => {
    setNote("");
    setPhotos([]);
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

  // The camera (or the gallery) gives one or more photos
  const handleSelectPhotos = (paths) => {
    if (paths?.length) {
      setPhotos((previous) => [...previous, ...paths].slice(0, MAX_PHOTOS));
    }
    setCallOpenCamera(false);
  };

  const removePhoto = (uri) => {
    setPhotos((previous) => previous.filter((item) => item !== uri));
  };

  // Sends the photos, then posts the incident for ALL the kids in ONE request (all or nothing)
  const handleAddActivity = async () => {
    if (saving) return; // a second tap never posts twice
    setSaving(true);

    try {
      // 1) the photos go to the storage, one by one (a big photo can take a while)
      const paths = [];
      for (let index = 0; index < photos.length; index++) {
        setProgress(`Sending photo ${index + 1} of ${photos.length}...`);
        const path = await savePhotoInBucket(
          { uri: photos[index] },
          "feedPhotos",
        );
        if (!path) throw new Error("A photo could not be sent.");
        paths.push(path);
      }

      // 2) the incident, for every kid at once
      setProgress("Posting the incident...");
      const created = await createFeedForKids(
        selectedStudents.map((student) => student.id),
        paths,
        "INCIDENT",
        note,
      );
      if (!created) throw new Error("The incident could not be posted.");

      setShowPostConfirmation(true);
    } catch (error) {
      console.error("Incident not posted:", error?.message);
      Alert.alert(
        "The incident was not posted",
        `${error?.message || "Something went wrong."} Nothing was posted: please try again.`,
      );
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Children on the Incident</Text>
            {from !== "Students" && (
              <TouchableOpacity
                onPress={() => navigation.navigate("StudentSelection")}
                style={styles.editButton}
              >
                <Ionicons name="pencil-outline" size={24} color="black" />
              </TouchableOpacity>
            )}
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

          {/* The photos of the incident */}
          <View style={local.photosBlock}>
            <Text style={styles.mediaLabel}>
              Photos ({photos.length}/{MAX_PHOTOS})
            </Text>

            <View style={local.photosRow}>
              {photos.map((uri) => (
                <View key={uri} style={local.thumbWrapper}>
                  <TouchableOpacity onPress={() => setPreviewPhoto(uri)}>
                    <Image source={{ uri }} style={local.thumb} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={local.thumbRemove}
                    onPress={() => removePhoto(uri)}
                  >
                    <Ionicons name="trash" size={18} color="red" />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity
                  style={local.addPhoto}
                  onPress={() => setCallOpenCamera(true)}
                >
                  <Ionicons name="camera-outline" size={32} color="black" />
                  <Text style={local.addPhotoText}>Add photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, saving && { opacity: 0.5 }]}
            onPress={handleAddActivity}
            disabled={saving}
          >
            <Text style={styles.addButtonText}>Add Activity</Text>
          </TouchableOpacity>

          <OpenCamera
            isVisible={callOpenCamera}
            onSelectOption={handleSelectPhotos}
            onClose={() => setCallOpenCamera(false)}
            mode="photo"
            bucketName="feedPhotos"
            tag={false}
            allowMultipleImages
            imagesSelectionLimit={MAX_PHOTOS - photos.length}
            allowNotes={false}
            saveMediaOnCamera={false}
          />

          <Modal
            visible={!!previewPhoto}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setPreviewPhoto(null)}
          >
            <View style={styles.modalContainer}>
              <Image source={{ uri: previewPhoto }} style={styles.fullImage} />
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setPreviewPhoto(null)}
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

      {/* While it saves: a layer over this screen (NOT a modal: a modal that closes at the same time
          as the next one opens can freeze the screen on the iPhone) */}
      {saving && (
        <View style={local.overlay}>
          <CustomLoading imageSize={80} text={progress || "Saving..."} />
        </View>
      )}
    </View>
  );
};

const local = StyleSheet.create({
  photosBlock: {
    marginVertical: 12,
  },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  thumbWrapper: {
    position: "relative",
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 10,
  },
  thumbRemove: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
  },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#adb5bd",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: {
    fontSize: 11,
    color: "#495057",
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
});

export default IncidentsScreen;
