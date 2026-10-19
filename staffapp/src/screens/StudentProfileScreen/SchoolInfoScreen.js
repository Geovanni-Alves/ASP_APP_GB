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
  TextInput,
  Modal,
  FlatList,
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

const GRADES = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
];

// Everybody on the team SEES the school, the teacher, the grade, the division and the dismissal photos.
// Only the people who run the school ("canEdit": owner, manager, admin) change the teacher, the grade
// and the division, and add or delete the dismissal photos. The SCHOOL itself is only changed in the dashboard.
const SchoolInfoScreen = ({ kid, canEdit = false }) => {
  const [teacherName, setTeacherName] = useState(kid?.schoolTeacherName || "");
  const [selectedGrade, setSelectedGrade] = useState(kid?.schoolGrade || "");
  const [gradeDivision, setGradeDivision] = useState(
    kid?.schoolGradeDivision || "",
  );
  const [infoChanged, setInfoChanged] = useState(false);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [localPhotos, setLocalPhotos] = useState([null, null, null]); // taken, not sent yet
  const [savedPhotos, setSavedPhotos] = useState([null, null, null]); // already saved for the kid
  const [currentFrame, setCurrentFrame] = useState(null); // the place that opened the camera
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { savePhotoInBucket, deleteMediaFromBucket } = usePicturesContext();
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

  // The teacher, the grade and the division come from the kid (and again after a save)
  useEffect(() => {
    setTeacherName(kid?.schoolTeacherName || "");
    setSelectedGrade(kid?.schoolGrade || "");
    setGradeDivision(kid?.schoolGradeDivision || "");
    setInfoChanged(false);
  }, [kid]);

  const hasNewPhotos = localPhotos.some(Boolean);
  const hasChanges = hasNewPhotos || infoChanged;

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

  // Deleting a saved photo: first the record of the kid, then the file (if the file fails, an unused
  // file is left behind, which is harmless)
  const handleDeleteSaved = (index) => {
    const photo = savedPhotos[index];
    if (!photo?.path) return;

    Alert.alert(
      "Delete photo",
      "Delete this photo? You can add another one in its place. (This cannot be undone!)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const remaining = savedPhotos.filter(
                (item, position) => item?.path && position !== index,
              );
              await api.patch(`/students/${kid.id}`, {
                schoolExitPhotos: remaining,
              });
              await deleteMediaFromBucket(photo.path, "schoolExitPhotos");

              const slots = [...savedPhotos];
              slots[index] = null;
              setSavedPhotos(slots);
              await RefreshKidsData();
            } catch (error) {
              console.error(
                "Error deleting the photo:",
                error?.response?.data || error.message,
              );
              Alert.alert("Error", "Failed to delete the photo.");
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 1) the teacher, the grade and the division (the school itself is not changed here)
      if (infoChanged) {
        await api.patch(`/students/${kid.id}`, {
          schoolTeacherName: teacherName.trim() || null,
          schoolGrade: selectedGrade || null,
          schoolGradeDivision: gradeDivision.trim() || null,
        });
        setInfoChanged(false);
      }

      // 2) the new dismissal photos
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

      Alert.alert("Success", "The changes were saved.");
    } catch (error) {
      console.error(
        "Error adding dismissal photos:",
        error?.response?.data || error.message,
      );
      Alert.alert(
        "Error",
        error?.response?.data?.error || "Failed to save the changes.",
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
            {canEdit ? (
              <TextInput
                style={styles.detailText}
                value={teacherName}
                onChangeText={(text) => {
                  setTeacherName(text);
                  setInfoChanged(true);
                }}
                placeholder="Enter teacher's name"
              />
            ) : (
              <Text style={styles.detailText}>
                {kid.schoolTeacherName || "—"}
              </Text>
            )}

            <Text style={styles.detailLabel}>Grade:</Text>
            {canEdit ? (
              <View style={styles.gradeRow}>
                <Text style={[styles.detailText, { flex: 1 }]}>
                  {selectedGrade || "No grade selected"}
                </Text>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setGradeModalVisible(true)}
                >
                  <Text style={styles.changeButtonText}>
                    {selectedGrade ? "Change" : "Select Grade"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.detailText}>{kid.schoolGrade || "—"}</Text>
            )}

            <Text style={styles.detailLabel}>Division:</Text>
            {canEdit ? (
              <TextInput
                style={styles.detailText}
                value={gradeDivision}
                onChangeText={(text) => {
                  setGradeDivision(text);
                  setInfoChanged(true);
                }}
                placeholder="Enter grade division..."
              />
            ) : (
              <Text style={styles.detailText}>
                {kid.schoolGradeDivision || "—"}
              </Text>
            )}

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
                    // Already saved: everybody can see it, and only who runs the school removes it
                    <>
                      <TouchableOpacity
                        onPress={() =>
                          handleImagePress(savedPhotos[index].path)
                        }
                      >
                        <RemoteImage
                          path={savedPhotos[index].path}
                          bucketName="schoolexitphotos"
                          style={styles.slotImage}
                        />
                      </TouchableOpacity>
                      {canEdit && (
                        <TouchableOpacity
                          style={styles.deleteIcon}
                          onPress={() => handleDeleteSaved(index)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={24}
                            color="red"
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  ) : canEdit ? (
                    // Empty place: add a photo
                    <TouchableOpacity onPress={() => openCameraForFrame(index)}>
                      <View style={styles.emptySlot}>
                        <MaterialIcons name="add" size={32} color="gray" />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    // Empty place, for somebody who only looks
                    <View
                      style={[styles.emptySlot, { backgroundColor: "#f2f2f2" }]}
                    />
                  )}
                </View>
              ))}
            </View>

            {hasChanges && (
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save changes</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* The grades (only the people who may change it open this) */}
      <Modal
        visible={gradeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDropdown}>
            <FlatList
              data={GRADES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gradeOption}
                  onPress={() => {
                    setSelectedGrade(item);
                    setInfoChanged(true);
                    setGradeModalVisible(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setGradeModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    marginRight: 15,
    marginLeft: 8,
    marginBottom: 7,
  },
  changeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalDropdown: {
    width: "80%",
    maxHeight: 360,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
  },
  gradeOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  modalCloseButton: {
    padding: 10,
    backgroundColor: "#007BFF",
    alignItems: "center",
    marginTop: 10,
    borderRadius: 5,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
