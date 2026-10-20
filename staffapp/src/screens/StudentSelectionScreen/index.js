import styles from "./styles";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import { useTodayContext } from "../../contexts/TodayContext";
import RemoteImage from "../../components/RemoteImage";
import { useNavigation, useRoute } from "@react-navigation/native";

const StudentSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const from = route.params?.from;
  const [searchText, setSearchText] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const { kids } = useKidsContext();

  // Only the kids who are HERE today (checked in) can be chosen, so nobody is picked by mistake
  const { hereKids } = useTodayContext();
  const taggableKids = hereKids(kids);

  const handleSelectStudent = (student) => {
    if (selectedStudents.includes(student)) {
      setSelectedStudents(selectedStudents.filter((item) => item !== student));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === taggableKids.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(taggableKids);
    }
  };

  const handleNextPressed = () => {
    if (from === "Promotions") {
      navigation.navigate("Promotions", { selectedStudents });
    } else {
      navigation.navigate("Incidents", { selectedStudents });
    }
  };

  const filteredStudents = taggableKids.filter((student) =>
    student.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderStudentItem = ({ item }) => {
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
      {/* The search and "Select All" only make sense when there is somebody to choose */}
      {taggableKids.length > 1 && (
        <>
          <TextInput
            style={styles.searchBox}
            placeholder="Search Students..."
            value={searchText}
            onChangeText={setSearchText}
          />
          <View style={styles.buttonContainer}>
            {/* The list only has the kids who are checked in, so "all" means all of them */}
            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectButtonText}>Select All</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        numColumns={3} // Display 3 images per row
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          taggableKids.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 40, padding: 20 }}>
              <Text style={{ textAlign: "center", color: "#6c757d" }}>
                Nobody is checked in yet today, so there is nobody to choose. To
                post for a kid anyway, open the kid in the Students list and use
                New Activity there.
              </Text>
              <TouchableOpacity
                style={[styles.selectButton, { marginTop: 16 }]}
                onPress={() => navigation.navigate("Students")}
              >
                <Text style={styles.selectButtonText}>Go to Students</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              style={{ textAlign: "center", marginTop: 40, color: "#6c757d" }}
            >
              No student matches the search.
            </Text>
          )
        }
      />
      {taggableKids.length > 0 && (
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
      )}
    </View>
  );
};

export default StudentSelectionScreen;
