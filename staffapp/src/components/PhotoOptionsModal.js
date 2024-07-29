import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { usePicturesContext } from "../contexts/PicturesContext";

const PhotoOptionsModal = ({ isVisible, onClose, onSelectOption }) => {
  const [loading, setLoading] = useState(false);
  const { savePhotoInBucket } = usePicturesContext();

  const handlePhotoChange = async (useCamera) => {
    try {
      setLoading(true);
      const imagePath = await savePhotoInBucket(useCamera);

      if (imagePath.assets !== null) {
        onSelectOption(imagePath);
        //alert("Image successfully updated!");
      } else {
        console.log("Image selection canceled or encountered an error");
      }
    } catch (error) {
      console.error("Error saving image to storage", error);
    } finally {
      onClose();
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Changing Photo...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Choose Photo Source</Text>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handlePhotoChange(true)}
              >
                <Text style={styles.optionText}>Take a Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handlePhotoChange(false)}
              >
                <Text style={styles.optionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  optionButton: {
    width: "100%",
    padding: 15,
    backgroundColor: "#2196F3",
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 5,
  },
  optionText: {
    color: "white",
    fontSize: 16,
  },
  cancelButton: {
    width: "100%",
    padding: 15,
    backgroundColor: "grey",
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 5,
  },
  cancelText: {
    color: "white",
    fontSize: 16,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#000",
  },
});

export default PhotoOptionsModal;
