// src/screens/StudentProfileScreen/SchoolInfoScreen.js
import { useState, useEffect } from "react";
import {
  Text,
  Image,
  TouchableOpacity,
  View,
  Alert,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import api from "../../lib/api";
import OpenCamera from "../../components/OpenCamera";
import FullScreenImage from "../../components/FullScreenImageModal";
import RemoteImage from "../../components/RemoteImage";
import CustomLoading from "../../components/CustomLoading";
import { usePicturesContext } from "../../contexts/PicturesContext";
import { useKidsContext } from "../../contexts/KidsContext";

const { width } = Dimensions.get("window");

// The school of the kid is only SHOWN here (the dashboard is where it is changed).
// The only thing the team does in this screen is to ADD photos of the dismissal door.
const SchoolInfoScreen = ({ kid }) => {
  const [localPhotos, setLocalPhotos] = useState([null, null, null]); // taken, not sent yet
  const [savedPhotos, setSavedPhotos] = useState([null, null, null]); // already saved for the kid
  const [currentFrame, setCurrentFrame] = useState(null); // the place that opened the camera
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { savePhotoInBucket } = usePicturesContext();
  const { RefreshKidsData } = useKidsContext();

  // The photos that were saved before, in their places (0, 1 and 2)
  useEffect(() => {
    const slots = [null, null, null];
    (kid?.schoolExitPhotos || [])
      .filter((photo) => photo && photo.path)
      .forEach((photo, position) => {
        const place = Number.isInteger(photo.index) ? photo.index : position;
        if (place >= 0 && place <= 2) slots[place] = photo;
      });
    setSavedPhotos(slots);
  }, [kid]);

  const hasNewPhotos = localPhotos.some(Boolean);

  const openCameraForFrame = (index) => {
    setCurrentFrame(index);
    setCallOpenCamera(true);
  };

  const handleNewPhoto = (imagePaths) => {
    setCallOpenCamera(false);
    if (currentFrame !== null && imagePaths?.[0]) {
      const updated = [...localPhotos];
      updated[currentFrame] = imagePaths[0]; // one photo for each place
      setLocalPhotos(updated);
    }
    setCurrentFrame(null);
  };

  // A photo that was taken but not sent yet can be thrown away
  const handleDiscardPhoto = (index) => {
    const updated = [...localPhotos];
    updated[index] = null;
    setLocalPhotos(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let latest = savedPhotos.filter(Boolean);

      for (let i = 0; i < localPhotos.length; i++) {
        if (!localPhotos[i]) continue;

        // 1) the file goes to the storage; 2) the API adds it to the kid
        const path = await savePhotoInBucket(
          { uri: localPhotos[i] },
          "schoolExitPhotos",
        );
        if (!path) throw new Error("The photo could not be sent");

        const { data } = await api.post(
          `/app/students/${kid.id}/dismissal-photos`,
          { path, index: i },
        );
        latest = data.schoolExitPhotos;
      }

      // What the API answers is the complete list of the kid
      const slots = [null, null, null];
      latest.forEach((photo) => {
        if (photo?.path && photo.index >= 0 && photo.index <= 2) {
          slots[photo.index] = photo;
        }
      });
      setSavedPhotos(slots);
      setLocalPhotos([null, null, null]);
      await RefreshKidsData();

      Alert.alert("Success", "The photos were added.");
    } catch (error) {
      console.error(
        "Error adding dismissal photos:",
        error?.response?.data || error.message,
      );
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to add the photos.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleImagePress = (image) => {
    if (image) {
      setSelectedPhoto(image);
      setFullScreenImageModal(true);
    }
  };

  const closeFullScreenModal = () => {
    setSelectedPhoto(null);
    setFullScreenImageModal(false);
  };

  if (saving) {
    return (
      <View style={{ flex: 1 }}>
        <CustomLoading imageSize={70} text="Saving..." />
      </View>
    );
  }

  const school = kid?.schools;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      style={styles.tabContainer}
    >
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>School:</Text>
        <Text style={styles.detailText}>
          {school ? school.name : "No school selected"}
        </Text>

        {school && (
          <>
            <Text style={styles.detailLabel}>Teacher:</Text>
            <Text style={styles.detailText}>
              {kid.schoolTeacherName || "—"}
            </Text>

            <Text style={styles.detailLabel}>Grade:</Text>
            <Text style={styles.detailText}>{kid.schoolGrade || "—"}</Text>

            <Text style={styles.detailLabel}>Division:</Text>
            <Text style={styles.detailText}>
              {kid.schoolGradeDivision || "—"}
            </Text>

            <Text style={styles.pickupDoorHeader}>Dismissal Door Photos</Text>

            <View style={styles.threeSlotContainer}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.imageSlot}>
                  {localPhotos[index] ? (
                    // Taken now, not sent yet
                    <>
                      <TouchableOpacity
                        onPress={() => handleImagePress(localPhotos[index])}
                      >
                        <Image
                          source={{ uri: localPhotos[index] }}
                          style={styles.slotImage}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIcon}
                        onPress={() => handleDiscardPhoto(index)}
                      >
                        <Ionicons name="trash-outline" size={24} color="red" />
                      </TouchableOpacity>
                    </>
                  ) : savedPhotos[index]?.path ? (
                    // Already saved: it can be seen, not removed
                    <TouchableOpacity
                      onPress={() => handleImagePress(savedPhotos[index].path)}
                    >
                      <RemoteImage
                        path={savedPhotos[index].path}
                        bucketName="schoolexitphotos"
                        style={styles.slotImage}
                      />
                    </TouchableOpacity>
                  ) : (
                    // Empty place: add a photo
                    <TouchableOpacity onPress={() => openCameraForFrame(index)}>
                      <View style={styles.emptySlot}>
                        <MaterialIcons name="add" size={32} color="gray" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {hasNewPhotos && (
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save photos</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <FullScreenImage
        isVisible={fullScreenImageModal}
        source={selectedPhoto?.startsWith("file:///") ? selectedPhoto : null} // taken now: a file of the phone
        path={!selectedPhoto?.startsWith("file:///") ? selectedPhoto : null} // saved: a file of the API
        onClose={closeFullScreenModal}
        bucketName={"schoolExitPhotos"}
      />

      <OpenCamera
        isVisible={callOpenCamera}
        onPhotoTaken={(imagePath) => handleNewPhoto(imagePath)}
        onSelectOption={(imagePath) => handleNewPhoto(imagePath)}
        onClose={() => setCallOpenCamera(false)}
        mode="photo"
        tag={false}
        allowNotes={false}
        bucketName="schoolExitPhotos"
        saveMediaOnCamera={false}
        allowMultipleImages={false} // one photo for each place
      />
    </ScrollView>
  );
};

export default SchoolInfoScreen;

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    paddingLeft: 15,
    paddingTop: 2,
  },
  detailItemContainer: {},
  detailLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  detailText: {
    fontSize: 16,
    color: "#555",
    padding: 2,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  pickupDoorHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
    color: "#1E90FF",
    alignSelf: "center",
  },
  threeSlotContainer: {
    flexDirection: "row",
  },
  imageSlot: {
    width: (width - 30) / 3,
    height: 225,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    position: "relative",
  },
  slotImage: {
    width: "100%",
    height: "100%",
  },
  emptySlot: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  deleteIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
    marginRight: 15,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
