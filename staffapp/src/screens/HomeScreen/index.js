import React from "react";
import styles from "./styles";
import { Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useMessageContext } from "../../contexts/MessageContext";
import { useKidsContext } from "../../contexts/KidsContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { useTodayContext } from "../../contexts/TodayContext";
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { unreadMessages } = useMessageContext();
  const { kids } = useKidsContext();
  const { currentUserData } = useUsersContext();
  const { loaded, statusOf } = useTodayContext();

  // The API only sends the messages from the families that nobody read yet
  const msgsCount = unreadMessages?.length || 0;

  // Who is here today (checked in), and who is still expected
  const hereCount = loaded
    ? kids.filter((kid) => statusOf(kid) === "checked_in").length
    : 0;
  const expectedCount = loaded
    ? kids.filter((kid) => statusOf(kid) === "waiting").length
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGreetings}>
          <Text style={styles.title}>{`Hello, ${currentUserData?.name}`}</Text>
          {loaded && (
            <Text style={{ fontSize: 15, color: "#198754", fontWeight: "600" }}>
              {hereCount === 0 && expectedCount === 0
                ? "No kids at the ASP yet today"
                : `Today: ${hereCount} here · ${expectedCount} still expected`}
            </Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate("Chat")}
          >
            <AntDesign name="message" size={20} color="white" />
            <Text style={styles.buttonText}>Chat</Text>
            {msgsCount > 0 && (
              <View style={styles.messageCountBadge}>
                <Text style={styles.messageCountText}>{msgsCount}</Text>
              </View>
            )}
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
            {hereCount > 0 && (
              <View
                style={[
                  styles.messageCountBadge,
                  { backgroundColor: "#198754" },
                ]}
              >
                <Text style={styles.messageCountText}>{hereCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.pickUpButton}
            onPress={() => {
              navigation.navigate("PickupList");
            }}
          >
            <FontAwesome5 name="route" size={24} color="white" />
            <Text style={styles.buttonText}>Pickup Route</Text>
          </TouchableOpacity>
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
