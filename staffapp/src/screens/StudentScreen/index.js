import styles from "./styles";
import {
  FlatList,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React, { useState } from "react";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import { useNavigation } from "@react-navigation/native";

const StudentScreen = () => {
  const navigation = useNavigation();
  const { kids } = useKidsContext();
  const [searchByName, setSearchByName] = useState("");
  const [filteredStudents, setFilteredStudents] = useState(kids);

  const handleSearch = (text) => {
    setSearchByName(text);
    if (text) {
      const filteredData = kids.filter((kid) =>
        kid.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStudents(filteredData);
    } else {
      setFilteredStudents(kids);
    }
  };

  const renderStudents = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate("StudentFeed", { id: item.id });
        }}
      >
        <View style={styles.studentContainer}>
          <RemoteImage
            path={item.photo}
            name={item.name}
            style={styles.image}
            bucketName="profilePhotos"
          />
          <Text style={styles.name}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name"
        value={searchByName}
        onChangeText={handleSearch}
      />
      <FlatList
        data={filteredStudents}
        renderItem={renderStudents}
        keyExtractor={(item) => item.id.toString()}
      />
    </SafeAreaView>
  );
};

export default StudentScreen;
