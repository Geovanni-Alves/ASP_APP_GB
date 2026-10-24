// src/components/AbsenceDialog.js
// "Is the child not coming today?": asks to confirm, with a note for the team (optional).
// It is a card over a dark background that moves UP with the keyboard, so the buttons are always visible.
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, TextInput } from "react-native-paper";

const AbsenceDialog = ({ visible, kidName, busy, onCancel, onConfirm }) => {
  const [note, setNote] = useState("");

  // Every time it opens, the note starts empty
  useEffect(() => {
    if (visible) setNote("");
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={busy ? undefined : onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* A tap on the dark area only closes the keyboard (it never cancels by accident) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />

        <View style={styles.card}>
          <Text style={styles.title}>{kidName} is not coming today?</Text>
          <Text style={styles.text}>
            The team will be told, and will not wait for {kidName} at school.
            You can leave a short note.
          </Text>

          <TextInput
            mode="outlined"
            label="Note for the team (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
            maxLength={300}
            style={styles.input}
          />

          <View style={styles.actions}>
            <Button onPress={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => onConfirm(note.trim())}
              loading={busy}
              disabled={busy}
            >
              Confirm
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  text: { fontSize: 14, color: "#4b5563", marginTop: 8, marginBottom: 12 },
  input: { backgroundColor: "#ffffff", maxHeight: 90 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
});

export default AbsenceDialog;
