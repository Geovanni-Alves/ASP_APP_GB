// src/screens/HomeScreen/index.js
// "My children": each child of the family with how today is going. From here the family can say that a child
// will not come today, and write to the team.
import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  Linking,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api, { errorMessage } from "../../lib/api";
import { useAuthContext } from "../../contexts/AuthState";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessagesContext } from "../../contexts/MessagesContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import RemoteImage from "../../components/RemoteImage";
import CustomLoading from "../../components/CustomLoading";
import AbsenceDialog from "../../components/AbsenceDialog";
import EventsCarousel from "../../components/EventsCarousel";
import ContactProgram from "../../components/ContactProgram";
import useEvents from "../../lib/useEvents";
import useProgramInfo from "../../lib/useProgramInfo";
import { statusOf, detailOf, WEEK_DAYS } from "../../lib/today";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const HomeScreen = ({ navigation }) => {
  const { session } = useAuthContext();
  const { profile } = useProfileContext();
  const { kids, loading, refreshing, refreshKids, reloadKids, error } =
    useKidsContext();
  const { unread } = useMessagesContext();

  const { events, reload: reloadEvents } = useEvents();
  const program = useProgramInfo();

  const [absenceKid, setAbsenceKid] = useState(null); // the child of the open dialog
  const [busy, setBusy] = useState(false);

  const fullName = profile?.name || session?.user?.name || "";
  const firstName = fullName.trim().split(" ")[0];

  const serverDate = kids[0]?.today?.date; // "2026-10-24": the day as the program sees it
  const dateText = new Date(
    serverDate ? `${serverDate}T12:00:00` : Date.now(),
  ).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const anyTest = kids.some((kid) => kid.today?.test_mode);

  // The family confirmed: the child will not come today
  const confirmAbsence = async (note) => {
    if (!absenceKid) return;
    setBusy(true);
    try {
      await api.post(`/parent/kids/${absenceKid.id}/absent`, { note });
      setAbsenceKid(null);
      await reloadKids();
    } catch (e) {
      Alert.alert("Could not mark the absence", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const renderKid = ({ item: kid }) => {
    const status = statusOf(kid);
    const detail = detailOf(kid);
    const waiting = unread[kid.id] || 0;
    // The API says if the family can still say "not coming today" (only until the cutoff time of the day)
    const canMarkAbsent = !!kid.today?.can_mark_absent;
    const tooLate = kid.today?.status === "waiting" && !canMarkAbsent;
    const cutoff = kid.today?.absence_cutoff;
    const first = (kid.name || "").trim().split(" ")[0];
    // Which day of the week is today (to highlight it in the week of the child)
    const todayKey = kid.today?.date
      ? DAY_KEYS[new Date(`${kid.today.date}T12:00:00`).getDay()]
      : null;

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
          </View>
          {!!detail && <Text style={styles.detail}>{detail}</Text>}

          {/* The days of the week the child comes */}
          <View style={styles.week}>
            {WEEK_DAYS.map((day) => {
              const comes = !!kid.schedule?.[day.key];
              const isToday = day.key === todayKey;
              return (
                <Text
                  key={day.key}
                  style={[
                    styles.day,
                    comes ? styles.dayOn : styles.dayOff,
                    // Today: strong when the child comes today, with an outline when it does not
                    isToday && comes && styles.dayTodayOn,
                    isToday && !comes && styles.dayTodayOff,
                  ]}
                >
                  {day.label}
                </Text>
              );
            })}
          </View>

          {canMarkAbsent && (
            <>
              <TouchableOpacity
                style={styles.actionRed}
                onPress={() => setAbsenceKid(kid)}
              >
                <MaterialCommunityIcons
                  name="calendar-remove-outline"
                  size={16}
                  color="#b02a37"
                />
                <Text style={styles.actionRedText}>Not coming today</Text>
              </TouchableOpacity>
              {!!cutoff && (
                <Text style={styles.hint}>You can tell us until {cutoff}</Text>
              )}
            </>
          )}
          {tooLate && (
            <>
              <Text style={styles.hint}>
                {cutoff ? `It is after ${cutoff}. ` : ""}To tell us that {first}{" "}
                will not come today, please call the program.
              </Text>
              {!!program.programPhone && (
                <TouchableOpacity
                  style={styles.actionPurple}
                  onPress={() =>
                    Linking.openURL(`tel:${program.programPhone.replace(/[^\d+]/g, "")}`)
                  }
                >
                  <MaterialCommunityIcons name="phone" size={16} color="#5337E0" />
                  <Text style={styles.actionPurpleText}>Call the program</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{dateText}</Text>
          <Text style={styles.hello}>
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </Text>
          <Text style={styles.sub}>My children</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("Profile")}
          accessibilityLabel="My profile"
        >
          <RemoteImage
            path={profile?.photo}
            name={fullName}
            bucketName="profilePhotos"
            style={styles.profileAvatar}
          />
        </TouchableOpacity>
      </View>

      {anyTest && (
        <View style={styles.testBanner}>
          <Text style={styles.testBannerText}>
            Test mode: you can say "not coming today" on any day and at any hour.
          </Text>
        </View>
      )}

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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                refreshKids();
                reloadEvents();
              }}
            />
          }
          ListFooterComponent={
            <View>
              <EventsCarousel events={events} />
              <ContactProgram
                name={program.programName}
                phone={program.programPhone}
                email={program.programEmail}
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {error ? "Could not load your children" : "No children yet"}
              </Text>
              <Text style={styles.emptyText}>
                {error
                  ? `Check your connection and pull down to try again. (${
                      error.response?.status || "no connection"
                    })`
                  : "No child is linked to your account yet. Please contact the program."}
              </Text>
            </View>
          }
        />
      )}

      <AbsenceDialog
        visible={!!absenceKid}
        kidName={absenceKid?.name?.split(" ")[0] || ""}
        busy={busy}
        onCancel={() => setAbsenceKid(null)}
        onConfirm={confirmAbsence}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  date: { fontSize: 13, color: "#6b7280" },
  hello: { fontSize: 24, fontWeight: "bold", color: "#1f2937", marginTop: 2 },
  sub: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e7e3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatar: { width: 40, height: 40, borderRadius: 20 },
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
  detail: { fontSize: 12, color: "#6b7280", marginTop: 4 },
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
  dayTodayOn: { backgroundColor: "#5337E0", color: "#ffffff" },
  dayTodayOff: { borderWidth: 1, borderColor: "#b8bec5" },
  testBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff3cd",
  },
  testBannerText: { fontSize: 12, color: "#8a5a00", fontWeight: "600" },
  actionRed: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1aeb5",
    backgroundColor: "#fff5f6",
  },
  actionRedText: { color: "#b02a37", fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  actionPurple: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfc7ff",
    backgroundColor: "#f6f4ff",
  },
  actionPurpleText: { color: "#5337E0", fontSize: 13, fontWeight: "600" },
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
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 8 },
});

export default HomeScreen;
