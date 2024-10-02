/**
 * InfoModal Component
 *
 * @param {boolean} isVisible - Controls whether the modal is visible or not.
 * @param {function} onClose - Function to call when the modal is closed.
 * @param {string} header - Optional header text for the modal.
 * @param {Array} infoItems - Array of objects containing label and value pairs to display.
 * @param {boolean} horizontalLayout - If true, displays label and value in a horizontal layout.
 * @param {object} labelStyle - Optional style to apply to the label text.
 * @param {object} valueStyle - Optional style to apply to the value text.
 * @param {boolean} shouldNavigateAfterFinish - Optional. If true, the modal will trigger navigation after the user presses OK.
 * @param {string} whereToNavigate - Optional. Specifies the route name to navigate to when shouldNavigateAfterFinish is true.
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

interface InfoItem {
  label: string;
  value: string;
}

interface InfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  header?: string;
  infoItems: InfoItem[];
  horizontalLayout?: boolean;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  shouldNavigateAfterFinish?: boolean;
  whereToNavigate?: string;
}

const InfoModal: React.FC<InfoModalProps> = ({
  isVisible,
  onClose,
  header,
  infoItems,
  horizontalLayout = false,
  labelStyle,
  valueStyle,
  shouldNavigateAfterFinish = false,
  whereToNavigate = "",
}) => {
  const navigation = useNavigation();

  const handlePressOk = () => {
    onClose();
    if (shouldNavigateAfterFinish && whereToNavigate) {
      navigation.navigate(whereToNavigate);
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
          {header && <Text style={styles.header}>{header}</Text>}
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
          <Pressable
            style={[styles.button, styles.okButton]}
            onPress={handlePressOk}
          >
            <Text style={styles.buttonText}>OK</Text>
          </Pressable>
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
  horizontalLayout: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },
  infoItem: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
  },
  fixedSpacing: {
    marginLeft: 5,
  },
  button: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    elevation: 2,
    backgroundColor: "blue",
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  okButton: {
    backgroundColor: "green",
  },
});

export default InfoModal;
