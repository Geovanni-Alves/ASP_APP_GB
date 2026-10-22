import styles from "./styles";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
} from "react-native";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import Fontisto from "@expo/vector-icons/Fontisto";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useFeedContext } from "../../contexts/FeedContext";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";
import RemoteVideo from "../../components/RemoteVideo";
import PhotoCarousel from "../../components/PhotoCarousel";
import InfoModal from "../../components/InfoModal";
import FullScreenImage from "../../components/FullScreenImageModal";
import FullScreenVideo from "../../components/FullScreenVideoModal";

// The height of the photos in the feed (the one of the style, or 300 when it has none)
const photoHeight = () => {
  const height = StyleSheet.flatten(styles.image)?.height;
  return typeof height === "number" ? height : 300;
};

// The photos of a feed item: the stacked list, or the single photo of the older items
const photosOf = (item) => {
  if (item.type === "VIDEO") return [];
  if (Array.isArray(item.mediaNames) && item.mediaNames.length > 0) {
    return item.mediaNames;
  }
  return item.mediaName ? [item.mediaName] : [];
};

const StudentFeedScreen = () => {
  const route = useRoute();
  const { id: kidID } = route.params;
  const navigation = useNavigation();
  const { kids } = useKidsContext();
  const { feeds } = useFeedContext();
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedKidFeeds, setSelectedKidFeeds] = useState([]);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [fullScreenVideoModal, setFullScreenVideoModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showStudentInfo, setShowStudentInfo] = useState(false);

  useEffect(() => {
    if (kidID) {
      const foundKid = kids.find((kid) => kid.id === kidID);
      if (foundKid) {
        setSelectedKid(foundKid);
      }
    }
  }, [kidID, kids]);

  useEffect(() => {
    const fetchSelectedKidFeeds = async () => {
      // Filter feeds for the selected kid
      const selectedKidFeeds = feeds.filter((feed) => feed.studentId === kidID);

      // Sort feeds by date in descending order
      const sortedFeeds = selectedKidFeeds.sort(
        (a, b) => new Date(b.dateTime) - new Date(a.dateTime),
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
    const photos = photosOf(item);

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
      case "INCIDENT":
        iconComponent = (
          <Fontisto
            name="bandage"
            size={24}
            color="black"
            style={styles.icon}
          />
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
        {item.notes && item.notes.trim() !== "" && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitleText}>Note:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* One photo */}
        {photos.length === 1 && (
          <TouchableOpacity
            onPress={() => handleMediaPress(photos[0], item.type)}
          >
            <RemoteImage
              path={photos[0]}
              style={styles.image}
              bucketName="feedPhotos"
            />
          </TouchableOpacity>
        )}

        {/* Several photos stacked in the same item: swipe sideways */}
        {photos.length > 1 && (
          <PhotoCarousel
            photos={photos}
            bucketName="feedPhotos"
            height={photoHeight()}
            onPress={(photo) => handleMediaPress(photo, item.type)}
          />
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
            No updates for your child yet!
          </Text>
        </View>
      );
    }
    return null;
  };

  // The phone to call: the primary contact of the family, or the first contact that has a phone
  const familyPhone = () => {
    const family = selectedKid?.student_family || [];
    const primary = family.find(
      (entry) => entry.is_primary && entry.contact?.phone,
    );
    return (
      (primary || family.find((entry) => entry.contact?.phone))?.contact
        ?.phone || null
    );
  };

  const handleCallPress = () => {
    const phoneNumber = familyPhone();
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
    const phoneNumber = familyPhone();
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

  const closeFullScreenModal = () => {
    setFullScreenImageModal(false);
  };

  const closeFullVideoModal = () => {
    setFullScreenVideoModal(false);
  };

  const handleMediaPress = (mediaName, mediaType) => {
    if (mediaType !== "VIDEO") {
      setSelectedMedia(mediaName);
      setFullScreenImageModal(true);
    } else if (mediaType === "VIDEO") {
      setSelectedMedia(mediaName);
      setFullScreenVideoModal(true);
    }
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
          contentContainerStyle={{ flexGrow: 1, gap: 2 }}
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
            navigation.navigate("Activities", {
              id: selectedKid.id,
              from: "feed",
            });
          }}
        >
          <AntDesign name="star" size={24} color="black" />
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
          <AntDesign name="info-circle" size={24} color="black" />
          <Text style={styles.actionButtonText}>Info</Text>
        </Pressable>
      </View>
      <FullScreenImage
        isVisible={fullScreenImageModal}
        path={selectedMedia}
        onClose={closeFullScreenModal}
        bucketName="feedPhotos"
      />

      <FullScreenVideo
        isVisible={fullScreenVideoModal}
        source={selectedMedia}
        onClose={closeFullVideoModal}
        bucketName="feedVideos"
      />

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
            {
              label: "School:",
              value: selectedKid.schools ? selectedKid.schools.name : "",
            },
            { label: "Teacher:", value: selectedKid.schoolTeacherName },
            { label: "Grade:", value: selectedKid.schoolGrade },
            { label: "Division:", value: selectedKid.schoolGradeDivision },
          ]}
        />
      )}
    </View>
  );
};

export default StudentFeedScreen;
