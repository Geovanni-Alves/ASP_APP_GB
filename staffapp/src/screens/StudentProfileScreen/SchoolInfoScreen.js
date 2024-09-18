import { useState, useEffect } from "react";
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
} from "react-native";
import { supabase } from "../../lib/supabase";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Entypo from "react-native-vector-icons/Entypo";
import OpenCamera from "../../components/OpenCamera";
import Ionicons from "@expo/vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

const SchoolInfoScreen = ({ kid }) => {
  const [isSchoolModalVisible, setSchoolModalVisible] = useState(false);
  const [schoolList, setSchoolList] = useState([]);
  const [callOpenCameraForSchool, setCallOpenCameraForSchool] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolExitPhotos, setSchoolExitPhotos] = useState(["", "", ""]); // 3 frames, initially empty
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For full screen modal
  const [isModalVisible, setModalVisible] = useState(false); // For full screen modal
  const [currentFrame, setCurrentFrame] = useState(null); // Track which frame called the camera

  const handleNewSchoolPhoto = async (imagePath) => {
    setCallOpenCameraForSchool(false);

    const newPhotos = [...schoolExitPhotos];
    if (currentFrame !== null) {
      newPhotos[currentFrame] = imagePath[0]; // Set only 1 picture per frame
      setSchoolExitPhotos(newPhotos);
    }
    setCurrentFrame(null); // Reset after image is set
  };

  const handleSelectSchool = (school) => {
    setSelectedSchool(school);
    setSchoolModalVisible(false);
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

  useEffect(() => {
    if (kid?.schools) {
      setSelectedSchool(kid.schools);
    }
  }, [kid]);

  const openFullScreenModal = (photo) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPhoto(null);
  };

  const handleDeletePhoto = (index) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: () => {
          const updatedPhotos = [...schoolExitPhotos];
          updatedPhotos[index] = ""; // Clear the photo from the frame
          setSchoolExitPhotos(updatedPhotos);
        },
        style: "destructive",
      },
    ]);
  };

  const openCameraForFrame = (frameIndex) => {
    setCurrentFrame(frameIndex); // Set the frame that called the camera
    setCallOpenCameraForSchool(true); // Open the camera
  };

  return (
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

      {/* Header text for Pickup Door and instructions */}
      {selectedSchool && (
        <Text style={styles.pickupDoorHeader}>
          Pickup Door (you can put 3 pictures)
        </Text>
      )}

      {/* 3-slot gallery container */}
      {selectedSchool && (
        <View style={styles.threeSlotContainer}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.imageSlot}>
              {schoolExitPhotos[index] ? (
                <View>
                  {/* Display image */}
                  <TouchableOpacity
                    onPress={() => openFullScreenModal(schoolExitPhotos[index])}
                  >
                    <Image
                      source={{ uri: schoolExitPhotos[index] }}
                      style={styles.slotImage}
                    />
                  </TouchableOpacity>

                  {/* Display trash icon at the bottom */}
                  <TouchableOpacity
                    style={styles.deleteIcon}
                    onPress={() => handleDeletePhoto(index)}
                  >
                    <Ionicons name="trash-outline" size={24} color="red" />
                    {/* <MaterialIcons name="delete" size={30} color="red" /> */}
                  </TouchableOpacity>
                </View>
              ) : (
                // Display the "+" icon when no image is present
                <TouchableOpacity
                  onPress={() => openCameraForFrame(index)} // Open the camera for the clicked frame
                >
                  <View style={styles.emptySlot}>
                    <MaterialIcons name="add" size={32} color="gray" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
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

      {/* Fullscreen modal for image viewing */}
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
      </Modal>

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
  );
};

export default SchoolInfoScreen;

const styles = StyleSheet.create({
  detailItemContainer: {
    //marginBottom: 10,
  },
  changeButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    //marginTop: 10,
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
    marginBottom: 8,
  },
  detailTextInput: {
    fontSize: 16,
    color: "#555",
    padding: 2,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  schoolContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  pickupDoorHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
  },
  threeSlotContainer: {
    flexDirection: "row",
    //justifyContent: "space-between",
    //marginTop: 5,
  },
  imageSlot: {
    width: width / 3,
    height: 245,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    //alignItems: "center",
    //margin: 5,
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
    bottom: 5, // Position the delete icon at the bottom of the frame
    right: 5, // Adjust position to the right bottom corner
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
  closeModalButton: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
  },
});
