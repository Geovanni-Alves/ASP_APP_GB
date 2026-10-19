import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  SectionList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessageContext } from "../../contexts/MessageContext";
import { useTodayContext } from "../../contexts/TodayContext";
import RemoteImage from "../../components/RemoteImage";
import { groupKids } from "../../lib/today";
import styles from "./styles";

const ChatScreen = ({ navigation }) => {
  const { unreadMessages } = useMessageContext();
  const { kids } = useKidsContext();
  const { statusOf } = useTodayContext();

  // Unread messages from the families, by kid (the API only sends the unread ones)
  const unreadByKid = useMemo(() => {
    const count = {};
    (unreadMessages || []).forEach((message) => {
      count[message.student_id] = (count[message.student_id] || 0) + 1;
    });
    return count;
  }, [unreadMessages]);

  // The same groups as the students list; inside a group the kids with messages come first
  const sections = useMemo(
    () =>
      groupKids(kids || [], statusOf, "all", (a, b) => {
        const byUnread = (unreadByKid[b.id] || 0) - (unreadByKid[a.id] || 0);
        return byUnread !== 0
          ? byUnread
          : (a.name || "").localeCompare(b.name || "");
      }),
    [kids, statusOf, unreadByKid],
  );

  const onStudentPress = (student) => {
    navigation.navigate("ChatUser", { student });
  };

  const renderStudentItem = ({ item: student }) => {
    const unreadCount = unreadByKid[student.id] || 0;
    const faded = statusOf(student) === "none"; // not coming today

    return (
      <TouchableOpacity onPress={() => onStudentPress(student)}>
        <View style={[local.row, faded && { opacity: 0.45 }]}>
          <View style={{ position: "relative" }}>
            <RemoteImage
              path={student.photo}
              name={student.name}
              style={local.image}
              bucketName="profilePhotos"
            />
            {unreadCount > 0 && (
              <View style={styles.unreadCountContainer}>
                <Text style={styles.unreadCountText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={local.name}>{student.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={(student) => student?.id}
        renderItem={renderStudentItem}
        renderSectionHeader={({ section }) => (
          <Text style={[local.sectionTitle, { color: section.color }]}>
            {section.title} ({section.data.length})
          </Text>
        )}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const local = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 16,
  },
});

export default ChatScreen;
