import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TouchableOpacity,
  Keyboard,
  TextInput,
  View,
  Text,
  ActivityIndicator,
} from "react-native";

import { GiftedChat, Send, Bubble } from "react-native-gifted-chat";
import { supabase } from "../../lib/supabase";
//import { API, graphqlOperation } from "aws-amplify";
//import { createMessage, updateMessage } from "../../graphql/mutations";
//import { listMessages } from "../../graphql/queries";
//import { useAuthContext } from "../../contexts/AuthContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useRoute } from "@react-navigation/native";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { useStaffContext } from "../../contexts/StaffContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useUsersContext } from "../../contexts/UsersContext";

const ChatUserScreen = () => {
  const route = useRoute();
  const student = route.params?.student;
  const kidID = student.id;
  const { newMessages, setNewMessages, unreadMessages, setUnreadMessages } =
    useMessageContext();
  const { currentUserData } = useUsersContext();
  const { staff } = useStaffContext();
  const { kids } = useKidsContext();
  const { sendPushNotification } = usePushNotificationsContext();
  const [messages, setMessages] = useState([]);
  const [allMessages, setAllMessages] = useState(null);
  const [currentKidData, setCurrentKidData] = useState(null);
  const [unreadOthersMessages, setUnreadOthersMessages] = useState([]);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set current kid
    // Check if kids array and kidID are defined
    if (kids && kidID) {
      try {
        setIsLoading(true);
        const actualKid = kids.find((kid) => kid.id === kidID);

        // Check if actualKid is found
        if (actualKid) {
          setCurrentKidData(actualKid);
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, [kids, kidID]);

  // fetch all messages (filter by student)
  useEffect(() => {
    // console.log(staff);
    const fetchMessagesByUser = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("message")
          .select("*")
          .eq("student_id", currentKidData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setAllMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentKidData) {
      fetchMessagesByUser();
    }
  }, [currentKidData]);

  useEffect(() => {
    if (unreadMessages.length === 0) return;

    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        const updated = unreadMessages.find(
          (unread) => unread.id === message._id
        );

        if (updated) {
          return {
            ...message,
            received: updated.isread,
          };
        }

        return message;
      })
    );
  }, [unreadMessages]);

  const formatMessages = async () => {
    try {
      const formattedMessages = allMessages.map((message) => {
        // Identify if the sender is the staff
        const foundStaff = staff.find((s) => s.id === message.sender_user_id);

        // Avatar and name — if is a staff, use it, if not use the kid
        const avatar = foundStaff?.uriStaff || currentKidData?.uriKid;
        const name = foundStaff?.name || currentKidData?.name;

        const isSentByCurrentUser =
          message.sender_user_id === currentUserData.id;

        return {
          _id: message.id,
          text: message.content,
          createdAt: new Date(message.created_at),
          user: {
            _id:
              message.sender_user_id || message.sender_contact_id || "unknown",
            name,
            avatar,
          },
          sent: isSentByCurrentUser,
          received: isSentByCurrentUser && message.isread,
        };
      });

      // sort the messages from new to old
      const sortedMessages = formattedMessages.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      setMessages(sortedMessages);
    } catch (error) {
      console.error("Error formatting messages:", error);
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
  // useEffect(() => {
  //   //console.log("trigger use Effect New Messages", newMessages);
  //   //if (newMessages.length > 0) {
  //   //console.log("newMessages", newMessages);

  //   const messagesForMe = newMessages.filter((message) => {
  //     return message.receiverIDs.includes(kidID);
  //   });

  //   if (messagesForMe.length > 0) {
  //     //console.log("new message for me", messagesForMe);
  //     const formattedNewMessages = messagesForMe.map((message) => ({
  //       _id: message.id,
  //       text: message.content,
  //       createdAt: new Date(message.sentAt),
  //       user: {
  //         _id: message.senderID,
  //         avatar:
  //           message.senderID === currentKidData?.id
  //             ? currentKidData?.uriKid
  //             : staff.find((staffMember) => staffMember.id === message.senderID)
  //                 ?.uriStaff,
  //         name: currentKidData?.name,
  //       },
  //       received: message.isRead && message.senderID === currentUserData.id,
  //       sent: message.sentAt && message.senderID === currentUserData.id,
  //     }));
  //     // Filter out messages that already exist in the messages state to prevent duplicates
  //     const uniqueNewMessages = formattedNewMessages.filter((newMessage) => {
  //       return !messages.some(
  //         (existingMessage) => existingMessage._id === newMessage._id
  //       );
  //     });

  //     // Combine unique new messages with existing messages
  //     const combinedMessages = [...messages, ...uniqueNewMessages];
  //     // Sort combined messages by createdAt timestamp in descending order
  //     const sortedMessages = combinedMessages.sort(
  //       (a, b) => b.createdAt - a.createdAt
  //     );
  //     //console.log("sorted Messages", sortedMessages);
  //     setMessages(sortedMessages);
  //     //setAllMessages(sortedMessages);
  //     setUnreadOthersMessages(messagesForMe);
  //     setIsMarkedAsRead(false);
  //     //setNewMessages([]);
  //   }
  //   // }
  // }, [newMessages]);

  //to mark as read msgs
  useEffect(() => {
    if (allMessages && currentKidData) {
      try {
        // Filtra mensagens não lidas enviadas pelo kid
        const unreadMessagesFromOthers = allMessages.filter(
          (message) =>
            message.sender_user_id === currentKidData.id &&
            message.isread === false
        );

        setUnreadOthersMessages(unreadMessagesFromOthers);
        setIsMarkedAsRead(false);
      } catch (error) {
        console.error("⚠️ Error updating unread messages:", error);
      }
    }
  }, [allMessages, currentKidData]);

  useEffect(() => {
    if (allMessages && currentKidData) {
      //update the unreadMessages when get a new message
      try {
        const unreadMessagesFromOthers = allMessages.filter(
          (message) =>
            message.senderID === currentKidData.id && message.isRead === false
        );
        setUnreadMessages(unreadMessagesFromOthers);
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
        .filter((message) => message.senderID === kidID)
        .map((message) => message.id);
      updateMessagesAsRead(messageIds);
      setIsMarkedAsRead(true);
    }
  }, [unreadOthersMessages, isMarkedAsRead]);

  const sendNotificationToParents = async (msg, currentKid) => {
    try {
      const { id: studentId, name } = currentKid;
      const msgHeader = `New message regarding ${name}`;

      // search for all linked contacts with the student
      const { data: familyLinks, error: familyError } = await supabase
        .from("student_family")
        .select("contact_id")
        .eq("student_id", studentId);

      if (familyError) throw familyError;
      if (!familyLinks || familyLinks.length === 0) {
        console.log("Any contact linked with the student.");
        return;
      }

      // search on contacts (to find the user_ids)
      const contactIds = familyLinks.map((f) => f.contact_id);

      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id, firstName, lastName, user_id")
        .in("id", contactIds);

      if (contactsError) throw contactsError;

      // search for tokens of users linked (logged on app)
      const userIds = contacts.map((c) => c.user_id).filter((u) => u !== null);

      if (userIds.length === 0) {
        console.log("Any contact with activated account.");
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, pushToken")
        .in("id", userIds);

      if (usersError) throw usersError;

      // send notification for each exists tokens
      for (const user of users) {
        if (user.pushToken) {
          await sendPushNotification(user.pushToken, msgHeader, msg, {
            kidID: studentId,
          });
          console.log(`Push notification sent to user: ${user.id}`);
        }
      }
    } catch (err) {
      console.error("Error when sending notifications:", err.message || err);
    }
  };

  // on send new message
  const onSend = useCallback(
    async (newMessages = [], currentKidData) => {
      setInputText("");
      try {
        const newMessage = newMessages[0];

        setMessages((prev) => GiftedChat.append(prev, [newMessage]));

        await sendNotificationToParents(newMessage.text, currentKidData);

        const { error } = await supabase.from("message").insert({
          student_id: kidID,
          sender_user_id: currentUserData.id,
          content: newMessage.text,
          isread: false,
        });

        if (error) throw error;
      } catch (error) {
        console.error("Error creating message:", error);
      }
    },
    [currentKidData, currentUserData, kidID]
  );

  const renderComposer = (props) => (
    <TextInput
      // key={inputText === "" ? "input-empty" : "input-filled"}
      value={inputText}
      onChangeText={setInputText}
      placeholder="Type a message..."
      placeholderTextColor="#888"
      multiline
      // autoCorrect={false}
      style={{ flex: 1, fontSize: 16, padding: 8 }}
      textContentType="none" // ⚠️ iOS fix
      autoComplete="off" // ⚠️ iOS fix
      importantForAutofill="no" // ⚠️ iOS fix
      maxLength={200} // ⚠️ iOS fix
    />
  );

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage = {
        _id: Math.random().toString(),
        text: inputText,
        createdAt: new Date(),
        user: { _id: currentUserData.id },
      };

      onSend([newMessage], currentKidData);
      Keyboard.dismiss(); // fecha o teclado (opcional)
      setTimeout(() => setInputText(""), 50); // força limpeza após atualização do GiftedChat
    }
  };

  // const renderSend = (props) => (
  //   <Send {...props}>
  //     <View>
  //       <MaterialCommunityIcons
  //         name="send-circle"
  //         style={{ marginBottom: 5, marginRight: 5 }}
  //         size={32}
  //         color="#FF7276"
  //       />
  //     </View>
  //   </Send>
  // );

  const renderSend = () => (
    <TouchableOpacity onPress={handleSend}>
      <MaterialCommunityIcons
        name="send-circle"
        style={{ marginBottom: 5, marginRight: 5 }}
        size={32}
        color={inputText.trim() ? "#FF7276" : "#ccc"}
      />
    </TouchableOpacity>
  );

  const renderTicks = (message) => {
    if (message.user._id !== currentUserData.id) return null;
    return (
      <MaterialIcons
        name={message.received ? "done-all" : "done"}
        size={16}
        style={{ paddingRight: 5 }}
        color={message.received ? "#03ff39" : "#d1d1d1"}
      />
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

  if (isLoading || !currentUserData || !currentKidData) {
    // console.log("currentUserData id:", currentUserData?.id);
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF7276" />
        <Text style={{ marginTop: 10, color: "#666" }}>
          Fetching messages...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ padding: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {currentKidData.name}
          </Text>
        </View>

        <GiftedChat
          messages={messages}
          text={inputText}
          onInputTextChanged={setInputText}
          onSend={(messages) => onSend(messages, currentKidData)}
          alwaysShowSend
          renderComposer={renderComposer}
          renderUsernameOnMessage
          user={{ _id: currentUserData.id }}
          renderBubble={renderBubble}
          renderSend={renderSend}
          showUserAvatar
          showAvatarForEveryMessage
          scrollToBottom
          scrollToBottomComponent={scrollToBottomComponent}
        />
      </View>
    </SafeAreaView>
  );
};

export default ChatUserScreen;
