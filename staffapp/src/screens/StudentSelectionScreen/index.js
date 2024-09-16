import styles from "./styles";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const StudentSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const from = route.params?.from;
  const [searchText, setSearchText] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const { kids } = useKidsContext();

  const goBack = () => {
    navigation.navigate("Activities");
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack}>
          <FontAwesome name="arrow-left" size={23} color="#fff" left={13} />
        </TouchableOpacity>
      ),
    });
  }, [route]);

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
    if (from === "Promotions") {
      navigation.navigate("Promotions", { selectedStudents });
    } else {
      navigation.navigate("Incidents", { selectedStudents });
    }
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
