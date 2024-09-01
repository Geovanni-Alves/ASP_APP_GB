import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useKidsContext } from "../contexts/KidsContext";

const TagModal = ({ isVisible, mediaUri, onTaggingComplete, onClose }) => {
  const { kids } = useKidsContext(); // Assuming you have a KidsContext providing the list of kids
  const [selectedKids, setSelectedKids] = useState([]);

  const toggleKidSelection = (kidId) => {
    setSelectedKids((prevSelected) =>
      prevSelected.includes(kidId)
        ? prevSelected.filter((id) => id !== kidId)
        : [...prevSelected, kidId]
    );
  };

  const renderKidItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.kidItem,
        selectedKids.includes(item.id) && styles.kidItemSelected,
      ]}
      onPress={() => toggleKidSelection(item.id)}
    >
      <Text style={styles.kidName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          <Image
            source={{ uri: mediaUri }}
            style={styles.mediaPreview}
            resizeMode="contain"
          />
          <FlatList
            data={kids}
            renderItem={renderKidItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            style={styles.kidList}
            contentContainerStyle={styles.kidListContainer}
          />
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={() => onTaggingComplete(selectedKids)}
          >
            <Text style={styles.proceedButtonText}>Tag and Proceed</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default TagModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
  },
  mediaPreview: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    marginBottom: 20,
  },
  kidList: {
    marginBottom: 20,
  },
  kidListContainer: {
    justifyContent: "center",
  },
  kidItem: {
    padding: 10,
    backgroundColor: "#EEE",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  kidItemSelected: {
    backgroundColor: "#DCF8C6",
  },
  kidName: {
    fontSize: 16,
    textAlign: "center",
  },
  proceedButton: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  proceedButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
});
