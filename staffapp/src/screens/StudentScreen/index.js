import styles from "./styles";
import {
  SectionList,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useCallback, useMemo } from "react";
import { useKidsContext } from "../../contexts/KidsContext";
import { useTodayContext } from "../../contexts/TodayContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { usePendingActions } from "../../contexts/PendingActionsContext";
import RemoteImage from "../../components/RemoteImage";
import InfoModal from "../../components/InfoModal";
import Ionicons from "@expo/vector-icons/Ionicons";
import api from "../../lib/api";
import { canSeeWhoRegistered } from "../../lib/roles";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { GROUPS, formatTime, formatDay, groupKids } from "../../lib/today";

const StudentScreen = () => {
  const navigation = useNavigation();
  const { kids, RefreshKidsData } = useKidsContext();
  const { today, loaded, day, refreshToday, statusOf } = useTodayContext();
  const { currentUserData } = useUsersContext();
  const canSeeWho = canSeeWhoRegistered(currentUserData);
  const canFix = canSeeWho; // the same people: the owner, the managers and the programmer
  const [searchByName, setSearchByName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" or the key of a group

  // The "info" of a kid: who registered the check-in and the check-out (only for who runs the school)
  const [dayInfo, setDayInfo] = useState(null); // { kidName, items }

  const showDayInfo = async (kid) => {
    try {
      const { data: day } = await api.get(`/app/students/${kid.id}/day`);

      const when = (iso, by) => `${formatTime(iso)}${by ? ` · ${by}` : ""}`;
      const items = [];

      if (day.checked_in) {
        items.push({
          label: "Checked in:",
          value: when(day.checked_in_at, day.checked_in_by),
        });
        items.push({
          label: "How:",
          value: day.route_id
            ? `Picked up from school${day.van ? ` (${day.van})` : ""}`
            : "Arrived at the ASP, without a route",
        });
        items.push({
          label: "Checked out:",
          value: day.checked_out
            ? when(day.checked_out_at, day.checked_out_by)
            : "Not yet",
        });
      }
      if (day.is_absent) {
        items.push({
          label: "Marked absent:",
          value: when(day.absent_at, day.absent_by),
        });
      }
      if (items.length === 0) {
        items.push({ label: "Today:", value: "Nothing registered yet." });
      }

      setDayInfo({ kidName: kid.name, items });
    } catch (error) {
      console.error(
        "Error loading the day of the kid:",
        error?.response?.data || error.message,
      );
      Alert.alert("Could not load the info", "Please try again.");
    }
  };

  // "Mark here" and "Check out" wait 5 seconds before they are saved, so a wrong tap can be undone
  // (the same as the check-in of the routes).
  const { addPendingAction, cancelPendingAction } = usePendingActions();
  const [pendingHere, setPendingHere] = useState({}); // kid id -> id of the action that is waiting
  const [pendingOut, setPendingOut] = useState({});

  const forget = (setter) => (kidId) =>
    setter((prev) => {
      const next = { ...prev };
      delete next[kidId];
      return next;
    });
  const forgetPending = forget(setPendingHere);
  const forgetPendingOut = forget(setPendingOut);

  // ---------------------------------------------------------------- mark here
  // A kid that arrives without a route (a parent brings the kid)
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

  // Always asks first. When it is unusual (not scheduled today, or marked absent) it says so.
  const confirmMarkAsHere = (kid, status) => {
    const reason =
      status === "none"
        ? `${kid.name} is not scheduled for today.`
        : status === "absent"
          ? `${kid.name} was marked as absent today.`
          : null;

    Alert.alert(
      "Mark as here?",
      reason
        ? `${reason} Mark as here anyway?`
        : `Mark ${kid.name} as here (arrived at the ASP)?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark as here", onPress: () => startMarkAsHere(kid) },
      ],
    );
  };

  // ---------------------------------------------------------------- check-out
  // The kid goes home (a parent picks the kid up at the ASP). The family gets the news in the feed.
  const startCheckout = (kid) => {
    const id = addPendingAction({
      type: "checkout",
      entityId: kid.id,
      delay: 5000,
      payload: { kidId: kid.id },
      onExecute: async ({ payload }) => {
        try {
          await api.post(`/app/students/${payload.kidId}/checkout`);
          await refreshToday(); // the kid moves to "Went home"
        } catch (error) {
          Alert.alert(
            "Check-out not saved",
            error?.response?.data?.error || "Please try again.",
          );
        }
      },
      onFinish: () => forgetPendingOut(kid.id),
    });
    setPendingOut((prev) => ({ ...prev, [kid.id]: id }));
  };

  const undoCheckout = (kid) => {
    cancelPendingAction(pendingOut[kid.id]);
    forgetPendingOut(kid.id);
  };

  const confirmCheckout = (kid) => {
    Alert.alert(
      "Check out?",
      `Check out ${kid.name}? The family will be told that ${kid.name} went home.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Check out", onPress: () => startCheckout(kid) },
      ],
    );
  };

  // ---------------------------------------------------------------- corrections
  // People make mistakes. The owner, the managers and the programmer can undo a check-in, a check-out
  // or an absence of TODAY, also after the 5 seconds of "Undo". The family sees a correction.
  const fixOptionsOf = (status) =>
    ({
      checked_out: [
        {
          action: "checkout",
          label: "Undo check-out",
          result: 'goes back to "At the ASP"',
        },
        {
          action: "checkin",
          label: "Undo check-in too",
          result: "is no longer checked in",
        },
      ],
      checked_in: [
        {
          action: "checkin",
          label: "Undo check-in",
          result: "is no longer checked in",
        },
      ],
      absent: [
        {
          action: "absent",
          label: "Undo absence",
          result: "is no longer absent",
        },
      ],
    })[status] || [];

  const confirmFix = (kid, option) => {
    Alert.alert(
      option.label + "?",
      `${kid.name} ${option.result}. The family will see a correction in the feed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: option.label,
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`/app/students/${kid.id}/revert`, {
                action: option.action,
              });
              await refreshToday();
            } catch (error) {
              Alert.alert(
                "Not corrected",
                error?.response?.data?.error || "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const askToFix = (kid, status) => {
    const options = fixOptionsOf(status);
    Alert.alert(`Correct ${kid.name}`, "What do you want to undo?", [
      ...options.map((option) => ({
        text: option.label,
        onPress: () => confirmFix(kid, option),
      })),
      { text: "Cancel", style: "cancel" },
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
    const count = {
      checked_in: 0,
      waiting: 0,
      checked_out: 0,
      absent: 0,
      none: 0,
    };
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

  const expected =
    totals.checked_in + totals.waiting + totals.checked_out + totals.absent;

  // The state of the day, as the card says it
  const stateOf = (status, row) =>
    ({
      checked_in: {
        label: `At the ASP · ${formatTime(row?.checked_in_at)}`,
        color: "#198754",
      },
      waiting: { label: "Expected today", color: "#fd7e14" },
      checked_out: {
        label: `Went home · ${formatTime(row?.checked_out_at)}`,
        color: "#6c757d",
      },
      absent: { label: "Absent today", color: "#dc3545" },
      none: { label: "Not coming today", color: "#adb5bd" },
    })[status] || null;

  // What can be done with the kid now: one button (or none)
  const actionOf = (item, status) => {
    if (status === "checked_in") {
      return pendingOut[item.id]
        ? { label: "Undo", kind: "Undo", onPress: () => undoCheckout(item) }
        : {
            label: "Check out",
            kind: "Out",
            onPress: () => confirmCheckout(item),
          };
    }
    if (status === "waiting" || status === "absent" || status === "none") {
      return pendingHere[item.id]
        ? { label: "Undo", kind: "Undo", onPress: () => undoMarkAsHere(item) }
        : {
            label: "Mark here",
            kind: status === "none" ? "HereLight" : "Here",
            onPress: () => confirmMarkAsHere(item, status),
          };
    }
    return null;
  };

  const renderStudents = ({ item }) => {
    const status = statusOf(item);
    const state = stateOf(status, today[item.id]);
    const action = actionOf(item, status);
    const hasInfo =
      canSeeWho &&
      (status === "checked_in" ||
        status === "checked_out" ||
        status === "absent");

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          navigation.navigate("StudentFeed", { id: item.id });
        }}
        style={[
          styles.card,
          state && { borderLeftColor: state.color },
          status === "none" && { opacity: 0.55 }, // not coming today: faded
        ]}
      >
        <View style={styles.cardTop}>
          <RemoteImage
            path={item.photo}
            name={item.name}
            style={styles.image}
            bucketName="profilePhotos"
          />

          <View style={styles.cardText}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {state && (
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: state.color }]} />
                <Text style={[styles.statusText, { color: state.color }]}>
                  {state.label}
                </Text>
              </View>
            )}
          </View>

          {/* Who registered it (only for who runs the school) */}
          {hasInfo && (
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => showDayInfo(item)}
            >
              <Ionicons
                name="information-circle-outline"
                size={26}
                color="#495057"
              />
            </TouchableOpacity>
          )}
        </View>

        {(action || canFix) && (
          <View style={styles.cardActions}>
            {/* A mistake of today: only who runs the school corrects it */}
            {canFix && fixOptionsOf(status).length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionFix]}
                onPress={() => askToFix(item, status)}
              >
                <Text style={[styles.actionText, styles.actionFixText]}>
                  Correct
                </Text>
              </TouchableOpacity>
            )}
            {action && (
              <TouchableOpacity
                style={[styles.actionButton, styles[`action${action.kind}`]]}
                onPress={action.onPress}
              >
                <Text
                  style={[
                    styles.actionText,
                    styles[`action${action.kind}Text`],
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Today in one look */}
      {loaded && (
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerTitle}>Today at the ASP</Text>
            {!!day && <Text style={styles.bannerDay}>{formatDay(day)}</Text>}
          </View>
          <Text style={styles.bannerText}>
            {expected === 0
              ? "No children scheduled for today."
              : `${totals.checked_in} here · ${totals.waiting} still expected${
                  totals.checked_out ? ` · ${totals.checked_out} went home` : ""
                } · ${totals.absent} absent`}
          </Text>
        </View>
      )}

      {/* Filter by what happened today */}
      {loaded && (
        <View style={styles.chips}>
          {[{ key: "all", title: "All" }, ...GROUPS].map((group) => {
            const selected = filter === group.key;
            const count = group.key === "all" ? kids.length : totals[group.key];
            return (
              <TouchableOpacity
                key={group.key}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setFilter(group.key)}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
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
          <Text style={[styles.sectionTitle, { color: section.color }]}>
            {section.title} ({section.data.length})
          </Text>
        )}
        keyExtractor={(item) => item.id.toString()}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {dayInfo && (
        <InfoModal
          isVisible={true}
          onClose={() => setDayInfo(null)}
          header={dayInfo.kidName}
          horizontalLayout={true}
          infoItems={dayInfo.items}
        />
      )}
    </SafeAreaView>
  );
};

export default StudentScreen;
