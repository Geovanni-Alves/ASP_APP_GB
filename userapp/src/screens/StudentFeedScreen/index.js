import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import styles from "./styles";
import { useFeedContext } from "../../contexts/FeedContext";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import { LinearGradient } from "expo-linear-gradient";

const StudentFeedScreen = () => {
  const route = useRoute();
  const { id: kidID } = route.params;
  const navigation = useNavigation();
  const { kids } = useKidsContext();
  const { feeds } = useFeedContext();
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedKidFeeds, setSelectedKidFeeds] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const goBack = () => {
    //navigation.navigate("Home");
    navigation.goBack();
  };

  useEffect(() => {
    //console.log("KidID on useEffect", kidID);
    if (kidID) {
      const foundKid = kids.find((kid) => kid.id === kidID);
      if (foundKid) {
        setSelectedKid(foundKid);
      }
    }
  }, [kidID, kids]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack}>
          <FontAwesome name="arrow-left" size={23} color="#fff" left={13} />
        </TouchableOpacity>
      ),
    });
    if (selectedKid) {
      navigation.setOptions({
        title: `${selectedKid?.name} Updates`,
      });
    }
  }, [route, selectedKid]);

  useEffect(() => {
    const fetchSelectedKidFeeds = async () => {
      const selectedKidFeeds = feeds.filter((feed) => feed.studentId === kidID);

      const updatedFeeds = [];
      for (const feed of selectedKidFeeds) {
        updatedFeeds.push(feed);
      }
      setSelectedKidFeeds(updatedFeeds);
      setLoading(false);
    };

    fetchSelectedKidFeeds();
  }, [feeds, kidID]);

  function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formattedDate} (${formattedTime})`;
  }

  const renderFeedItem = ({ item, index }) => {
    let iconComponent = null;
    let dateComponent = null;

    if (index === 0 || item.dateTime !== selectedKidFeeds[index - 1].dateTime) {
      dateComponent = (
        <Text style={styles.dateText}>{formatDateTime(item.dateTime)}</Text>
      );
    }

    switch (item.type) {
      case "PHOTO":
        iconComponent = (
          <FontAwesome
            name="camera"
            size={24}
            color="black"
            style={styles.icon}
          />
        );
        break;
      case "ACTIVITY":
        iconComponent = (
          <MaterialCommunityIcons
            name="weight-lifter"
            size={24}
            color="black"
          />
        );
        break;
      case "ATTENDANCE":
        iconComponent = (
          <Entypo name="calendar" size={24} color="black" style={styles.icon} />
        );
        break;
      case "PROMOTION":
        iconComponent = (
          <Entypo
            name="megaphone"
            size={24}
            color="black"
            style={styles.icon}
          />
        );
        break;
      default:
        iconComponent = null;
    }

    return (
      <View style={styles.feedItemContainer}>
        <View style={styles.itemContent}>
          {iconComponent && (
            <View style={styles.iconContainer}>{iconComponent}</View>
          )}
          <View style={styles.textContainer}>
            <Text style={styles.itemText}>
              {selectedKid.name} {item.text}
            </Text>
            {dateComponent}
          </View>
        </View>
        {item.mediaName && (
          <TouchableOpacity onPress={() => handleImagePress(item.mediaName)}>
            <RemoteImage path={item.mediaName} style={styles.image} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ListEmptyComponent = () => {
    if (selectedKidFeeds.length === 0) {
      return (
        <View
          style={{
            alignItems: "center",
            padding: 50,
          }}
        >
          <Text style={{ letterSpacing: 1.1, fontSize: 20, fontWeight: "600" }}>
            No updates for your kid yet!
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => {
    return (
      <View>
        <LinearGradient
          colors={["#1e40c7", "#f7f8fa"]}
          //locations={[0.3, 0.8]}
          style={styles.gradientContainer}
        >
          <View>
            <View>
              <RemoteImage
                path={selectedKid.photo}
                style={styles.KidImage}
                name={selectedKid.name}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => {
                    navigation.navigate("KidProfile", {
                      id: selectedKid.id,
                    });
                  }}
                >
                  <MaterialIcons
                    name="child-care"
                    size={24}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.profileButtonText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={() => {
                    navigation.navigate("Gallery", {
                      id: selectedKid.id,
                      name: selectedKid.name,
                    });
                  }}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={24}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.galleryButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.separator} />
      </View>
    );
  };

  const handleImagePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  if (!selectedKid) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size={"large"}
      />
    );
  }

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size={"large"}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.contentContainer}>
        <View>
          <FlatList
            ListHeaderComponent={renderHeader}
            data={selectedKidFeeds.reverse()}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ flexGrow: 1, gap: 10 }}
            bounces={true}
            scrollEnabled={true}
            ListEmptyComponent={ListEmptyComponent}
          />
        </View>
      </SafeAreaView>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <RemoteImage path={selectedImage} style={styles.fullImage} />
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 25,
              right: 10,
              zIndex: 9999, // Ensure the close button is on top
            }}
            onPress={closeModal}
          >
            <Entypo name="cross" size={30} color="red" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default StudentFeedScreen;
