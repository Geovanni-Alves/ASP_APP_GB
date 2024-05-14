import React, { useState, useEffect, useCallback } from "react";
import styles from "./styles";
import {
  View,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessageContext } from "../../contexts/MessageContext";

const ChatScreen = ({ navigation }) => {
  const { unreadMessages } = useMessageContext();
  const { kids } = useKidsContext();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (kids) {
      setUsers(kids);
    }
  }, [kids]);

  const getInitials = (name) => {
    const nameArray = name.split(" ");
    return nameArray
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const onUserPress = (user) => {
    navigation.navigate("ChatUser", { id: user.id });
  };

  const renderUserItem = ({ item: user }) => {
    // Calculate the number of unread messages for each kid
    const unreadCount = unreadMessages?.filter(
      (message) => !message.isRead && message.senderID === user.id
    ).length;

    return (
      <TouchableOpacity onPress={() => onUserPress(user)}>
        <View style={{ flex: 1, alignItems: "left", padding: 16 }}>
          <View style={{ position: "relative" }}>
            {user.uriKid ? (
              <Image
                source={{ uri: user.uriKid }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  marginRight: 10,
                }}
              />
            ) : (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: "lightgray",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Text style={{ color: "white" }}>{getInitials(user.name)}</Text>
              </View>
            )}
            {unreadCount > 0 && ( // Render the unread count only if it's greater than 0
              <View style={styles.unreadCountContainer}>
                <Text style={styles.unreadCountText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text>{user.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={users}
        keyExtractor={(user) => user?.id}
        renderItem={renderUserItem}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;
