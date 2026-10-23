// src/screens/HomeScreen/index.js
// "My children": each child of the family with how today is going.
import React from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthContext } from "../../contexts/AuthState";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessagesContext } from "../../contexts/MessagesContext";
import RemoteImage from "../../components/RemoteImage";
import CustomLoading from "../../components/CustomLoading";
import { statusOf, detailOf, WEEK_DAYS } from "../../lib/today";

const HomeScreen = ({ navigation }) => {
  const { session, logout } = useAuthContext();
  const { kids, loading, refreshing, refreshKids, error } = useKidsContext();
  const { unread } = useMessagesContext();
  const firstName = (session?.user?.name || "").trim().split(" ")[0];

  const renderKid = ({ item: kid }) => {
    const status = statusOf(kid);
    const detail = detailOf(kid);
    const waiting = unread[kid.id] || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("KidFeed", { kidId: kid.id, name: kid.name })
        }
      >
        <RemoteImage
          path={kid.photo}
          name={kid.name}
          bucketName="profilePhotos"
          style={styles.photo}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.kidName}>{kid.name}</Text>
          {!!kid.school?.name && (
            <Text style={styles.school}>{kid.school.name}</Text>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.pill, { backgroundColor: status.bg }]}>
              <Text style={[styles.pillText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            {!!detail && <Text style={styles.detail}>{detail}</Text>}
          </View>

          {/* The days of the week the child comes */}
          <View style={styles.week}>
            {WEEK_DAYS.map((day) => (
              <Text
                key={day.key}
                style={[
                  styles.day,
                  kid.schedule?.[day.key] ? styles.dayOn : styles.dayOff,
                ]}
              >
                {day.label}
              </Text>
            ))}
          </View>
        </View>

        {/* Write to the team (with the number of messages waiting) */}
        <TouchableOpacity
          style={styles.chatButton}
          hitSlop={8}
          onPress={() =>
            navigation.navigate("Chat", { kidId: kid.id, name: kid.name })
          }
          accessibilityLabel={`Messages about ${kid.name}`}
        >
          <MaterialCommunityIcons
            name="message-text-outline"
            size={24}
            color="#5337E0"
          />
          {waiting > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{waiting > 9 ? "9+" : waiting}</Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </Text>
          <Text style={styles.sub}>My children</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <CustomLoading imageSize={50} showContainer={false} />
        </View>
      ) : (
        <FlatList
          data={kids}
          keyExtractor={(kid) => kid.id}
          renderItem={renderKid}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshKids} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {error ? "Could not load your children" : "No children yet"}
              </Text>
              <Text style={styles.emptyText}>
                {error
                  ? "Check your connection and pull down to try again."
                  : "No child is linked to your account yet. Please contact the program."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hello: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  sub: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  signOut: { color: "#c0392b", fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  photo: { width: 72, height: 72, borderRadius: 36, marginRight: 14 },
  kidName: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  school: { fontSize: 13, color: "#6b7280", marginTop: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: "700" },
  detail: { fontSize: 12, color: "#6b7280", marginLeft: 8 },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1eeff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc3545",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  week: { flexDirection: "row", marginTop: 10, gap: 6 },
  day: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  dayOn: { backgroundColor: "#e7e3ff", color: "#5337E0" },
  dayOff: { backgroundColor: "#f1f3f5", color: "#b8bec5" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 8 },
});

export default HomeScreen;
