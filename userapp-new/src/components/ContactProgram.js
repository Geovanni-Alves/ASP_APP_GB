// src/components/ContactProgram.js
// A way to reach the program: call or e-mail. (When it is too late to tell an absence in the app, the family calls.)
import React from "react";
import { Alert, Linking, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const open = async (url) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert("Could not open it", "Please try again in a moment.");
  }
};

const ContactProgram = ({ name, phone, email }) => {
  if (!phone && !email) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Need to talk to us?</Text>
      {!!name && <Text style={styles.name}>{name}</Text>}
      <View style={styles.row}>
        {!!phone && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => open(`tel:${phone.replace(/[^\d+]/g, "")}`)}
          >
            <MaterialCommunityIcons name="phone" size={18} color="#5337E0" />
            <Text style={styles.buttonText}>Call</Text>
          </TouchableOpacity>
        )}
        {!!email && (
          <TouchableOpacity style={styles.button} onPress={() => open(`mailto:${email}`)}>
            <MaterialCommunityIcons name="email-outline" size={18} color="#5337E0" />
            <Text style={styles.buttonText}>E-mail</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  name: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#f1eeff",
  },
  buttonText: { color: "#5337E0", fontWeight: "700" },
});

export default ContactProgram;
