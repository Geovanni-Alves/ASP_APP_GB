import React, { useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";

const InfoModal = ({ isVisible, onClose, infoItems }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {infoItems.map((item, index) => (
            <View key={index} style={styles.infoItem}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
          <Pressable style={[styles.button, styles.okButton]} onPress={onClose}>
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
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  infoItem: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    elevation: 2,
    backgroundColor: "blue", // Default background color for buttons
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  okButton: {
    backgroundColor: "green", // Change button color if needed
  },
});

export default InfoModal;
