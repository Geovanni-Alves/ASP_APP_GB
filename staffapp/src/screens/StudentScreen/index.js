import styles from "./styles";
import {
  SectionList,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useCallback, useMemo } from "react";
import { useKidsContext } from "../../contexts/KidsContext";
import { useTodayContext } from "../../contexts/TodayContext";
import { usePendingActions } from "../../contexts/PendingActionsContext";
import RemoteImage from "../../components/RemoteImage";
import api from "../../lib/api";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { GROUPS, formatTime, groupKids } from "../../lib/today";

const StudentScreen = () => {
  const navigation = useNavigation();
  const { kids, RefreshKidsData } = useKidsContext();
  const { today, loaded, refreshToday, statusOf } = useTodayContext();
  const [searchByName, setSearchByName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" or the key of a group

  // "Mark here": a kid that arrives without a route (a parent brings the kid). It waits 5 seconds
  // before it is saved, so a wrong tap can be undone (the same as the check-in of the routes).
  const { addPendingAction, cancelPendingAction } = usePendingActions();
  const [pendingHere, setPendingHere] = useState({}); // kid id -> id of the action that is waiting

  const forgetPending = (kidId) =>
    setPendingHere((prev) => {
      const next = { ...prev };
      delete next[kidId];
      return next;
    });

  const startMarkAsHere = (kid) => {
    const id = addPendingAction({
      type: "here",
      entityId: kid.id,
      delay: 5000,
      payload: { kidId: kid.id },
      onExecute: async ({ payload }) => {
        try {
          await api.post(`/app/students/${payload.kidId}/here`);
          await refreshToday(); // the kid moves to "At the ASP"
        } catch (error) {
          Alert.alert(
            "Not saved",
            error?.response?.data?.error || "Please try again.",
          );
        }
      },
      onFinish: () => forgetPending(kid.id),
    });
    setPendingHere((prev) => ({ ...prev, [kid.id]: id }));
  };

  const undoMarkAsHere = (kid) => {
    cancelPendingAction(pendingHere[kid.id]);
    forgetPending(kid.id);
  };

  // Asks first when it is unusual: the kid is not scheduled today, or was marked absent
  const confirmMarkAsHere = (kid, status) => {
    const reason =
      status === "none"
        ? `${kid.name} is not scheduled for today.`
        : status === "absent"
          ? `${kid.name} was marked as absent today.`
          : null;

    if (!reason) {
      startMarkAsHere(kid);
      return;
    }

    Alert.alert("Mark as here?", `${reason} Mark as here anyway?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Mark as here", onPress: () => startMarkAsHere(kid) },
    ]);
  };

  // Looks again when the screen comes to the front
  useFocusEffect(
    useCallback(() => {
      refreshToday();
    }, [refreshToday]),
  );

  // How many kids are in each group (the whole list, not only what the search shows)
  const totals = useMemo(() => {
    const count = { checked_in: 0, waiting: 0, absent: 0, none: 0 };
    kids.forEach((kid) => {
      const status = statusOf(kid);
      if (count[status] !== undefined) count[status] += 1;
    });
    return count;
  }, [kids, statusOf]);

  // The list, in groups
  const sections = useMemo(() => {
    const text = searchByName.trim().toLowerCase();
    const matches = kids.filter(
      (kid) => !text || kid.name.toLowerCase().includes(text),
    );
    return groupKids(matches, statusOf, filter);
  }, [kids, statusOf, searchByName, filter]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([RefreshKidsData(), refreshToday()]);
    setRefreshing(false);
  }, [RefreshKidsData, refreshToday]);

  const expected = totals.checked_in + totals.waiting + totals.absent;

  const renderStudents = ({ item }) => {
    const status = statusOf(item);
    const row = today[item.id];
    const pendingId = pendingHere[item.id];

    return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate("StudentFeed", { id: item.id });
        }}
      >
        <View
          style={[
            styles.studentContainer,
            status === "none" && { opacity: 0.45 }, // not coming today: faded
          ]}
        >
          <RemoteImage
            path={item.photo}
            name={item.name}
            style={styles.image}
            bucketName="profilePhotos"
          />
          <Text style={styles.name}>{item.name}</Text>

          {status === "checked_in" && (
            <Text style={[extra.badge, { color: "#198754" }]}>
              ✔ {formatTime(row?.checked_in_at)}
            </Text>
          )}
          {status === "absent" && !pendingId && (
            <Text style={[extra.badge, { color: "#dc3545" }]}>Absent</Text>
          )}

          {/* Arrived without a route (a parent brought the kid) */}
          {(status === "waiting" ||
            status === "absent" ||
            status === "none") && (
            <TouchableOpacity
              style={[
                extra.hereButton,
                pendingId && extra.undoButton,
                status === "waiting" || status === "none"
                  ? { marginLeft: "auto" }
                  : null,
              ]}
              onPress={() =>
                pendingId
                  ? undoMarkAsHere(item)
                  : confirmMarkAsHere(item, status)
              }
            >
              <Text
                style={[
                  extra.hereButtonText,
                  pendingId && { color: "#b45309" },
                ]}
              >
                {pendingId ? "Undo" : "Mark here"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Today in one look */}
      {loaded && (
        <View style={extra.banner}>
          <Text style={extra.bannerTitle}>Today at the ASP</Text>
          <Text style={extra.bannerText}>
            {expected === 0
              ? "No kids scheduled for today."
              : `${totals.checked_in} here · ${totals.waiting} still expected · ${totals.absent} absent`}
          </Text>
        </View>
      )}

      {/* Filter by what happened today */}
      {loaded && (
        <View style={extra.chips}>
          {[{ key: "all", title: "All" }, ...GROUPS].map((group) => {
            const selected = filter === group.key;
            const count = group.key === "all" ? kids.length : totals[group.key];
            return (
              <TouchableOpacity
                key={group.key}
                style={[extra.chip, selected && extra.chipSelected]}
                onPress={() => setFilter(group.key)}
              >
                <Text
                  style={[extra.chipText, selected && extra.chipTextSelected]}
                >
                  {group.key === "all" ? "All" : group.title.split(",")[0]}{" "}
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name"
        value={searchByName}
        onChangeText={setSearchByName}
      />

      <SectionList
        sections={sections}
        renderItem={renderStudents}
        renderSectionHeader={({ section }) => (
          <Text style={[extra.sectionTitle, { color: section.color }]}>
            {section.title} ({section.data.length})
          </Text>
        )}
        keyExtractor={(item) => item.id.toString()}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

// What this screen adds to the list (the rest of the look is in ./styles)
const extra = StyleSheet.create({
  banner: {
    backgroundColor: "#e6f4ea",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14532d",
  },
  bannerText: {
    fontSize: 14,
    color: "#14532d",
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#e9ecef",
  },
  chipSelected: {
    backgroundColor: "#212529",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 14,
  },
  badge: {
    marginLeft: "auto",
    fontSize: 13,
    fontWeight: "700",
    paddingRight: 12,
  },
  hereButton: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#198754",
  },
  undoButton: {
    borderColor: "#b45309",
    backgroundColor: "#fef3c7",
  },
  hereButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#198754",
  },
});

export default StudentScreen;
