import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, FlatList, Text, TouchableOpacity, Image } from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessageContext } from "../../contexts/MessageContext";
import styles from "./styles";

const ChatScreen = ({ navigation }) => {
  const { unreadMessages } = useMessageContext();
  const { kids } = useKidsContext();
  const [students, setStudents] = useState([]);
  // const [users, setUsers] = useState([]);

  useEffect(() => {
    if (kids) {
      setStudents(kids);
    }
    // console.log("unread messages", unreadMessages);
  }, [kids]);

  const getInitials = (name) => {
    const nameArray = name.split(" ");
    return nameArray
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const onStudentPress = (student) => {
    navigation.navigate("ChatUser", { student });
  };

  const renderStudentItem = ({ item: student }) => {
    // Calculate the number of unread messages for each kid
    const unreadCount =
      unreadMessages?.filter(
        (msg) =>
          msg.student_id === student.id &&
          msg.sender_contact_id != null &&
          !msg.isread
      ).length || 0;

    return (
      <TouchableOpacity onPress={() => onStudentPress(student)}>
        <View style={{ flex: 1, alignItems: "left", padding: 16 }}>
          <View style={{ position: "relative" }}>
            {student.uriKid ? (
              <Image
                source={{ uri: student.uriKid }}
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
                <Text style={{ color: "white" }}>
                  {getInitials(student.name)}
                </Text>
              </View>
            )}
            {unreadCount > 0 && ( // Render the unread count only if it's greater than 0
              <View style={styles.unreadCountContainer}>
                <Text style={styles.unreadCountText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text>{student.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={students}
        keyExtractor={(student) => student?.id}
        renderItem={renderStudentItem}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;
