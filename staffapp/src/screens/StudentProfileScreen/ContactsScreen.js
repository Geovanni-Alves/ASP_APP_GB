import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";

const ContactsScreen = ({ kid }) => {
  const [contacts, setContacts] = useState([]); // Stores list of contacts
  const [isModalVisible, setIsModalVisible] = useState(false); // Controls modal visibility
  const [isEditing, setIsEditing] = useState(false); // Controls editing mode
  const [selectedContact, setSelectedContact] = useState(null); // Stores selected contact for editing
  const [newContactName, setNewContactName] = useState(""); // Stores contact name
  const [newContactEmail, setNewContactEmail] = useState(""); // Stores contact email
  const [newContactPhone, setNewContactPhone] = useState(""); // Stores contact phone
  const [newContactRelationship, setNewContactRelationship] = useState(""); // Stores relationship
  const [isPrimaryContact, setIsPrimaryContact] = useState(false); // Primary contact toggle
  const contactRelationships = ["Parent", "Family", "Approved Pickup"];

  useEffect(() => {
    fetchContacts();
  }, []);

  // Fetch contacts from the database
  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("student_id", kid.id); // Fetch contacts for the specific kid

      if (error) {
        throw error;
      }
      setContacts(data);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch contacts");
    }
  };

  // Send an invite to the contact's email
  const inviteUser = async (email, contactId) => {
    Alert.alert(
      "Send Invite",
      `Do you want to send an invite to ${email}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.admin.inviteUserByEmail(
                email
              );
              if (error) throw error;
              Alert.alert("Success", `Invite sent to ${email}`);

              // Update contact to mark invite as sent
              await supabase
                .from("contacts")
                .update({ invited: true })
                .eq("id", contactId);

              fetchContacts(); // Refresh contacts after successful invite
            } catch (error) {
              console.error("Error sending invite", error);
              Alert.alert("Error", "Failed to send invite");

              // Update contact to reflect invite failed
              await supabase
                .from("contacts")
                .update({ invited: false })
                .eq("id", contactId);

              fetchContacts(); // Refresh contacts after failed invite
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const saveContact = async () => {
    if (!newContactName || !newContactEmail || !newContactRelationship) {
      Alert.alert(
        "Error",
        "Please provide all required fields for the contact"
      );
      return;
    }

    try {
      let data, error;

      if (isEditing && selectedContact) {
        // Update existing contact
        ({ data, error } = await supabase
          .from("contacts")
          .update({
            name: newContactName,
            email: newContactEmail,
            phone: newContactPhone,
            relationship: newContactRelationship,
            is_primary_contact: isPrimaryContact,
          })
          .eq("id", selectedContact.id));
      } else {
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Step 1: Create the user in Supabase Auth with the temporary password
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: newContactEmail,
            password: tempPassword, // Temporary password
            email_confirm: true, // Skip the email verification for now
          });

        if (authError) {
          throw authError;
        }

        const authUserId = authData.user.id; // Get the newly created auth user ID

        // Step 2: Insert into `users` table with `firstLogin` set to true
        const { data: userData, error: userError } = await supabase
          .from("users")
          .insert([
            {
              email: newContactEmail,
              name: newContactName,
              phoneNumber: newContactPhone,
              userType: newContactRelationship, // Adjust based on your app's logic
              firstLogin: true, // Set firstLogin to true for new users
            },
          ])
          .select();

        if (userError) throw userError;

        const userDataId = userData.id;
        // Step 3: Add the contact record in the `contacts` table
        ({ data, error } = await supabase.from("contacts").insert([
          {
            name: newContactName,
            email: newContactEmail,
            phone: newContactPhone,
            relationship: newContactRelationship,
            is_primary_contact: isPrimaryContact,
            student_id: kid.id,
            invited: true,
            user_id: userDataId,
          },
        ]));

        if (error) throw error;

        // Optionally, notify the user with temporary credentials
        Alert.alert(
          "Success",
          `Contact added and user created with temporary password: ${tempPassword}`
        );
      }

      fetchContacts(); // Refresh the contacts list
      resetModal(); // Close modal and reset fields
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // Delete a contact from the database
  const deleteContact = async (contact) => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete ${contact.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("contacts")
                .delete()
                .eq("id", contact.id);
              if (error) {
                throw error;
              }
              fetchContacts(); // Refresh the contacts list
              Alert.alert("Success", `${contact.name} has been deleted.`);
            } catch (error) {
              Alert.alert("Error", "Failed to delete contact");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Open the edit modal for a contact
  const editContact = (contact) => {
    setSelectedContact(contact);
    setNewContactName(contact.name);
    setNewContactEmail(contact.email);
    setNewContactPhone(contact.phone);
    setNewContactRelationship(contact.relationship);
    setIsPrimaryContact(contact.is_primary_contact);
    setIsEditing(true);
    setIsModalVisible(true);
  };

  // Reset the modal state
  const resetModal = () => {
    setSelectedContact(null);
    setNewContactName("");
    setNewContactEmail("");
    setNewContactPhone("");
    setNewContactRelationship("");
    setIsPrimaryContact(false);
    setIsEditing(false);
    setIsModalVisible(false);
  };

  // Render a single contact item
  const renderContactItem = ({ item }) => (
    <View style={styles.contactContainer}>
      <View>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactEmail}>{item.email}</Text>
        <Text style={styles.contactRelationship}>{item.relationship}</Text>
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
        {/* Edit contact button */}
        <TouchableOpacity onPress={() => editContact(item)}>
          <Ionicons name="pencil" size={24} color="blue" />
        </TouchableOpacity>

        {/* Resend invite button (if user_id is null) */}
        {!item.user_id && (
          <TouchableOpacity onPress={() => inviteUser(item.email, item.id)}>
            <MaterialIcons
              name="email"
              size={24}
              color={item.invited ? "green" : "red"}
            />
          </TouchableOpacity>
        )}

        {/* Delete contact button */}
        <TouchableOpacity onPress={() => deleteContact(item)}>
          <Ionicons name="trash" size={24} color="red" />
        </TouchableOpacity>
      </View>

      {!item.invited && !item.user_id && (
        <Text style={styles.inviteFailedText}>Invite not sent</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={() => <Text>No contacts added yet.</Text>}
      />

      {/* Button to open modal for adding a new contact */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Add Contact</Text>
      </TouchableOpacity>

      {/* Modal for adding or editing a contact */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => resetModal()}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit Contact" : "Add Contact"}
            </Text>

            <TextInput
              placeholder="Contact Name"
              value={newContactName}
              onChangeText={setNewContactName}
              style={styles.input}
            />

            <TextInput
              placeholder="Contact Email"
              value={newContactEmail}
              onChangeText={setNewContactEmail}
              style={styles.input}
              keyboardType="email-address"
            />

            <TextInput
              placeholder="Phone Number"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              style={styles.input}
              keyboardType="phone-pad"
            />

            {/* Relationship selection */}
            <View style={styles.relationshipSelection}>
              {contactRelationships.map((relationship, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.relationshipButton,
                    newContactRelationship === relationship &&
                      styles.selectedRelationshipButton,
                  ]}
                  onPress={() => setNewContactRelationship(relationship)}
                >
                  <Text
                    style={[
                      styles.relationshipButtonText,
                      newContactRelationship === relationship &&
                        styles.selectedRelationshipButtonText,
                    ]}
                  >
                    {relationship}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Primary contact toggle */}
            <TouchableOpacity
              style={styles.togglePrimaryContact}
              onPress={() => setIsPrimaryContact(!isPrimaryContact)}
            >
              <Ionicons
                name={isPrimaryContact ? "checkbox" : "square-outline"}
                size={24}
                color={isPrimaryContact ? "green" : "black"}
              />
              <Text style={styles.toggleText}>Set as Primary Contact</Text>
            </TouchableOpacity>

            {/* Save contact button */}
            <TouchableOpacity style={styles.saveButton} onPress={saveContact}>
              <Text style={styles.saveButtonText}>
                {isEditing ? "Update Contact" : "Save Contact"}
              </Text>
            </TouchableOpacity>

            {/* Cancel button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => resetModal()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  contactRelationship: {
    fontSize: 14,
    color: "#888",
  },
  primaryContact: {
    fontSize: 14,
    color: "green",
    fontWeight: "bold",
    marginTop: 5,
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  relationshipSelection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  relationshipButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderColor: "#007BFF",
    borderWidth: 1,
    borderRadius: 5,
  },
  selectedRelationshipButton: {
    backgroundColor: "#007BFF",
  },
  relationshipButtonText: {
    color: "#007BFF",
  },
  selectedRelationshipButtonText: {
    color: "white",
  },
  togglePrimaryContact: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  toggleText: {
    marginLeft: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#007BFF",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 90,
  },
  inviteFailedText: {
    color: "red",
    marginTop: 5,
  },
});
