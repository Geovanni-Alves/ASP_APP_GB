import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import styles from "./styles"; // Import your styles here

const Incidents = () => {
  const [time, setTime] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [conclusion, setConclusion] = useState("");

  // Dummy student data
  const student = {
    name: "Davi",
    profilePicture: "https://i.ibb.co/H7L0jbj/profile.jpg",
  };

  const handleAddReport = () => {
    // Implement your logic to add the report here
    console.log("Time:", time);
    console.log("Staff Notes:", staffNotes);
    console.log("Conclusion:", conclusion);
    // Clear the input fields after adding the report
    setTime("");
    setStaffNotes("");
    setConclusion("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Incidents</Text>
      </View>
      {/* Display student data */}
      <View style={styles.studentContainer}>
        <Image
          source={{ uri: student.profilePicture }}
          style={styles.profilePicture}
        />
        <Text style={styles.studentName}>{student.name}</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Time"
          value={time}
          onChangeText={(text) => setTime(text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Staff Notes"
          multiline
          numberOfLines={4}
          value={staffNotes}
          onChangeText={(text) => setStaffNotes(text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Conclusion"
          multiline
          numberOfLines={4}
          value={conclusion}
          onChangeText={(text) => setConclusion(text)}
        />
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddReport}
        disabled={!time || !staffNotes || !conclusion}
      >
        <Text style={styles.buttonText}>Add Report</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Incidents;
