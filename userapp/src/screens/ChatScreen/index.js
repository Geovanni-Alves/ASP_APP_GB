import React, { useState, useEffect } from "react";
import styles from "./styles";
import {
  View,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";

const ChatScreen = () => {
  const navigation = useNavigation();
  const { kids } = useKidsContext();
  const [users, setUsers] = useState([]);
  const { unreadMessages } = useMessageContext();

  const getInitials = (name) => {
    const nameArray = name.split(" ");
    return nameArray
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    if (kids) {
      //console.log("allMessages", allMessages);
      setUsers(kids);
    }
  }, [kids]);

  const onUserPress = (user) => {
    navigation.navigate("ChatUser", { id: user.id });
  };

  const renderUserItem = ({ item: user }) => {
    // Calculate the number of unread messages for the current user
    const unreadCount = unreadMessages?.filter(
      (message) =>
        !message.isRead &&
        message.receiverIDs.includes(user.id) &&
        message.senderID !== user.id
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
            {unreadCount > 0 && (
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
