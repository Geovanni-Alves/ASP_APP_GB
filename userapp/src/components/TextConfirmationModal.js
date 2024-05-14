import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";

const TextConfirmationModal = ({
  questionText,
  isVisible,
  onConfirm,
  onCancel,
  showCancelButton = false,
  standardText,
  placeholderText = "Enter text...",
  sendMessage = false,
  onConfirmSuccess,
}) => {
  const [inputText, setInputText] = useState(standardText);

  const handleConfirm = () => {
    const confirmedText = inputText || setInputText;
    onConfirm(confirmedText);
    setInputText(""); // Clear input after confirming
    if (sendMessage && onConfirmSuccess) {
      onConfirmSuccess(confirmedText);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalText}>{questionText}</Text>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholderText}
          />
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>CONFIRM</Text>
            </Pressable>
            {showCancelButton && (
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  confirmButton: {
    backgroundColor: "green",
  },
  cancelButton: {
    backgroundColor: "red",
  },
});

export default TextConfirmationModal;
