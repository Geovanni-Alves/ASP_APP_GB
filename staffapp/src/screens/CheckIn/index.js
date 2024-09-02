import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import styles from "./styles";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
//import { API, graphqlOperation } from "aws-amplify";
import { useKidsContext } from "../../contexts/KidsContext";

const CheckIn = ({ schoolName }) => {
  const { kids } = useKidsContext();
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [filter, setFilter] = useState("");

  const handleStudentClick = (studentId) => {
    const index = selectedStudents.indexOf(studentId);
    if (index === -1) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      const updatedStudents = [...selectedStudents];
      updatedStudents.splice(index, 1);
      setSelectedStudents(updatedStudents);
    }
  };

  const isStudentSelected = (studentId) => {
    return selectedStudents.indexOf(studentId) !== -1;
  };

  const filteredStudents = kids.filter((student) =>
    student.name.toLowerCase().includes(filter.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleStudentClick(item.id)}
      style={[
        styles.studentContainer,
        isStudentSelected(item.id) && styles.selectedStudent,
      ]}
    >
      <Image source={{ uri: item.uriKid }} style={styles.profilePicture} />
      <Text style={styles.studentName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.checkHeader}>
        <Text style={styles.schoolName}>Gracie Barra Vancouver</Text>
      </View>
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by name"
          value={filter}
          onChangeText={(text) => setFilter(text)}
        />
      </View>
      <FlatList
        data={filteredStudents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.studentsList}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => {
            console.log("Confirmed check-in for students:", selectedStudents);
          }}
          disabled={selectedStudents.length === 0}
          style={[
            styles.touchableOpacityStyle,
            selectedStudents.length === 0 && styles.disabledButton,
          ]}
        >
          <MaterialIcons name="check-box" size={32} color="white" />
          <Text style={styles.buttonText}>Check-In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CheckIn;
