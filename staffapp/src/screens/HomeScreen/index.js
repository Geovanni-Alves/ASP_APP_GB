import React, { useState, useEffect } from "react";
import styles from "./styles";
import { Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
//import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { unreadMessages } = useMessageContext();
  const { kids } = useKidsContext();
  const { currentUserData } = useUsersContext();
  //
  const [msgsCount, setMsgsCount] = useState(0);

  // useEffect to fetch and update the message count
  useEffect(() => {
    if (unreadMessages && kids) {
      // Count the number of unread messages
      try {
        const unreadCount = unreadMessages.filter((message) =>
          kids.some((kid) => !message.isRead && message.senderId === kid.id)
        ).length;
        setMsgsCount(unreadCount);
      } catch (error) {
        console.log("error updating the unread Message", error);
      }
    }
  }, [unreadMessages, kids]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGreetings}>
          <Text style={styles.title}>{`Hello, ${currentUserData?.name}`}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate("Chat")}
          >
            <AntDesign name="message1" size={20} color="white" />
            <Text style={styles.buttonText}>Chat</Text>
            {msgsCount > 0 && (
              <View style={styles.messageCountBadge}>
                <Text style={styles.messageCountText}>{msgsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={styles.checkInButton}
            onPress={() => navigation.navigate("CheckIn")}
          >
            <AntDesign name="checkcircleo" size={20} color="white" />
            <Text style={styles.buttonText}>Check In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.activityButton}
            onPress={() => {
              navigation.navigate("Activities", { from: "home" });
            }}
          >
            <FontAwesome name="feed" size={20} color="white" />
            <Text style={styles.buttonText}>New Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.studentsButton}
            onPress={() => {
              navigation.navigate("Students");
            }}
          >
            <FontAwesome name="child" size={20} color="white" />
            <Text style={styles.buttonText}>Students</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.pickUpButton}
            onPress={() => {
              console.log("Pickup Screen");
            }}
          >
            <FontAwesome5 name="route" size={24} color="white" />
            <Text style={styles.buttonText}>Pickup Route</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.pickUpButton}
            onPress={() => {
              navigation.navigate("DropOffList");
            }}
          >
            <FontAwesome5 name="route" size={20} color="white" />
            <Text style={styles.buttonText}>Drop Off</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
