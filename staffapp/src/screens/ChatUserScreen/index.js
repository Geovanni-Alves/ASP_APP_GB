import React, { useState, useEffect, useCallback } from "react";
import { View, Text, SafeAreaView, ActivityIndicator } from "react-native";
import { GiftedChat, Send, Bubble } from "react-native-gifted-chat";
import { API, graphqlOperation } from "aws-amplify";
import { createMessage, updateMessage } from "../../graphql/mutations";
import { listMessages } from "../../graphql/queries";
import { useAuthContext } from "../../contexts/AuthContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useRoute } from "@react-navigation/native";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { useStaffContext } from "../../contexts/StaffContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const ChatUserScreen = ({ navigation }) => {
  const route = useRoute();
  const kidID = route.params?.id;
  const { newMessages, setNewMessages, unreadMessages, setUnreadMessages } =
    useMessageContext();
  const { currentUserData } = useAuthContext();
  const { staff } = useStaffContext();
  const { kids } = useKidsContext();
  const { sendPushNotification } = usePushNotificationsContext();
  const [messages, setMessages] = useState([]);
  const [allMessages, setAllMessages] = useState(null);
  const [currentKidData, setCurrentKidData] = useState(null);
  const [unreadOthersMessages, setUnreadOthersMessages] = useState([]);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);

  useEffect(() => {
    if (unreadMessages.length > 0 && messages.length > 0) {
      const updatedMessages = messages.map((message) => {
        const matchingUnreadMessage = unreadMessages.find(
          (unreadMessage) =>
            unreadMessage.id === message._id &&
            unreadMessage.receiverIDs !== message.user._id
        );
        //console.log("matchingUnreadMessage", matchingUnreadMessage);
        if (matchingUnreadMessage) {
          // console.log("Message found in unread messages!");
          // Update the received property of the message using the isRead property from unreadMessages
          return { ...message, received: matchingUnreadMessage.isRead };
        }
        return message;
      });
      //console.log("updatedMessages", updatedMessages);
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

      // if (nextToken) {
      //   variables.nextToken = nextToken;
      // }

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
          name: currentKidData?.name,
        },
        received: message.isRead && message.senderID === currentUserData.id,
        sent: message.sentAt && message.senderID === currentUserData.id,
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

  // get the messages from messageContext and format to giftedchat
  // useEffect(() => {
  //   if (allMessages && currentKidData && staff) {
  //     const allMessagesFromStaffAndKid = allMessages?.filter(
  //       (message) =>
  //         message.senderID === currentKidData.id ||
  //         message.receiverIDs === currentKidData.id
  //     );

  //     // Format messages for GiftedChat
  //     const formattedMessages = allMessagesFromStaffAndKid.map((message) => ({
  //       _id: message.id,
  //       text: message.content,
  //       createdAt: new Date(message.sentAt),
  //       user: {
  //         _id: message.senderID,
  //         avatar:
  //           message.senderID === currentKidData.id
  //             ? currentKidData.uriKid
  //             : staff.find((staffMember) => staffMember.id === message.senderID)
  //                 ?.uriStaff,
  //         name: currentKidData.name,
  //       },
  //       received: message.isRead && message.senderID === currentUserData.id, //message.senderID === kidID, //message.isRead, //readMessages.includes(message.id),
  //       sent: message.sentAt && message.senderID === currentUserData.id,
  //     }));

  //     // Sort messages by createdAt timestamp in ascending order
  //     const sortedMessages = formattedMessages
  //       .sort((a, b) => a.createdAt - b.createdAt)
  //       .reverse();

  //     setMessages(sortedMessages); // set of messages formatted to Gifted Chat
  //     setIsLoadingEarlier(false);
  //   }
  // }, [allMessages, currentKidData]);

  // const handleLoadEarlier = () => {
  //   setIsLoadingEarlier(true); // Set isLoadingEarlier to true when loading earlier messages
  //   loadMoreMessages(); // Call loadMoreMessages function from MessageContext
  // };

  //fetch new messages and format
  useEffect(() => {
    //console.log("trigger use Effect New Messages", newMessages);
    //if (newMessages.length > 0) {
    //console.log("newMessages", newMessages);

    const messagesForMe = newMessages.filter((message) => {
      return message.receiverIDs.includes(kidID);
    });

    if (messagesForMe.length > 0) {
      //console.log("new message for me", messagesForMe);
      const formattedNewMessages = messagesForMe.map((message) => ({
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
          name: currentKidData?.name,
        },
        received: message.isRead && message.senderID === currentUserData.id,
        sent: message.sentAt && message.senderID === currentUserData.id,
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
      //console.log("sorted Messages", sortedMessages);
      setMessages(sortedMessages);
      //setAllMessages(sortedMessages);
      setUnreadOthersMessages(messagesForMe);
      setIsMarkedAsRead(false);
      //setNewMessages([]);
    }
    // }
  }, [newMessages]);

  //to mark as read msgs
  useEffect(() => {
    //update the unreadMessages when open the chat
    if (allMessages && currentKidData) {
      //console.log("allMessages", allMessages);
      try {
        const unreadMessagesFromOthers = allMessages.filter(
          (message) =>
            //message.receiverIDs !== currentKidData.id &&
            message.senderID === currentKidData.id && message.isRead === false
        );
        //console.log("unreadMessagesFromOthers", unreadMessagesFromOthers);
        setUnreadOthersMessages(unreadMessagesFromOthers);
        setIsMarkedAsRead(false);
      } catch (error) {
        console.log("error updating the unread Message", error);
      }
    }
  }, [allMessages, currentKidData]);

  // useEffect(() => {
  //   if (allMessages && currentKidData) {
  //     //update the unreadMessages when get a new message
  //     try {
  //       const unreadMessagesFromOthers = allMessages.filter(
  //         (message) =>
  //           message.senderID === currentKidData.id && message.isRead === false
  //       );
  //       setUnreadMessages(unreadMessagesFromOthers);
  //       setIsMarkedAsRead(false);
  //     } catch (error) {
  //       console.log("error updating the unread Message", error);
  //     }
  //   }
  // }, [allMessages, currentKidData]);

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
        .filter((message) => message.senderID === kidID)
        .map((message) => message.id);
      updateMessagesAsRead(messageIds);
      setIsMarkedAsRead(true);
    }
  }, [unreadOthersMessages, isMarkedAsRead]);

  const sendNotificationToParents = async (msg, currentKid) => {
    const { name, Parent1, Parent2 } = currentKid;

    const msgHeader = `New message regarding ${name}`;

    if (Parent1 !== null) {
      const tokenParent1 = currentKid.Parent1.pushToken;

      // Send notifications to parent in kid chat
      await sendPushNotification(tokenParent1, msgHeader, msg, {
        kidID: kidID,
      });
    }

    if (Parent2 !== null) {
      const tokenParent2 = currentKid.Parent2.pushToken;

      // Send notifications to parent in kid chat
      await sendPushNotification(tokenParent2, msgHeader, msg, {
        kidID: kidID,
      });
    }
  };

  // on send new message
  const onSend = useCallback(async (newMessages = [], currentKidData) => {
    try {
      const newMessage = newMessages[0];
      await sendNotificationToParents(newMessage.text, currentKidData);

      await API.graphql(
        graphqlOperation(createMessage, {
          input: {
            senderID: currentUserData.id,
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
  }, []);

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
    <SafeAreaView style={{ flex: 1 }}>
      <View>
        <Text>{currentKidData.name}</Text>
      </View>
      <GiftedChat
        messages={messages}
        renderUsernameOnMessage={true}
        onSend={(messages) => onSend(messages, currentKidData)}
        alwaysShowSend
        user={{
          _id: currentUserData.id,
        }}
        renderBubble={(props) => renderBubble(props)}
        renderSend={renderSend}
        showUserAvatar
        showAvatarForEveryMessage
        scrollToBottom
        scrollToBottomComponent={scrollToBottomComponent}
      />
    </SafeAreaView>
  );
};

export default ChatUserScreen;
