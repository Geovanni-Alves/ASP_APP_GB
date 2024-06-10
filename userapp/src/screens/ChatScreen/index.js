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
import RemoteImage from "../../components/RemoteImage";

const ChatScreen = () => {
  const navigation = useNavigation();
  const { kids } = useKidsContext();
  const [users, setUsers] = useState([]);
  const { unreadMessages } = useMessageContext();

  useEffect(() => {
    if (kids) {
      //console.log("allMessages", allMessages);
      setUsers(kids);
    }
  }, [kids]);

  const onUserPress = (user) => {
    const title = `${user.name} Chat`;
    navigation.navigate("ChatUser", { id: user.id, title, from: "Chat" });
  };

  const renderUserItem = ({ item: user }) => {
    // Calculate the number of unread messages for the current user
    const unreadCount = unreadMessages?.filter(
      (message) =>
        !message.isRead &&
        message.receiverIds.includes(user.id) &&
        message.senderId !== user.id
    ).length;

    return (
      <TouchableOpacity onPress={() => onUserPress(user)}>
        <View style={{ flex: 1, alignItems: "left", padding: 16 }}>
          <View style={{ position: "relative" }}>
            <RemoteImage
              path={user.photo}
              name={user.name}
              //source={{ uri: user.uriKid }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                marginRight: 10,
              }}
            />

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
