import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";

const StudentSelectionScreen = () => {
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
    const checkedInStudents = kids.filter((student) => student.checkedIn);
    setSelectedStudents(checkedInStudents);
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
        onPress={() => console.log("Next pressed")}
        disabled={selectedStudents.length === 0} // Disable the button if no students are selected
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  listContent: {
    justifyContent: "space-between",
  },
  searchBox: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  selectButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  selectButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  studentContainer: {
    padding: 8,
    margin: 5,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  imageContainer: {
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#c7c7c1",
  },
  selectedImageContainer: {
    borderWidth: 3,
    borderColor: "#18a32b",
    borderRadius: 50,
  },
  studentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  studentName: {
    fontSize: 14,
    textAlign: "center",
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#ccc", // Gray color when the button is disabled
  },

  nextButtonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
  },
});

export default StudentSelectionScreen;
