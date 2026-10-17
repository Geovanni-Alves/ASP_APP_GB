// src/screens/StudentProfileScreen/ContactsScreen.js
import React from "react";
import {
  Text,
  View,
  FlatList,
  StyleSheet,
  Alert,
  Linking,
  Pressable,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

// The family of the kid. The team can call or send an SMS from here.
// Adding, changing and inviting contacts is done in the dashboard, not in the app.
const ContactsScreen = ({ kid }) => {
  // The contacts come with the kid (the API sends them together with the students)
  const contacts = (kid?.student_family || []).map(
    ({ contact, is_primary }) => ({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
      email: contact.email,
      phone: contact.phone,
      invited: contact.invited,
      signed: contact.signed,
      user_id: contact.user_id,
      type: contact.type,
      is_primary_contact: is_primary,
    }),
  );

  const handleCallPress = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert("No phone number available");
      return;
    }

    const phoneURL = `tel:${phoneNumber}`;

    Linking.canOpenURL(phoneURL)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Error", "This device cannot make calls");
        } else {
          Linking.openURL(phoneURL);
        }
      })
      .catch((err) => console.error(err));
  };

  const handleSMSPress = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert("No phone number available");
      return;
    }

    const smsNumber = `sms:${phoneNumber}`;
    Linking.canOpenURL(smsNumber)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Error", "This device cannot send SMS");
        } else {
          return Linking.openURL(smsNumber);
        }
      })
      .catch((error) => console.error(error));
  };

  const renderContactItem = ({ item }) => (
    <View style={styles.contactContainer}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.contactName}>{item.name}</Text>

          {item.is_primary_contact && (
            <Ionicons
              name="shield-checkmark"
              size={18}
              color="green"
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
        <Text style={styles.contactEmail}>Email: {item.email}</Text>
        {item.phone && <Text style={styles.contactPhone}>📞 {item.phone}</Text>}
        <Text style={styles.contactRelationship}>{item.type}</Text>
        {item.is_primary_contact && (
          <Text style={styles.primaryContact}>Primary Contact</Text>
        )}
        {item.signed && (
          <View style={styles.signedContainer}>
            <FontAwesome name="check-circle" size={20} color="green" />
            <Text style={styles.signedContact}>Signed/Joined</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <Pressable onPress={() => handleCallPress(item.phone)}>
          <Ionicons name="call-outline" size={24} color="black" />
          <Text>Call</Text>
        </Pressable>
        <Pressable onPress={() => handleSMSPress(item.phone)}>
          <Ionicons name="chatbubble-outline" size={24} color="black" />
          <Text>SMS</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => <Text>No contacts added yet.</Text>}
      />
    </View>
  );
};

export default ContactsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  contactContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 10,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  contactEmail: {
    fontSize: 14,
    color: "#666",
  },
  contactPhone: {
    fontSize: 14,
    color: "#666",
  },
  contactRelationship: {
    fontSize: 14,
    color: "#888",
  },
  primaryContact: {
    fontSize: 14,
    color: "green",
    fontWeight: "bold",
    marginTop: 1,
  },
  signedContact: {
    fontSize: 14,
    color: "blue",
    fontWeight: "bold",
    marginTop: 5,
    marginLeft: 5,
  },
  signedContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 90,
  },
});
