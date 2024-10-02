import { useState, useEffect, useContext } from "react";
import {
  Text,
  Image,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  FlatList,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput,
} from "react-native";
import { supabase } from "../../lib/supabase";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import OpenCamera from "../../components/OpenCamera";
import Ionicons from "@expo/vector-icons/Ionicons";
import FullScreenImage from "../../components/FullScreenImageModal";
import { usePicturesContext } from "../../contexts/PicturesContext";
import RemoteImage from "../../components/RemoteImage";
import CustomLoading from "../../components/CustomLoading";

const { width, height } = Dimensions.get("window");

const SchoolInfoScreen = ({ kid }) => {
  const [isSchoolModalVisible, setSchoolModalVisible] = useState(false);
  const [isGradeModalVisible, setGradeModalVisible] = useState(false);
  const [schoolList, setSchoolList] = useState([]);
  const [callOpenCameraForSchool, setCallOpenCameraForSchool] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolExitPhotos, setSchoolExitPhotos] = useState([
    { index: 0, path: "" },
    { index: 1, path: "" },
    { index: 2, path: "" },
  ]);
  const [localPhotos, setLocalPhotos] = useState([null, null, null]);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For full screen modal
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null); // Track which frame called the camera
  const [selectedGrade, setSelectedGrade] = useState(kid?.schoolGrade || "");
  const [teacherName, setTeacherName] = useState(kid?.schoolTeacherName || "");
  const [schoolGradeDivision, setSchoolGradeDivision] = useState(
    kid?.schoolGradeDivision || ""
  );
  const [saveVisible, setSaveVisible] = useState(false);
  const { savePhotoInBucket, deleteMediaFromBucket } = usePicturesContext();
  const [saving, setSaving] = useState(false);

  const grades = [
    "Kindergarten",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
  ];

  useEffect(() => {
    if (kid?.schools) {
      setSelectedSchool(kid.schools);
    }
    if (kid?.schoolExitPhotos) {
      setSchoolExitPhotos(kid.schoolExitPhotos); // Load existing photos
    }
  }, [kid]);

  const handleNewSchoolPhoto = async (imagePath) => {
    setCallOpenCameraForSchool(false);

    const newPhotos = [...localPhotos];
    if (currentFrame !== null) {
      newPhotos[currentFrame] = imagePath[0]; // Set only 1 picture per frame
      //setSchoolExitPhotos(newPhotos);
      setLocalPhotos(newPhotos);
      setSaveVisible(true);
    }
    setCurrentFrame(null); // Reset after image is set
  };

  const handleSelectSchool = (school) => {
    setSelectedSchool(school);
    setSchoolModalVisible(false);
    setSaveVisible(true);
  };

  const handleSelectGrade = (grade) => {
    setSelectedGrade(grade);
    setGradeModalVisible(false);
    setSaveVisible(true);
  };

  const fetchSchoolList = async () => {
    try {
      const { data: schoolData, error } = await supabase
        .from("schools")
        .select("*");

      if (error) {
        throw error;
      }
      if (schoolData) {
        setSchoolList(schoolData);
      }
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  useEffect(() => {
    fetchSchoolList();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedSchoolExitPhotos = [...schoolExitPhotos]; // Start with current paths from DB

      // Upload any new photos to Supabase and update path array
      for (let i = 0; i < localPhotos.length; i++) {
        if (localPhotos[i]) {
          // Only upload new local photos
          const savedPhotoPath = await savePhotoInBucket(
            { uri: localPhotos[i] }, // Upload the local image
            "schoolExitPhotos"
          );

          if (savedPhotoPath) {
            updatedSchoolExitPhotos[i] = { index: i, path: savedPhotoPath }; // Save path and index
          }
        }
      }

      // Update the student's schoolExitPhotos in Supabase
      try {
        const { data, error } = await supabase
          .from("students")
          .update({
            schoolExitPhotos: updatedSchoolExitPhotos.filter(
              (pathObj) => pathObj.path !== ""
            ),
            schoolId: selectedSchool.id,
            schoolTeacherName: teacherName,
            schoolGrade: selectedGrade,
            schoolGradeDivision: schoolGradeDivision,
          })
          .eq("id", kid.id);

        if (error) {
          throw error;
        }

        Alert.alert("Success", "Data has been saved successfully!");
        setSaveVisible(false); // Hide save button after saving
        setLocalPhotos([null, null, null]); // Clear local photos
        setSchoolExitPhotos(updatedSchoolExitPhotos); // Update the saved paths in state
      } catch (error) {
        Alert.alert("Error", "Failed to save data.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save data.");
    } finally {
      setSaving(false);
    }
  };

  const handleImagePress = (image) => {
    if (image) {
      //console.log("image", image);
      setSelectedPhoto(image);
      setFullScreenImageModal(true);
    }
  };

  const closeFullScreenModal = () => {
    setSelectedPhoto(null);
    setFullScreenImageModal(false);
  };

  const handleDeletePhoto = (index, type) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo? (this cannot be undone!)",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            if (type === "local") {
              // Clear local photo
              const updatedLocalPhotos = [...localPhotos];
              updatedLocalPhotos[index] = null; // Remove local image
              setLocalPhotos(updatedLocalPhotos);
            } else if (type === "supabase") {
              // Delete from Supabase
              const filePath = schoolExitPhotos[index]?.path;
              if (!filePath) return;

              const isDeleted = await deleteMediaFromBucket(
                filePath,
                "schoolExitPhotos"
              );

              if (isDeleted) {
                const updatedSchoolExitPhotos = [...schoolExitPhotos];
                updatedSchoolExitPhotos[index] = ""; // Remove image path from array
                setSchoolExitPhotos(updatedSchoolExitPhotos);

                // After successful deletion from Supabase, update the database
                try {
                  const { data, error } = await supabase
                    .from("students")
                    .update({
                      schoolExitPhotos: updatedSchoolExitPhotos.filter(
                        (path) => path !== ""
                      ), // Remove empty paths before saving
                    })
                    .eq("id", kid.id);

                  if (error) {
                    console.error("Error updating database:", error);
                    return;
                  }

                  console.log(
                    "Photo deleted and database updated successfully."
                  );
                } catch (error) {
                  console.error("Error updating database after delete:", error);
                }
              }
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const openCameraForFrame = (frameIndex) => {
    setCurrentFrame(frameIndex); // Set the frame that called the camera
    setCallOpenCameraForSchool(true); // Open the camera
  };

  if (saving) {
    return (
      <View style={{ flex: 1 }}>
        <CustomLoading imageSize={70} text="Saving..." />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, flex: 1 }}
      keyboardShouldPersistTaps="handled"
      style={styles.tabContainer}
    >
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>School:</Text>
        <View style={styles.schoolContainer}>
          <Text style={styles.detailTextInput}>
            {selectedSchool ? selectedSchool.name : "No school selected"}
          </Text>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setSchoolModalVisible(true)} // Open modal to select school
          >
            <Text style={styles.changeButtonText}>
              {selectedSchool ? "Change" : "Add School"}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedSchool && (
          <>
            <Text style={styles.detailLabel}>Teacher:</Text>
            <TextInput
              style={styles.detailTextInput}
              value={teacherName}
              onChangeText={(text) => {
                setTeacherName(text);
                setSaveVisible(true);
              }}
              placeholder="Enter teacher's name"
            />

            <Text style={styles.detailLabel}>Grade:</Text>
            <View style={styles.schoolContainer}>
              <Text style={styles.detailTextInput}>
                {selectedGrade ? selectedGrade : "No grade selected"}
              </Text>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setGradeModalVisible(true)} // Open modal to select grade
              >
                <Text style={styles.changeButtonText}>
                  {selectedGrade ? "Change" : "Select Grade"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.detailLabel}>Division:</Text>
            <TextInput
              style={styles.detailTextInput}
              value={schoolGradeDivision}
              onChangeText={(text) => {
                setSchoolGradeDivision(text);
                setSaveVisible(true);
              }}
              placeholder="Enter grade division..."
            />

            {/* Header text for Pickup Door and instructions */}
            <Text style={styles.pickupDoorHeader}>
              Pickup Door (you can put 3 pictures)
            </Text>
          </>
        )}

        {/* 3-slot gallery container */}
        {selectedSchool && (
          <View style={styles.threeSlotContainer}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.imageSlot}>
                {/* Display local photos (not saved to storage yet) */}
                {localPhotos[index] ? (
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
                      onPress={() => handleDeletePhoto(index, "local")}
                    >
                      <Ionicons name="trash-outline" size={24} color="red" />
                    </TouchableOpacity>
                  </>
                ) : schoolExitPhotos[index] && schoolExitPhotos[index].path ? (
                  // Display existing photos from Supabase
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        handleImagePress(schoolExitPhotos[index].path);
                      }}
                    >
                      <RemoteImage
                        path={schoolExitPhotos[index].path}
                        bucketName="schoolExitPhotos"
                        style={styles.slotImage}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteIcon}
                      onPress={() => handleDeletePhoto(index, "supabase")}
                    >
                      <Ionicons name="trash-outline" size={24} color="red" />
                    </TouchableOpacity>
                  </>
                ) : (
                  // Display the "+" icon to add a new image
                  <TouchableOpacity onPress={() => openCameraForFrame(index)}>
                    <View style={styles.emptySlot}>
                      <MaterialIcons name="add" size={32} color="gray" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
        {/* Save Button */}
        {saveVisible && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )}

        {/* Modal for changing school */}
        <Modal
          visible={isSchoolModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSchoolModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalDropdown}>
              <FlatList
                data={schoolList}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.schoolOption}
                    onPress={() => {
                      handleSelectSchool(item);
                      setSchoolModalVisible(false);
                    }}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSchoolModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isGradeModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setGradeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalDropdown}>
              <FlatList
                data={grades}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.schoolOption}
                    onPress={() => handleSelectGrade(item)}
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
          source={selectedPhoto?.startsWith("file:///") ? selectedPhoto : null} // If it's a local photo, use `source`
          path={!selectedPhoto?.startsWith("file:///") ? selectedPhoto : null} // If it's a remote photo, use `path`
          onClose={closeFullScreenModal}
          bucketName={"schoolExitPhotos"}
        />
        {/* Fullscreen modal for image viewing
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.fullImage} />
          )}
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={closeModal}
          >
            <Entypo name="cross" size={25} color="white" />
          </TouchableOpacity>
        </View>
      </Modal> */}

        <OpenCamera
          isVisible={callOpenCameraForSchool}
          onPhotoTaken={(imagePath) => handleNewSchoolPhoto(imagePath)} // Allow the image to be set for the correct frame
          onSelectOption={(imagePath) => handleNewSchoolPhoto(imagePath)} // Ensure this option handles selected images correctly
          onClose={() => setCallOpenCameraForSchool(false)}
          mode="photo"
          tag={false}
          allowNotes={false}
          bucketName="schoolExitPhotos"
          saveMediaOnCamera={false}
          allowMultipleImages={false} // Allow only one image per frame
        />
      </View>
    </ScrollView>
  );
};

export default SchoolInfoScreen;

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    paddingLeft: 15,
    paddingTop: 2,
    //backgroundColor: "red",
  },
  detailItemContainer: {
    //marginBottom: 10,
  },
  changeButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    marginRight: 15,
  },
  changeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  detailTextInput: {
    fontSize: 16,
    color: "#555",
    padding: 2,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  schoolContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    //marginVertical: 5,
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
    borderWidth: 1,
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
    alignItems: "center",
  },
  saveButtonText: {
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
    maxHeight: 300,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
  },
  schoolOption: {
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
