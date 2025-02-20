import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Linking,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { API, graphqlOperation } from "aws-amplify";
import { listEvents } from "../../graphql/queries";
import { createMessage } from "../../graphql/mutations";
import Swiper from "react-native-swiper";
import Swipeable from "react-native-gesture-handler/Swipeable";
import styles from "./styles";
import { format } from "date-fns";
import { AntDesign } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import InfoModal from "../../components/InfoModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import TextConfirmationModal from "../../components/TextConfirmationModal";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePicturesContext } from "../../contexts/PicturesContext";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { currentUserData } = useAuthContext();
  const { unreadMessages } = useMessageContext();
  const { getPhotoInBucket } = usePicturesContext();
  const { kids, kidCurrentStateData, ChangeKidState } = useKidsContext();
  //
  const [events, setEvents] = useState(null);
  // const [currentTime, setCurrentTime] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState({});
  const swiperRef = useRef(null);
  const swipeableRefs = useRef([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [selectedKidCheckIn, setSelectedKidCheckIn] = useState(null);
  const [selectedKidAbsent, setSelectedKidAbsent] = useState(null);
  const [kidAbsent, setKidAbsent] = useState({
    kid: null,
    isAbsent: null,
  });
  const [isConfirmationAbsentModalVisible, setConfirmationAbsentModalVisible] =
    useState(false);
  const [
    isConfirmationUndoAbsentModalVisible,
    setConfirmationUndoAbsentModalVisible,
  ] = useState(false);
  const [showTextConfirmationModal, setShowTextConfirmationModal] =
    useState(false);

  // const [showConfirmationAbsentModal, setShowConfirmationAbsentModal] =
  //   useState(false);

  // useEffect to fetch the events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await API.graphql(
          graphqlOperation(listEvents, {
            limit: 10,
          })
        );
        const eventsList = response.data.listEvents.items;

        const eventsWithPhotos = await Promise.all(
          eventsList.map(async (event) => {
            if (event.image) {
              const uriEventImage = await getPhotoInBucket(event.image);
              return { ...event, uriEventImage };
            } else {
              return event;
            }
          })
        );
        setEvents(eventsWithPhotos);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    if (!events) {
      fetchEvents();
    }
  }, [events]);

  // Function (useEffect) to calculate unread count for each kid
  useEffect(() => {
    const calculateUnreadCounts = () => {
      const counts = {};

      // Iterate over each kid
      kids.forEach((kid) => {
        // Filter unread messages for the current kid
        const unreadForKid = unreadMessages?.filter(
          (message) =>
            !message.isRead &&
            message.receiverIDs.includes(kid.id) &&
            message.senderID !== kid.id
        );

        // Store the count of unread messages for the current kid
        counts[kid.id] = unreadForKid?.length;
      });

      // Update state with the counts
      setUnreadCounts(counts);
    };

    // Call the function to calculate unread counts
    calculateUnreadCounts();
  }, [unreadMessages, kids]);

  const handleEventPress = (link) => {
    if (link) {
      const urlWithoutParams = link.split("?")[0];

      Linking.openURL(urlWithoutParams)
        .then((result) => {
          //console.log("Link opened successfully:", result);
        })
        .catch((error) => {
          console.error("Error opening link:", error);
        });
    }
  };

  // Function to mark kid as absent or undo absence
  const toggleAbsent = async (kid, isAbsent) => {
    currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    console.log(currentHour, currentMinutes);
    if (currentHour > 12 || (currentHour === 12 && currentMinutes >= 59)) {
      console.log(
        "Hi dear parent, the today's route is already closed, unfortunately we couldn't remove the absent for today!"
      );
      return;
    }

    setKidAbsent({ kid, isAbsent });
    //console.log("kidAbsent", kidAbsent);
    if (isAbsent) {
      //console.log(kidAbsent);
      setShowTextConfirmationModal(true);
      //setConfirmationAbsentModalVisible(true);
    } else {
      setConfirmationUndoAbsentModalVisible(true);
    }
  };

  const confirmAbsent = async () => {
    setConfirmationAbsentModalVisible(false);
    setShowTextConfirmationModal(true);
  };

  const markAbsent = async () => {
    try {
      setShowTextConfirmationModal(false);
      //setShowConfirmationAbsentModal(true);
      const { kid, isAbsent } = kidAbsent;
      const currentDateAndTime = new Date();

      await ChangeKidState(
        kid.id,
        isAbsent ? "ABSENT" : "REMOVE",
        currentUserData.id,
        currentDateAndTime
      );
    } catch (error) {
      console.error("Error change absent status:", error);
    } finally {
    }
  };

  const cancelAbsent = () => {
    setShowAbsentModal(false);
    setConfirmationAbsentModalVisible(false);
  };

  const confirmUndo = async () => {
    try {
      setConfirmationUndoAbsentModalVisible(false);
      const { kid, isAbsent } = kidAbsent;
      // console.log("kid ID", kid.id);
      // console.log("kid currentState ID", kid.currentStateId);
      const currentDateAndTime = new Date();

      await ChangeKidState(
        kid.id,
        isAbsent ? "ABSENT" : "REMOVE",
        currentUserData.id,
        currentDateAndTime,
        kid.currentStateId
      );
    } catch (error) {
      console.error("Error removing absent status", error);
    } finally {
    }
  };

  const cancelUndo = async () => {
    setShowAbsentModal(false);
    setConfirmationUndoAbsentModalVisible(false);
  };

  const handleIndexChanged = (index) => {
    setCurrentIndex(index);
  };

  const handleMsgPress = (kid) => {
    const idUserChat = kid.id;
    navigation.navigate("ChatUser", { id: idUserChat });
  };

  useEffect(() => {
    if (showCheckInModal && selectedKidCheckIn) {
      setShowCheckInModal(true);
    }
  }, [showCheckInModal, selectedKidCheckIn]);

  const handleCheckInPress = async (kid) => {
    const checkInSelectedKid = kidCurrentStateData?.filter(
      (checkIn) => checkIn.kidId === kid.id
    );
    setSelectedKidCheckIn(checkInSelectedKid[checkInSelectedKid.length - 1]);
    setShowCheckInModal(true);
  };

  const handleAbsentPress = async (kid) => {
    const absentSelectedKid = kidCurrentStateData?.filter(
      (absent) => absent.kidId === kid.id
    );
    setSelectedKidAbsent(absentSelectedKid[absentSelectedKid.length - 1]);
    setShowAbsentModal(true);
  };

  const handleKidPress = (kid) => {
    navigation.navigate("Feed", { id: kid.id });
  };

  const renderEvent = (item) => {
    return (
      <Pressable key={item.id} onPress={() => handleEventPress(item.link)}>
        <View style={styles.eventContainer}>
          <Image
            source={{ uri: item.uriEventImage }}
            style={styles.eventImage}
          />
          <View style={styles.eventDetails}>
            <Text style={styles.eventName}>{item.name}</Text>
            <Text style={styles.eventDate}>{item.date}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const handleSendMessage = async (message) => {
    // console.log("Sending message:", message);
    // console.log(kidAbsent);
    const kidID = kidAbsent.kid.id;
    const newMessage = message;
    try {
      await API.graphql(
        graphqlOperation(createMessage, {
          input: {
            senderID: kidID,
            receiverIDs: kidID,
            content: newMessage,
            sentAt: new Date().toISOString(),
            isRead: false,
          },
        })
      );
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  const renderRight = (kid, index, progress, dragX) => {
    //const nameKid = kid.name;

    return (
      <View style={styles.rightActionContainer}>
        {kid.CurrentState?.state !== "ABSENT" &&
          kid.CurrentState?.state !== "CHECK_IN" && (
            <Pressable
              onPress={() => {
                // setKidAbsent({ kid, isAbsent: true });
                swipeableRefs.current[index].close();
                toggleAbsent(kid, true);
              }}
              style={styles.absentButton}
            >
              <Animated.Text style={styles.absentButtonText}>
                Absent
              </Animated.Text>
            </Pressable>
          )}
        {kid.CurrentState?.state === "ABSENT" && (
          <Pressable
            onPress={() => {
              swipeableRefs.current[index].close();
              toggleAbsent(kid, false);
            }}
            style={styles.undoButton}
          >
            <Text style={styles.undoButtonText}>Undo Absent</Text>
          </Pressable>
        )}
        {/* <ConfirmationModal
          isVisible={isConfirmationAbsentModalVisible}
          onConfirm={confirmAbsent}
          onCancel={cancelAbsent}
          questionText={"Confirm mark as absent for today?"}
        /> */}
        <ConfirmationModal
          isVisible={isConfirmationUndoAbsentModalVisible}
          onConfirm={confirmUndo}
          onCancel={cancelUndo}
          questionText={"Remove absent for today?"}
        />
      </View>
    );
  };

  // // Function to get current time and update state
  // const getCurrentTime = () => {
  //   const now = new Date();
  //   const formattedTime = format(now, "h:mm:ss a");
  //   setCurrentTime(formattedTime);
  // };

  // // Update current time every second
  // useEffect(() => {
  //   const interval = setInterval(getCurrentTime, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  const today = new Date();
  const formattedDate = format(today, "EEEE, MMMM d");

  const getInitials = (name) => {
    const nameArray = name.split(" ");
    return nameArray
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  if (!events || !kidCurrentStateData) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }

  return (
    <ScrollView style={styles.welcomeContainer}>
      {showTextConfirmationModal && (
        <TextConfirmationModal
          isVisible={true}
          questionText={
            "If you want, you can leave us a message, about the reason of absence"
          }
          showCancelButton={true}
          onConfirm={markAbsent} // Pass markAbsent function as the onConfirm handler
          onCancel={() => setShowTextConfirmationModal(false)}
          standardText={`${kidAbsent?.kid?.name}, is Absent today`}
          sendMessage={true}
          onConfirmSuccess={handleSendMessage}
        />
      )}
      <View style={styles.dateTimeContainer}>
        <Text style={styles.date}>{formattedDate}</Text>
        {/* <Text style={styles.currentTime}>{currentTime}</Text> */}
      </View>
      <Text style={styles.welcomeText}>Welcome, {currentUserData.name} </Text>
      <View style={styles.kidsContainer}>
        <Text style={styles.sectionTitle}>Your Kids</Text>
        {kids.map((kid, index) => (
          <Swipeable
            ref={(ref) => (swipeableRefs.current[index] = ref)}
            key={kid.id}
            renderRightActions={() => renderRight(kid, index)}
            onSwipeableWillOpen={() => {
              if (
                kid.CurrentState?.state === "CHECK_IN" ||
                kid.CurrentState?.state === "CHECK_OUT"
              ) {
                swipeableRefs.current[index].close();
                handleCheckInPress(kid);
              }
            }}
          >
            <Pressable onPress={() => handleKidPress(kid)}>
              <View style={styles.kidItem}>
                <View style={styles.kidImageContainer}>
                  {kid.uriKid ? (
                    <Image
                      source={{ uri: kid.uriKid }}
                      style={styles.kidImage}
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Text style={styles.placeholderText}>
                        {getInitials(kid.name)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.kidName}>{kid.name}</Text>
                  <Entypo name="dot-single" size={20} color="black" />
                  <View style={styles.iconsContainer}>
                    {kid.CurrentState?.state === "CHECK_IN" && (
                      <Pressable
                        style={{ padding: 8 }}
                        onPress={() => handleCheckInPress(kid)}
                      >
                        <AntDesign name="checksquare" size={35} color="green" />
                      </Pressable>
                    )}
                    {kid.CurrentState?.state === "ABSENT" && (
                      <Pressable
                        style={{ padding: 8 }}
                        onPress={() => handleAbsentPress(kid)}
                      >
                        <AntDesign name="closecircle" size={35} color="red" />
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.messageIcon}
                      onPress={() => handleMsgPress(kid)}
                    >
                      <AntDesign name="message1" size={35} color="gray" />
                      <View style={styles.unreadCountContainer}>
                        {unreadCounts[kid.id] > 0 && (
                          <Text style={styles.unreadCountText}>
                            {unreadCounts[kid.id]}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    <View style={{ justifyContent: "center", paddingLeft: 16 }}>
                      <Entypo name="chevron-right" size={35} color="grey" />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </Swipeable>
        ))}
      </View>
      <View style={styles.swiper}>
        <Text style={styles.eventHeader}>Upcoming Events</Text>
        <Swiper
          ref={swiperRef}
          autoplay={true}
          autoplayTimeout={10}
          loop={true}
          index={currentIndex}
          onIndexChanged={handleIndexChanged}
          height={"100%"}
          showsPagination={false}
        >
          {events.map(renderEvent)}
        </Swiper>
      </View>
      {showCheckInModal && (
        <InfoModal
          isVisible={true}
          onClose={() => setShowCheckInModal(false)}
          infoItems={[
            { label: "Checked By", value: selectedKidCheckIn.userName },
            { label: "Date", value: selectedKidCheckIn.stateDate },
            { label: "Time", value: selectedKidCheckIn.stateTime },
          ]}
        />
      )}
      {showAbsentModal && (
        <InfoModal
          isVisible={true}
          onClose={() => setShowAbsentModal(false)}
          infoItems={[
            { label: "Mark as Absent By", value: selectedKidAbsent.userName },
            { label: "Date", value: selectedKidAbsent.stateDate },
            { label: "Time", value: selectedKidAbsent.stateTime },
          ]}
        />
      )}
    </ScrollView>
  );
};

export default HomeScreen;
