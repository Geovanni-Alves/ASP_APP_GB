import styles from "./styles";
import {
  FlatList,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const StudentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { kids, RefreshKidsData } = useKidsContext();
  const [searchByName, setSearchByName] = useState("");
  const [filteredStudents, setFilteredStudents] = useState(kids);
  const [refreshing, setRefreshing] = useState(false);

  const goBack = () => {
    navigation.goBack();
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

  // Effect to filter students whenever kids data changes
  useEffect(() => {
    if (searchByName) {
      const filteredData = kids.filter((kid) =>
        kid.name.toLowerCase().includes(searchByName.toLowerCase())
      );
      setFilteredStudents(filteredData);
    } else {
      setFilteredStudents(kids);
    }
  }, [kids, searchByName]);

  const handleSearch = (text) => {
    setSearchByName(text);
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await RefreshKidsData(); // Fetch latest data
    setRefreshing(false);
  }, [RefreshKidsData]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default StudentScreen;
