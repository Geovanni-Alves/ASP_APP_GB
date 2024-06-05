import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  SafeAreaView,
} from "react-native";
import { Bubble, GiftedChat, Send } from "react-native-gifted-chat";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { Entypo } from "@expo/vector-icons";
import styles from "./styles";
import { useRoute, useNavigation } from "@react-navigation/native";
// import { API, graphqlOperation } from "aws-amplify";
// import { createMessage, updateMessage } from "../../graphql/mutations";
// import { listMessages } from "../../graphql/queries";
import { useMessageContext } from "../../contexts/MessageContext";
import { useStaffContext } from "../../contexts/StaffContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import { useKidsContext } from "../../contexts/KidsContext";

const ChatUserScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidID = route.params?.id;
  const { kids } = useKidsContext();
  const { staff } = useStaffContext();
  const { newMessages, unreadMessages, sendAndNotifyMsg } = useMessageContext();
  const [allMessages, setAllMessages] = useState(null);
  const { sendPushNotification } = usePushNotificationsContext();
  const [messages, setMessages] = useState([]);
  const [currentKidData, setCurrentKidData] = useState(null);
  const [unreadOthersMessages, setUnreadOthersMessages] = useState([]);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);

  const goBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    if (unreadMessages.length > 0 && messages.length > 0) {
      const updatedMessages = messages.map((message) => {
        const matchingUnreadMessage = unreadMessages.find(
          (unreadMessage) =>
            unreadMessage.id === message._id &&
            unreadMessage.receiverIDs === message.user._id
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
  useEffect(() => {
    const fetchMessagesByUser = async () => {
      const id = currentKidData.id;
      const variables = {
        //limit: 10,
        filter: {
          or: [{ senderID: { eq: id } }, { receiverIDs: { eq: id } }],
        },
      };

      const response = await API.graphql({
        query: listMessages,
        variables: variables,
      });

      const fetchedMessages = response.data.listMessages.items;
      setAllMessages(fetchedMessages);
      //setNewMessages([]);
    };
    if (currentKidData) {
      fetchMessagesByUser();
    }
  }, [currentKidData]);

  const formatMessages = async () => {
    try {
      const formattedMessages = allMessages.map((message) => ({
        _id: message.id,
        text: message.content,
        createdAt: new Date(message.sentAt),
        user: {
          _id: message.senderID,
          avatar:
            message.senderID === currentKidData?.id
              ? currentKidData?.uriKid
              : staff.find((staffMember) => staffMember.id === message.senderID)
                  ?.uriStaff,
          name: staff.find((staffMember) => staffMember.id === message.senderID)
            ?.name,
        },
        received: message.isRead && message.senderID === kidID,
        sent: message.sentAt && message.senderID === kidID,
      }));
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

  //fetch new messages and format
  useEffect(() => {
    const messagesForMe = newMessages.filter((message) => {
      return message.receiverIDs.includes(kidID);
    });

    if (messagesForMe.length > 0) {
      const formattedNewMessages = messagesForMe.map((message) => ({
        _id: message.id,
        text: message.content,
        createdAt: new Date(message.sentAt),
        user: {
          _id: message.senderID,
          avatar:
            message.senderID === currentKidData?.id
              ? currentKidData.uriKid
              : staff.find((staffMember) => staffMember.id === message.senderID)
                  ?.uriStaff,
          name: staff.find((staffMember) => staffMember.id === message.senderID)
            ?.name,
        },
        received: message.isRead && message.senderID === kidID,
        sent: message.sentAt && message.senderID === kidID,
      }));
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
  }, [newMessages]);

  //to mark as read msgs
  useEffect(() => {
    //update the unreadMessages when open the chat
    if (allMessages && currentKidData) {
      try {
        const unreadMessagesFromOthers = allMessages.filter(
          (message) =>
            message.receiverIDs === currentKidData.id &&
            message.senderID !== currentKidData.id &&
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
          await API.graphql(
            graphqlOperation(updateMessage, {
              input: {
                id: id,
                isRead: true,
              },
            })
          );
        });

        // Wait for all update promises to resolve
        try {
          await Promise.all(updatePromises);
          setUnreadOthersMessages([]);
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
        .filter((message) => message.senderID !== kidID)
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
        await API.graphql(
          graphqlOperation(createMessage, {
            input: {
              senderID: kidID,
              receiverIDs: kidID,
              content: newMessage.text,
              sentAt: new Date().toISOString(),
              isRead: false,
            },
          })
        );
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
          //loadEarlier
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
          // onLoadEarlier={handleLoadEarlier}
          // isLoadingEarlier={isLoadingEarlier}
          scrollToBottom
          scrollToBottomComponent={scrollToBottomComponent}
        />
      </SafeAreaView>
    </View>
  );
};

export default ChatUserScreen;
