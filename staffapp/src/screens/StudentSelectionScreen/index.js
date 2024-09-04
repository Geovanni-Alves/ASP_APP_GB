import styles from "./styles";
import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import { useNavigation } from "@react-navigation/native";

const StudentSelectionScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const { kids } = useKidsContext();

  const handleSelectStudent = (student) => {
    if (selectedStudents.includes(student)) {
      setSelectedStudents(selectedStudents.filter((item) => item !== student));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === kids.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(kids);
    }
  };

  const handleSelectCheckedIn = () => {
    // Placeholder logic, you can replace this with your actual logic for selecting checked-in students.
    // const checkedInStudents = kids.filter((student) => student.checkedIn);
    // setSelectedStudents(checkedInStudents);
  };

  const handleNextPressed = () => {
    console.log(selectedStudents);
    console.log("Next pressed");
    navigation.navigate("Incidents", { selectedStudents });
  };

  const filteredStudents = kids.filter((student) =>
    student.name.toLowerCase().includes(searchText.toLowerCase())
  );

  renderStudentItem = ({ item }) => {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => handleSelectStudent(item)}>
          <View style={styles.studentContainer}>
            <View
              style={[
                styles.imageContainer,
                selectedStudents.includes(item) &&
                  styles.selectedImageContainer,
              ]}
            >
              <RemoteImage
                path={item.photo}
                name={item.name}
                style={styles.studentImage}
                bucketName="profilePhotos"
              />
            </View>
            <Text style={styles.studentName}>{item.name}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBox}
        placeholder="Search Students..."
        value={searchText}
        onChangeText={setSearchText}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.selectButton} onPress={handleSelectAll}>
          <Text style={styles.selectButtonText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={handleSelectCheckedIn}
        >
          <Text style={styles.selectButtonText}>Select Checked In</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        numColumns={3} // Display 3 images per row
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity
        style={[
          styles.nextButton,
          selectedStudents.length === 0 && styles.disabledButton,
        ]}
        onPress={handleNextPressed}
        disabled={selectedStudents.length === 0} // Disable the button if no students are selected
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default StudentSelectionScreen;
