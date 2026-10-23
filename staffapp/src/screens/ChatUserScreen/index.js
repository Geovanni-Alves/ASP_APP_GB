// src/screens/ChatUserScreen/index.js
// The chat uses @kesha-antonov/react-native-chat: the maintained fork of the old gifted chat library
// (the same props and the same message format; the component is called "Chat").
import React, {
  useState,
  useCallback,
  useRef,
  useContext,
  useMemo,
  useLayoutEffect,
} from "react";
// import { SafeAreaView } from "react-native-safe-area-context";
import {
  TouchableOpacity,
  Keyboard,
  TextInput,
  View,
  Text,
  ActivityIndicator,
  Alert,
  AppState,
} from "react-native";

import { Chat, Bubble } from "@kesha-antonov/react-native-chat";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { HeaderHeightContext } from "@react-navigation/elements";
import RemoteImage from "../../components/RemoteImage";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { useUsersContext } from "../../contexts/UsersContext";

// While the chat is open it looks for new messages by itself (there is no live connection)
const REFRESH_MS = 8000;

// Fixed objects (not created again on every render): each row of the chat skips re-rendering when
// nothing it receives has changed
const BUBBLE_WRAPPER_STYLE = { right: { backgroundColor: "#FF7276" } };
const BUBBLE_TEXT_STYLE = { right: { color: "#fff" } };
const AVATAR_STYLE = { width: 36, height: 36, borderRadius: 18 };

const ChatUserScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const student = route.params?.student;
  const kidID = student?.id;
  const headerHeight = useContext(HeaderHeightContext) || 0;
  const keyboardAvoidingViewProps = useMemo(
    () =>
      headerHeight > 0 ? { keyboardVerticalOffset: headerHeight } : undefined,
    [headerHeight],
  );

  const { getMessagesByStudent, sendAndNotifyMsg, markThreadAsRead } =
    useMessageContext();
  const { currentUserData } = useUsersContext();
  const { kids } = useKidsContext();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const sending = useRef(false);

  // The kid of this conversation (the list of the app has the latest; the one that was tapped is the fallback)
  const currentKidData =
    (kids || []).find((kid) => kid.id === kidID) || student;

  // The name of the kid is the title of the header. That way the chat starts exactly where the header
  // ends, which is what the keyboard needs to know to lift the input.
  useLayoutEffect(() => {
    if (currentKidData?.name) {
      navigation.setOptions({ title: currentKidData.name });
    }
  }, [navigation, currentKidData?.name]);
  // The API answers with the newest message first, and each message says who wrote it:
  //   sender: { name, photo, isTeam }  (isTeam = somebody of the team, otherwise it is the family)
  const formatMessage = useCallback(
    (message) => {
      const mine = message.sender_user_id === currentUserData?.id;
      const fromTeam = !!message.sender?.isTeam;

      return {
        _id: message.id,
        text: message.content,
        // A number, not a Date: the chat runs on the animation engine, which cannot copy a Date
        createdAt: new Date(message.created_at).getTime(),
        user: {
          _id: mine
            ? currentUserData.id
            : message.sender_user_id || message.sender_contact_id || "family",
          // A message from the family without a name shows as the family of the kid
          name:
            message.sender?.name ||
            (fromTeam
              ? "Staff"
              : `Family of ${currentKidData?.name || "the kid"}`),
          // The picture: the one of the sender, or the kid when the family has none
          photoPath:
            message.sender?.photo || (fromTeam ? null : currentKidData?.photo),
        },
        sent: mine,
        // The family read it (the ticks turn green)
        received: mine && !!message.isread,
      };
    },
    [currentUserData?.id, currentKidData?.name, currentKidData?.photo],
  );

  // Reads the conversation from the API. Every message the family wrote is marked as read, because the
  // team is looking at it now.
  const loadMessages = useCallback(async () => {
    if (!kidID || !currentUserData) return;

    const data = await getMessagesByStudent(kidID);
    setMessages(data.map(formatMessage));
    setIsLoading(false);

    const unreadFromFamily = data.some(
      (message) => !message.sender?.isTeam && !message.isread,
    );
    if (unreadFromFamily) markThreadAsRead(kidID);
  }, [
    kidID,
    currentUserData,
    getMessagesByStudent,
    formatMessage,
    markThreadAsRead,
  ]);

  // Opens, then looks again every few seconds while the screen is in front (and when the app comes back)
  useFocusEffect(
    useCallback(() => {
      loadMessages();

      const timer = setInterval(() => {
        if (!sending.current) loadMessages();
      }, REFRESH_MS);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") loadMessages();
      });

      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [loadMessages]),
  );

  // on send new message
  const onSend = useCallback(
    async (newMessages = []) => {
      const newMessage = newMessages[0];
      if (!newMessage?.text?.trim() || !currentUserData) return;

      setInputText("");
      sending.current = true;

      // It shows at once (the ticks stay grey until the family reads it)
      setMessages((previous) =>
        Chat.append(previous, [
          {
            ...newMessage,
            createdAt: Date.now(),
            user: {
              _id: currentUserData.id,
              name: currentUserData.name,
              photoPath: currentUserData.photo,
            },
            sent: true,
            received: false,
          },
        ]),
      );

      try {
        // The API saves it and tells the parents with a push
        const saved = await sendAndNotifyMsg(
          kidID,
          null,
          newMessage.text.trim(),
        );
        if (!saved) throw new Error("The message was not saved");
      } catch (error) {
        Alert.alert(
          "Message not sent",
          "Please check the connection and try again.",
        );
      } finally {
        sending.current = false;
        loadMessages(); // what the server really has (a message that failed disappears)
      }
    },
    [currentUserData, kidID, sendAndNotifyMsg, loadMessages],
  );

  const renderComposer = () => (
    <TextInput
      value={inputText}
      onChangeText={setInputText}
      placeholder="Type a message..."
      placeholderTextColor="#888"
      multiline
      style={{ flex: 1, fontSize: 16, padding: 8 }}
      textContentType="none" // iOS fix
      autoComplete="off" // iOS fix
      importantForAutofill="no" // iOS fix
      maxLength={200}
    />
  );

  const handleSend = () => {
    if (!inputText.trim()) return;

    onSend([
      {
        _id: Math.random().toString(),
        text: inputText,
        createdAt: Date.now(),
        user: { _id: currentUserData.id },
      },
    ]);
    Keyboard.dismiss();
    setTimeout(() => setInputText(""), 50); // clears it after the chat updates
  };

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

  const myId = currentUserData?.id;
  const renderTicks = useCallback(
    (message) => {
      if (message.user._id !== myId) return null;
      return (
        <MaterialIcons
          name={message.received ? "done-all" : "done"}
          size={16}
          style={{ paddingRight: 5 }}
          color={message.received ? "#03ff39" : "#d1d1d1"}
        />
      );
    },
    [myId],
  );

  const renderBubble = useCallback(
    (props) => (
      <Bubble
        {...props}
        wrapperStyle={BUBBLE_WRAPPER_STYLE}
        textStyle={BUBBLE_TEXT_STYLE}
      />
    ),
    [],
  );

  // The picture of who wrote it (the files need the login, so it is the same component as everywhere)
  const renderAvatar = useCallback((props) => {
    const sender = props.currentMessage?.user;
    return (
      <RemoteImage
        path={sender?.photoPath}
        name={sender?.name}
        bucketName="profilePhotos"
        style={AVATAR_STYLE}
      />
    );
  }, []);

  const scrollToBottomComponent = useCallback(
    () => <FontAwesome name="angle-double-down" size={22} color="#333" />,
    [],
  );

  if (isLoading || !currentUserData || !currentKidData) {
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
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Chat
        messages={messages}
        user={{ _id: currentUserData.id }}
        onSend={(newMessages) => onSend(newMessages)}
        isSendButtonAlwaysVisible
        renderComposer={renderComposer}
        renderSend={renderSend}
        isUsernameVisible
        renderBubble={renderBubble}
        renderTicks={renderTicks}
        renderAvatar={renderAvatar}
        isUserAvatarVisible
        isAvatarVisibleForEveryMessage
        isScrollToBottomEnabled
        scrollToBottomComponent={scrollToBottomComponent}
        keyboardAvoidingViewProps={keyboardAvoidingViewProps}
      />
    </View>
  );
};

export default ChatUserScreen;
