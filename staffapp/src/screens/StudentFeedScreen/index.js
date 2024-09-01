import styles from "./styles";
import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Linking,
  Pressable,
} from "react-native";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useFeedContext } from "../../contexts/FeedContext";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import InfoModal from "../../components/InfoModal";
import RemoteVideo from "../../components/RemoteVideo";

const StudentFeedScreen = () => {
  const route = useRoute();
  const { id: kidID } = route.params;
  const navigation = useNavigation();
  const { kids } = useKidsContext();
  const { feeds } = useFeedContext();
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedKidFeeds, setSelectedKidFeeds] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showStudentInfo, setShowStudentInfo] = useState(false);

  const goBack = () => {
    //navigation.navigate("Home");
    navigation.navigate("Students");
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
        title: `${selectedKid?.name}`,
      });
    }
  }, [route, selectedKid]);

  useEffect(() => {
    const fetchSelectedKidFeeds = async () => {
      // Filter feeds for the selected kid
      const selectedKidFeeds = feeds.filter((feed) => feed.studentId === kidID);

      // Sort feeds by date in descending order
      const sortedFeeds = selectedKidFeeds.sort(
        (a, b) => new Date(b.dateTime) - new Date(a.dateTime)
      );

      // Update state with sorted feeds
      setSelectedKidFeeds(sortedFeeds);
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
      case "VIDEO":
        iconComponent = (
          <MaterialCommunityIcons
            name="video"
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
        {item.mediaName && item.type === "PHOTO" && (
          <TouchableOpacity
            onPress={() => handleMediaPress(item.mediaName, item.type)}
          >
            <RemoteImage
              path={item.mediaName}
              style={styles.image}
              bucketName="feedPhotos"
            />
          </TouchableOpacity>
        )}
        {item.mediaName && item.type === "VIDEO" && (
          <View style={styles.videoContainer}>
            <RemoteVideo
              path={item.mediaName}
              name={selectedKid.name}
              bucketName="feedVideos"
              onlyThumbnail={true}
              thumbnailTime={1000}
              style={styles.video}
              onLoading={setVideoLoading}
            />
            {!videoLoading && (
              <TouchableOpacity
                onPress={() => handleMediaPress(item.mediaName, item.type)}
                style={styles.touchableOverlay}
              >
                <MaterialIcons
                  name="play-circle-outline"
                  size={80}
                  color="white"
                  style={styles.playIcon}
                />
              </TouchableOpacity>
            )}
          </View>
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

  const handleCallPress = () => {
    const phoneNumber = selectedKid.Parent1?.phoneNumber;
    if (!phoneNumber) {
      setShowInfoModal(true);
    } else {
      const phoneNumberWithPrefix = `tel:${phoneNumber}`;
      Linking.canOpenURL(phoneNumberWithPrefix)
        .then((supported) => {
          if (!supported) {
            console.error("Phone number not supported");
          } else {
            return Linking.openURL(phoneNumberWithPrefix);
          }
        })
        .catch((error) => console.error(error));
    }
  };

  const handleSMSPress = () => {
    const phoneNumber = selectedKid.Parent1?.phoneNumber;
    if (!phoneNumber) {
      setShowInfoModal(true);
    } else {
      const smsNumber = `sms:${phoneNumber}`;
      Linking.canOpenURL(smsNumber)
        .then((supported) => {
          if (!supported) {
            console.error("SMS not supported");
          } else {
            return Linking.openURL(smsNumber);
          }
        })
        .catch((error) => console.error(error));
    }
  };

  const renderHeader = () => {
    return (
      <View>
        <View style={styles.headerContainer}>
          <View>
            <RemoteImage
              path={selectedKid.photo}
              style={styles.KidImage}
              name={selectedKid.name}
              bucketName="profilePhotos"
            />
          </View>
        </View>

        <View style={styles.separator} />
      </View>
    );
  };

  const handleMediaPress = (mediaName, mediaType) => {
    setSelectedMedia(mediaName);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMedia(null);
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
        <FlatList
          ListHeaderComponent={renderHeader}
          data={selectedKidFeeds}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ flexGrow: 1, gap: 10 }}
          bounces={true}
          scrollEnabled={true}
          ListEmptyComponent={ListEmptyComponent}
        />
      </SafeAreaView>

      <View style={styles.actionButtonsContainer}>
        <Pressable style={styles.actionButton} onPress={handleCallPress}>
          <Ionicons name="call-outline" size={24} color="black" />
          <Text style={styles.actionButtonText}>Call</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleSMSPress}>
          <Ionicons name="chatbubble-outline" size={24} color="black" />
          <Text style={styles.actionButtonText}>SMS</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            /* Add navigation here */
          }}
        >
          <AntDesign name="staro" size={24} color="black" />
          <Text style={styles.actionButtonText}>New Activity</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            navigation.navigate("StudentProfile", { id: selectedKid.id });
          }}
        >
          <AntDesign name="profile" size={24} color="black" />
          <Text style={styles.actionButtonText}>Profile</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            setShowStudentInfo(true);
          }}
        >
          <AntDesign name="infocirlceo" size={24} color="black" />
          <Text style={styles.actionButtonText}>Info</Text>
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {selectedMedia && selectedMedia.includes(".mp4") ? (
            <RemoteVideo
              path={selectedMedia}
              name={selectedKid.name}
              bucketName="feedVideos"
              style={styles.fullVideo}
            />
          ) : (
            <RemoteImage
              path={selectedMedia}
              style={styles.fullImage}
              bucketName="feedPhotos"
            />
          )}
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 70,
              right: 20,
              zIndex: 9999, // Ensure the close button is on top
              backgroundColor: "gray",
              borderRadius: 30,
            }}
            onPress={closeModal}
          >
            <Entypo name="cross" size={25} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      {showInfoModal && (
        <InfoModal
          isVisible={true}
          onClose={() => setShowInfoModal(false)}
          infoItems={[
            {
              label: "Missing Phone Number",
              value: "Please register a phone number for this student.",
            },
          ]}
        />
      )}
      {showStudentInfo && (
        <InfoModal
          isVisible={true}
          onClose={() => setShowStudentInfo(false)}
          header={selectedKid.name}
          horizontalLayout={true}
          infoItems={[
            { label: "Birthday:", value: selectedKid.birthDate },
            { label: "Medications:", value: selectedKid.medicine },
            { label: "Allergies:", value: selectedKid.allergies },
            { label: "Notes:", value: selectedKid.notes },
          ]}
        />
      )}
    </View>
  );
};

export default StudentFeedScreen;
