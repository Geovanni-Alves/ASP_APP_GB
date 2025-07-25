import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Bubble, GiftedChat, Send, Day } from "react-native-gifted-chat";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { Entypo } from "@expo/vector-icons";
import styles from "./styles";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useMessageContext } from "../../contexts/MessageContext";
import { useStaffContext } from "../../contexts/StaffContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { supabase } from "../../lib/supabase";

const ChatUserScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidID = route.params?.id;
  const { kids } = useKidsContext();
  const { staff } = useStaffContext();
  const { newMessages, unreadMessages } = useMessageContext();
  const [allMessages, setAllMessages] = useState([]);
  const { sendPushNotification } = usePushNotificationsContext();
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentKidData, setCurrentKidData] = useState(null);
  const [unreadOthersMessages, setUnreadOthersMessages] = useState([]);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { height } = Dimensions.get("window");
  //const [pagination, setPagination] = useState({ limit: 10, offset: 0 });
  const [pagination, setPagination] = useState({
    limit: calculatePaginationLimit(height),
    offset: 0,
  });

  const goBack = () => {
    navigation.goBack();
  };

  // Calculate pagination limit based on device height
  function calculatePaginationLimit(deviceHeight) {
    if (deviceHeight < 600) {
      return 6;
    } else if (deviceHeight < 800) {
      return 11;
    } else {
      return 16;
    }
  }

  // useEffect(() => {
  //   console.log("messages", messages);
  //   console.log("all messages", allMessages);
  //   console.log(pagination);
  // }, [messages, allMessages, pagination]);

  useEffect(() => {
    if (unreadMessages.length > 0 && messages.length > 0) {
      const updatedMessages = messages.map((message) => {
        const matchingUnreadMessage = unreadMessages.find(
          (unreadMessage) =>
            unreadMessage.id === message._id &&
            unreadMessage.receiverIds === message.user._id
        );
        if (matchingUnreadMessage) {
          // Update the received property of the message using the isRead property from unreadMessages
          return { ...message, received: matchingUnreadMessage.isRead };
        }
        return message;
      });
      // Update the state with the updated messages
      setMessages(updatedMessages);
    }
  }, [unreadMessages]);

  // Update Pagination State
  const handleLoadMore = async () => {
    if (hasMoreMessages && !loadingMore) {
      setLoadingMore(true);
      setPagination((prevPagination) => ({
        ...prevPagination,
        offset: prevPagination.offset + prevPagination.limit,
      }));
    }
  };

  useEffect(() => {
    // Set current kid
    // Check if kids array and kidID are defined

    if (kids && kidID) {
      const actualKid = kids.find((kid) => kid.id === kidID);

      // Check if actualKid is found
      if (actualKid) {
        setCurrentKidData(actualKid);
      }
    }
  }, [kids, kidID]);

  // fetch all messages (filter by user (kid or staff))
  const fetchMessagesByUser = async () => {
    if (!currentKidData) return;

    const id = currentKidData.id;
    const { data, error } = await supabase
      .from("message")
      .select("*")
      .or(`senderId.eq.${id},receiverIds.eq.${id}`)
      .order("sentAt", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw error;
    }
    //console.log("data", data);
    if (data.length < pagination.limit) {
      setHasMoreMessages(false);
    }

    const fetchedMessages = data;
    setAllMessages((prevMessages) => [...prevMessages, ...fetchedMessages]);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (currentKidData) {
      fetchMessagesByUser();
    }
  }, [currentKidData, pagination]);

  const getRemoteImageUri = async (path) => {
    try {
      if (!path) return null;

      const { data, error } = await supabase.storage
        .from("photos")
        .download(path);

      if (error) {
        console.error(error);
        return null;
      }

      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        return new Promise((resolve, reject) => {
          fr.onload = () => {
            resolve(fr.result);
          };
          fr.onerror = reject;
        });
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const formatMessages = async () => {
    try {
      const formattedMessages = await Promise.all(
        allMessages.map(async (message) => {
          const avatar =
            message.senderId === currentKidData?.id
              ? await getRemoteImageUri(currentKidData?.photo)
              : await getRemoteImageUri(
                  staff.find(
                    (staffMember) => staffMember.id === message.senderId
                  )?.photo
                );

          return {
            _id: message.id,
            text: message.content,
            createdAt: new Date(message.sentAt),
            user: {
              _id: message.senderId,
              avatar: avatar,
              name: staff.find(
                (staffMember) => staffMember.id === message.senderId
              )?.name,
            },
            received: message.isRead && message.senderId === kidID,
            sent: message.sentAt && message.senderId === kidID,
          };
        })
      );

      // Sort messages by createdAt timestamp in ascending order
      const sortedMessages = formattedMessages
        .sort((a, b) => a.createdAt - b.createdAt)
        .reverse();

      setMessages(sortedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  //fetch the initial messages when open the chat screen
  useEffect(() => {
    if (allMessages) {
      formatMessages();
    }
  }, [allMessages]);

  const formatNewMessages = async () => {
    const messagesForMe = newMessages.filter((message) => {
      return message.receiverIds.includes(kidID);
    });

    if (messagesForMe.length > 0) {
      const formattedNewMessages = await Promise.all(
        messagesForMe.map(async (message) => {
          const avatar =
            message.senderId === currentKidData?.id
              ? await getRemoteImageUri(currentKidData.photo)
              : await getRemoteImageUri(
                  staff.find(
                    (staffMember) => staffMember.id === message.senderId
                  )?.photo
                );
          return {
            _id: message.id,
            text: message.content,
            createdAt: new Date(message.sentAt),
            user: {
              _id: message.senderId,
              avatar: avatar,
              name: staff.find(
                (staffMember) => staffMember.id === message.senderId
              )?.name,
            },
            received: message.isRead && message.senderId === kidID,
            sent: message.sentAt && message.senderId === kidID,
          };
        })
      );

      // Filter out messages that already exist in the messages state to prevent duplicates
      const uniqueNewMessages = formattedNewMessages.filter((newMessage) => {
        return !messages.some(
          (existingMessage) => existingMessage._id === newMessage._id
        );
      });

      // Combine unique new messages with existing messages
      const combinedMessages = [...messages, ...uniqueNewMessages];
      // Sort combined messages by createdAt timestamp in descending order
      const sortedMessages = combinedMessages.sort(
        (a, b) => b.createdAt - a.createdAt
      );
      setMessages(sortedMessages);
      setUnreadOthersMessages(messagesForMe);
      setIsMarkedAsRead(false);
    }
  };
  //fetch new messages and format
  useEffect(() => {
    formatNewMessages();
  }, [newMessages]);

  //to mark as read msgs
  useEffect(() => {
    //update the unreadMessages when open the chat
    if (allMessages && currentKidData) {
      try {
        const unreadMessagesFromOthers = allMessages.filter(
          (message) =>
            message.receiverIds === currentKidData.id &&
            message.senderId !== currentKidData.id &&
            message.isRead === false
        );
        setUnreadOthersMessages(unreadMessagesFromOthers);
        setIsMarkedAsRead(false);
      } catch (error) {
        console.log("error updating the unread Message", error);
      }
    }
  }, [allMessages, currentKidData]);

  const updateMessagesAsRead = async (messageIds) => {
    try {
      if (messageIds && messageIds.length > 0) {
        const updatePromises = messageIds.map(async (id) => {
          const { error } = await supabase
            .from("message")
            .update({ isRead: true })
            .eq("id", id);

          if (error) {
            throw new Error(error.message);
          }
        });

        // Wait for all update promises to resolve
        try {
          await Promise.all(updatePromises);
          setUnreadOthersMessages([]); // Make sure you have this state set up in your component
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
    } catch (error) {
      console.error("error mark as read messages", error);
    }
  };

  useEffect(() => {
    // Call the function to start marking messages as read if there are unread messages
    if (unreadOthersMessages.length !== 0 && !isMarkedAsRead) {
      const messageIds = unreadOthersMessages
        .filter((message) => message.senderId !== kidID)
        .map((message) => message.id);
      updateMessagesAsRead(messageIds);
      setIsMarkedAsRead(true);
    }
  }, [unreadOthersMessages, isMarkedAsRead]);

  const sendNotificationToAllStaff = async (msg, currentKid, staffData) => {
    // Send notifications to parent in kid chat
    const name = currentKid.name;
    const msgHeader = `New message regarding ${name}`;
    const staffListTokens = staffData.map((staff) => {
      sendPushNotification(staff.pushToken, msgHeader, msg, {
        kidID: kidID,
      });
    });
  };

  // on send new message
  const onSend = useCallback(
    async (newMessages = [], currentKidData, staffData) => {
      const newMessage = newMessages[0];

      //await sendAndNotifyMsg(newMessage, currentKidData, staffData);

      await sendNotificationToAllStaff(
        newMessage.text,
        currentKidData,
        staffData
      );

      try {
        const currentTime = new Date();
        const year = currentTime.getFullYear();
        const month = String(currentTime.getMonth() + 1).padStart(2, "0");
        const day = String(currentTime.getDate()).padStart(2, "0");
        const hours = String(currentTime.getHours()).padStart(2, "0");
        const minutes = String(currentTime.getMinutes()).padStart(2, "0");
        const seconds = String(currentTime.getSeconds()).padStart(2, "0");

        const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const newMessageDetails = {
          senderId: kidID,
          receiverIds: kidID,
          content: newMessage.text,
          sentAt: formattedTime, //new Date().toISOString(),
          isRead: false,
        };
        const { data, error } = await supabase
          .from("message")
          .insert(newMessageDetails)
          .select();

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("Error creating message:", error);
      }
    },
    []
  );

  const renderSend = (props) => (
    <Send {...props}>
      <View>
        <MaterialCommunityIcons
          name="send-circle"
          style={{ marginBottom: 5, marginRight: 5 }}
          size={32}
          color="#FF7276"
        />
      </View>
    </Send>
  );

  const renderTicks = (message) => {
    return (
      (message.received || message.sent) && (
        <MaterialIcons
          name={message.received ? "done-all" : "done"}
          size={16}
          style={{ paddingRight: 5 }}
          color={message.received ? "#03ff39" : "#d1d1d1"}
        />
      )
    );
  };

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: "#FF7276",
          },
        }}
        textStyle={{
          right: {
            color: "#fff",
          },
        }}
        renderTicks={renderTicks}
      ></Bubble>
    );
  };

  const renderDay = (props) => {
    return <Day {...props} textStyle={{ color: "#2e64e5" }} />;
  };

  const renderLoading = () => {
    if (loadingMore) {
      return (
        <View style={{ marginVertical: 10 }}>
          <ActivityIndicator size="large" color="#2e64e5" />
        </View>
      );
    }
    return null;
  };

  // const renderLoading = () => (
  //   <View style={styles.loadingContainer}>
  //     <ActivityIndicator size="large" color="#6646ee" />
  //   </View>
  // );

  const scrollToBottomComponent = () => (
    <FontAwesome name="angle-double-down" size={22} color="#333" />
  );

  if (!currentKidData) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.containerMenu}>
          <TouchableOpacity style={styles.goBackIcon} onPress={() => goBack()}>
            <Entypo name="chevron-left" size={30} color="white" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.kidNameText}>{currentKidData?.name}</Text>
          </View>
        </View>
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <GiftedChat
          messages={messages}
          infiniteScroll={true}
          //inverted={false}
          onSend={(messages) => onSend(messages, currentKidData, staff)}
          renderUsernameOnMessage={true}
          user={{
            _id: kidID,
          }}
          renderBubble={(props) => renderBubble(props)}
          alwaysShowSend
          renderSend={renderSend}
          showUserAvatar
          showAvatarForEveryMessage
          renderChatEmpty={() => (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  transform: [{ scaleY: -1 }],
                }}
              >
                No messages yet
              </Text>
            </View>
          )}
          renderDay={renderDay}
          renderLoading={renderLoading}
          onLoadEarlier={handleLoadMore}
          loadEarlier={hasMoreMessages}
          isLoadingEarlier={loadingMore}
          scrollToBottom
          scrollToBottomComponent={scrollToBottomComponent}
        />
      </SafeAreaView>
    </View>
  );
};

export default ChatUserScreen;
