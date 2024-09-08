import React, { useState, useEffect } from "react";
import styles from "./styles";
import { Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { useNavigation } from "@react-navigation/native";
import CustomMessageBox from "../../components/CustomMessageBox";

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

  // if (true) {
  //   return (
  //     <View>
  //       <CustomMessageBox
  //         isVisible={true}
  //         onClose={false}
  //         header="Do you want to add a note to this media?"
  //         infoItems={[]}
  //         showTextInput={true}
  //         textInputPlaceholder="Write a note..."
  //         confirmButtonText="Yes, add a note" // Custom confirm button text
  //         cancelButtonText="No, post without notes" // Custom cancel button text
  //         onSubmit={(inputValue) => {
  //           if (inputValue) {
  //             //console.log("Note added:", inputValue);
  //             handleFinishActivity(inputValue);
  //           } else {
  //             //console.log("no note added");
  //             handleFinishActivity();
  //           }
  //         }}
  //       />
  //     </View>
  //   );
  // }

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
            <Text style={styles.buttonText}>Messages</Text>
            {msgsCount > 0 && (
              <View style={styles.messageCountBadge}>
                <Text style={styles.messageCountText}>{msgsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
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
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
