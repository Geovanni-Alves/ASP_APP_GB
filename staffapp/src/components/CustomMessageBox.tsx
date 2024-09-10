import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextStyle,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Import icons for "X" close button
import { useNavigation } from "@react-navigation/native";

interface InfoItem {
  label: string;
  value: string;
}

interface CustomMessageBoxProps {
  isVisible: boolean;
  onClose: () => void;
  header?: string;
  infoItems: InfoItem[];
  horizontalLayout?: boolean;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  shouldNavigateAfterFinish?: boolean;
  whereToNavigate?: string;
  showTextInput?: boolean; // New prop to show or hide the text input
  textInputPlaceholder?: string; // Placeholder for text input
  confirmButtonText?: string; // New prop for confirm button text
  cancelButtonText?: string; // New prop for cancel button text
  onSubmit?: (action: string, inputValue?: string) => void; // Callback for the submission
}

const CustomMessageBox: React.FC<CustomMessageBoxProps> = ({
  isVisible,
  onClose,
  header,
  infoItems,
  horizontalLayout = false,
  labelStyle,
  valueStyle,
  shouldNavigateAfterFinish = false,
  whereToNavigate = "",
  showTextInput = false, // Default to not show text input
  textInputPlaceholder = "",
  confirmButtonText = "Yes", // Default confirm button text
  cancelButtonText = "No", // Default cancel button text
  onSubmit,
}) => {
  const navigation = useNavigation();
  const [inputValue, setInputValue] = useState("");

  const handlePressOk = () => {
    onClose();
    if (onSubmit) {
      onSubmit("Yes", showTextInput ? inputValue : undefined); // Pass the input value when submitting
    }
    if (shouldNavigateAfterFinish && whereToNavigate) {
      navigation.navigate(whereToNavigate);
    }
  };

  const handlePressNo = () => {
    onClose();
    if (onSubmit) {
      onSubmit("No"); // Submit with no input
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Close Button (X) at top right */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Modal Header */}
          {header && <Text style={styles.header}>{header}</Text>}

          {/* Info Items */}
          {infoItems.map((item, index) => (
            <View
              key={index}
              style={[
                styles.infoItem,
                horizontalLayout && styles.horizontalLayout,
              ]}
            >
              <Text style={[styles.label, labelStyle]}>{item.label}</Text>
              <Text
                style={[
                  styles.value,
                  valueStyle,
                  horizontalLayout && styles.fixedSpacing,
                ]}
              >
                {item.value}
              </Text>
            </View>
          ))}

          {/* Text Input */}
          {showTextInput && (
            <TextInput
              style={styles.textInput}
              placeholder={textInputPlaceholder}
              value={inputValue}
              onChangeText={setInputValue}
              placeholderTextColor="gray"
            />
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[
                styles.button,
                inputValue || !showTextInput
                  ? styles.confirmButton
                  : styles.disabledButton,
              ]}
              onPress={handlePressOk}
              disabled={showTextInput && !inputValue} // Disable if no input
            >
              <Text style={styles.buttonText}>{confirmButtonText}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handlePressNo}
            >
              <Text style={styles.buttonText}>{cancelButtonText}</Text>
            </Pressable>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dim background
  },
  modalContainer: {
    backgroundColor: "white",
    top: -51,
    padding: 25,
    paddingBottom: 5,
    borderRadius: 15, // Rounded corners
    elevation: 10, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: "85%", // Adjust modal width
    position: "relative", // Relative positioning for the close button
  },
  horizontalLayout: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333", // Darker text for a cleaner look
  },
  infoItem: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: "#666",
  },
  fixedSpacing: {
    marginLeft: 10,
  },
  textInput: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10, // Rounded text input
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 15,
    color: "#000",
    backgroundColor: "#f9f9f9", // Light background for input
  },
  buttonContainer: {
    //flexDirection: "row",
    justifyContent: "space-evenly",
    //marginTop: 15,
    margin: 10,
  },
  button: {
    paddingVertical: 10,
    //paddingHorizontal: 20,
    margin: 5,
    borderRadius: 10, // Rounded buttons
    elevation: 2,
    marginHorizontal: 30,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  confirmButton: {
    backgroundColor: "#28a745", // Green for confirm button
  },
  cancelButton: {
    backgroundColor: "#dc3545", // Red for cancel button
  },
  disabledButton: {
    backgroundColor: "gray", // Gray for disabled button
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    marginBottom: 10,
    backgroundColor: "gray",
    borderRadius: 20,
  },
});

export default CustomMessageBox;
