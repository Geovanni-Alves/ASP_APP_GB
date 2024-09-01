import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFeedContext } from "../../contexts/FeedContext";
import RemoteImage from "../../components/RemoteImage";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";

const StudentGalleryScreen = ({ route }) => {
  const navigation = useNavigation();
  const { feeds } = useFeedContext();
  const { id, name } = route.params;
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const goBack = () => {
    navigation.navigate("Feed", { id: id });
  };

  useEffect(() => {
    setLoading(false);
  }, [feeds]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
    // if (kid) {
    navigation.setOptions({
      title: `${name} Gallery`,
    });
    // }
  }, [route]);

  const handleImagePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const renderPhotoItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => handleImagePress(item.photoName)}
        style={styles.imageContainer}
      >
        <RemoteImage path={item.photoName} style={styles.image} />
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No photos available</Text>
    </View>
  );

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size={"large"}
      />
    );
  }

  const filteredFeeds = feeds.filter(
    (feed) => feed.studentId === id && feed.photoName
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredFeeds}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
        numColumns={3}
      />
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <RemoteImage path={selectedImage} style={styles.fullImage} />
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Text style={{ fontSize: 30, color: "white" }}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StudentGalleryScreen;
