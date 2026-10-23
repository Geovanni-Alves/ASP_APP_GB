// src/screens/ChatScreen/index.js
// The conversation of the family with the team about one child. It uses the same chat package as the staff app.
import React, {
  useState,
  useCallback,
  useRef,
  useContext,
  useMemo,
  useLayoutEffect,
} from "react";
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
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { HeaderHeightContext } from "@react-navigation/elements";
import RemoteImage from "../../components/RemoteImage";
import api from "../../lib/api";
import { useAuthContext } from "../../contexts/AuthState";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessagesContext } from "../../contexts/MessagesContext";
import { onFamilyPush } from "../../lib/pushEvents";

// While the chat is open it looks for new messages by itself (there is no live connection)
const REFRESH_MS = 8000;

// Fixed objects (not created again on every render): each row of the chat skips re-rendering when nothing it
// receives has changed
const BUBBLE_WRAPPER_STYLE = { right: { backgroundColor: "#5337E0" } };
const BUBBLE_TEXT_STYLE = { right: { color: "#fff" } };
const AVATAR_STYLE = { width: 36, height: 36, borderRadius: 18 };

const ChatScreen = ({ route, navigation }) => {
  const { kidId } = route.params;
  const headerHeight = useContext(HeaderHeightContext) || 0;
  const keyboardAvoidingViewProps = useMemo(
    () => (headerHeight > 0 ? { keyboardVerticalOffset: headerHeight } : undefined),
    [headerHeight],
  );

  const { session } = useAuthContext();
  const me = session?.user;
  const { kids } = useKidsContext();
  const { reloadUnread } = useMessagesContext();
  const kid = kids.find((item) => item.id === kidId);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const sending = useRef(false);

  useLayoutEffect(() => {
    if (kid?.name) navigation.setOptions({ title: kid.name });
  }, [navigation, kid?.name]);

  // The API answers with the newest message first; each one says who wrote it:
  //   sender: { name, photo, isTeam }
  const formatMessage = useCallback(
    (message) => {
      const mine = message.sender_user_id === me?.id;
      return {
        _id: message.id,
        text: message.content,
        // A number, not a Date: the chat runs on the animation engine, which cannot copy a Date
        createdAt: new Date(message.created_at).getTime(),
        user: {
          _id: mine ? me.id : message.sender_user_id || "team",
          name: message.sender?.name || (message.sender?.isTeam ? "Staff" : "Family"),
          photoPath: message.sender?.photo || null,
        },
        sent: mine,
        // The team read it (the ticks turn green)
        received: mine && !!message.isread,
      };
    },
    [me?.id],
  );

  // Reads the conversation. What the team wrote is marked as read, because the family is looking at it now.
  const loadMessages = useCallback(async () => {
    if (!me) return;
    try {
      const { data } = await api.get(`/parent/kids/${kidId}/messages`);
      setMessages(data.map(formatMessage));

      const waiting = data.some((m) => m.sender?.isTeam && !m.isread);
      if (waiting) {
        await api.put(`/parent/kids/${kidId}/messages/read`);
        reloadUnread();
      }
    } catch (error) {
      console.log("Could not load the messages:", error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  }, [kidId, me, formatMessage, reloadUnread]);

  // Opens, then looks again every few seconds while the screen is in front (and when a push arrives)
  useFocusEffect(
    useCallback(() => {
      loadMessages();

      const timer = setInterval(() => {
        if (!sending.current) loadMessages();
      }, REFRESH_MS);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") loadMessages();
      });
      const stopPush = onFamilyPush(() => loadMessages());

      return () => {
        clearInterval(timer);
        subscription.remove();
        stopPush();
      };
    }, [loadMessages]),
  );

  const onSend = useCallback(
    async (newMessages = []) => {
      const text = newMessages[0]?.text?.trim();
      if (!text || !me) return;

      setInputText("");
      sending.current = true;

      // It shows at once (the ticks stay grey until the team reads it)
      setMessages((previous) =>
        Chat.append(previous, [
          {
            _id: `local-${Date.now()}`,
            text,
            createdAt: Date.now(),
            user: { _id: me.id, name: me.name, photoPath: null },
            sent: true,
            received: false,
          },
        ]),
      );

      try {
        await api.post(`/parent/kids/${kidId}/messages`, { content: text });
      } catch (error) {
        setInputText(text); // the text is not lost
        Alert.alert(
          "Message not sent",
          "Please check the connection and try again.",
        );
      } finally {
        sending.current = false;
        loadMessages(); // what the server really has (a message that failed disappears)
      }
    },
    [me, kidId, loadMessages],
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
      maxLength={1000}
    />
  );

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSend([
      {
        _id: Math.random().toString(),
        text: inputText,
        createdAt: Date.now(),
        user: { _id: me.id },
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
        color={inputText.trim() ? "#5337E0" : "#ccc"}
      />
    </TouchableOpacity>
  );

  const myId = me?.id;
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
    () => <MaterialCommunityIcons name="chevron-double-down" size={24} color="#333" />,
    [],
  );

  if (isLoading || !me) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5337E0" />
        <Text style={{ marginTop: 10, color: "#666" }}>Fetching messages...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Chat
        messages={messages}
        user={{ _id: me.id }}
        onSend={(newMessages) => onSend(newMessages)}
        isSendButtonAlwaysVisible
        renderComposer={renderComposer}
        renderSend={renderSend}
        isUsernameVisible
        renderBubble={renderBubble}
        renderTicks={renderTicks}
        renderAvatar={renderAvatar}
        isUserAvatarVisible={false}
        isAvatarVisibleForEveryMessage
        isScrollToBottomEnabled
        scrollToBottomComponent={scrollToBottomComponent}
        keyboardAvoidingViewProps={keyboardAvoidingViewProps}
      />
    </View>
  );
};

export default ChatScreen;
