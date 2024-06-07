import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import styles from "./styles";
import { useFeedContext } from "../../contexts/FeedContext";
import { usePicturesContext } from "../../contexts/PicturesContext";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";

const FeedScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidID = route.params?.id;
  const { kids } = useKidsContext();
  const { feeds } = useFeedContext();
  const { getPhotoInBucket } = usePicturesContext();
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedKidFeeds, setSelectedKidFeeds] = useState([]);

  const goBack = () => {
    navigation.goBack();
  };

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
      const selectedKidFeeds = feeds.filter((feed) => feed.userID === kidID);

      const updatedFeeds = [];
      for (const feed of selectedKidFeeds) {
        if (feed.photoName) {
          try {
            const uriPhoto = await getPhotoInBucket(feed.photoName);
            updatedFeeds.push({ ...feed, uriPhoto });
          } catch (error) {
            console.error("Error fetching photo for feed:", error);
            updatedFeeds.push(feed);
          }
        } else {
          updatedFeeds.push(feed);
        }
      }
      setSelectedKidFeeds(updatedFeeds);
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
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatDateTime(item.dateTime)}</Text>
        </View>
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
        {dateComponent}
        <View style={styles.itemContent}>
          {iconComponent && (
            <View style={styles.iconContainer}>{iconComponent}</View>
          )}
          <View>
            <Text style={styles.itemText}>{item.text}</Text>
            {/* {item.type === "ATTENDANCE" && <Text>By</Text>} */}
            {item.photoName && (
              <TouchableOpacity onPress={() => handleImagePress(item.uriPhoto)}>
                <Image source={{ uri: item.uriPhoto }} style={styles.image} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const handleImagePress = (imageUrl) => {
    // Handle image press
  };

  if (!selectedKid) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size={"large"}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.containerMenu}>
          <TouchableOpacity style={styles.goBackIcon} onPress={() => goBack()}>
            <Entypo name="chevron-left" size={30} color="white" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.kidNameText}>
              {selectedKid?.name}'s Updates
            </Text>
          </View>
        </View>
      </View>
      <SafeAreaView>
        <View>
          <View style={styles.kidDetailsContainer}>
            {/* <Image
              source={{ uri: selectedKid?.uriKid }}
              style={styles.KidImage}
            /> */}

            <RemoteImage
              path={selectedKid.photo}
              style={styles.KidImage}
              name={selectedKid.name}
            />

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() =>
                navigation.navigate("KidProfile", { id: selectedKid?.id })
              }
            >
              <Text style={styles.profileButtonText}>Profile</Text>
            </TouchableOpacity>
          </View>

          {selectedKidFeeds.length === 0 ? (
            <Text>No updates for your kid yet</Text>
          ) : (
            <FlatList
              data={selectedKidFeeds.reverse()}
              renderItem={renderFeedItem}
              keyExtractor={(item) => item.id.toString()}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default FeedScreen;
