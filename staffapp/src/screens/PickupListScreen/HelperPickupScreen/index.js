import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import RemoteImage from "../../../components/RemoteImage";
import { useRoutesContext } from "../../../contexts/RoutesContext";
import { useUsersContext } from "../../../contexts/UsersContext";
import { supabase } from "../../../lib/supabase";
import styles from "./styles";

const HelperPickupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { routeId } = route.params;

  const { routesData, loading } = useRoutesContext();
  const { dbUser } = useUsersContext();

  const [kids, setKids] = useState([]);
  const [assignedSchool, setAssignedSchool] = useState(null);
  const [localKidsState, setLocalKidsState] = useState({});
  const kidsStateRef = useRef({});
  // const [fullscreenVisible, setFullscreenVisible] = useState(false);
  // const [selectedPhoto, setSelectedPhoto] = useState(null);
  // const [stops, setStops] = useState([]);

  // const [checkedIn, setCheckedIn] = useState(false);
  // const [undoEnabled, setUndoEnabled] = useState(false);
  // const [undoTimer, setUndoTimer] = useState(null);

  const getRouteById = (id) => {
    return routesData.find((r) => r.id === id) || null;
  };

  useEffect(() => {
    kidsStateRef.current = localKidsState;
  }, [localKidsState]);

  useEffect(() => {
    const loadKids = async () => {
      if (!routeId || !routesData.length || !dbUser) return;

      const routeData = getRouteById(routeId);
      if (!routeData) return;

      // find van where this helper or driver is assigned
      const myVan = routeData.vans.find(
        (v) => v.driver_id === dbUser.id || v.helper_ids?.includes(dbUser.id)
      );

      if (!myVan) {
        setKids([]);
        return;
      }

      // Filter only kids assigned to THIS STAFF
      const assignedKids = myVan.kids.filter(
        (k) => k.responsible_staff_id === dbUser.id
      );

      // console.log("assignedKids", assignedKids);

      const routeDate = routeData.date;
      const vanId = routeData.vans[0].id;

      const kidsWithAttendance = await Promise.all(
        assignedKids.map(async (kidObj) => {
          const { data: attendanceRecord } = await supabase
            .from("student_attendance")
            .select("*")
            .eq("student_id", kidObj.kid.id)
            .eq("date", routeDate)
            .eq("route_id", routeId)
            .eq("van_id", vanId)
            .maybeSingle();

          // console.log("attendanceRecord", attendanceRecord);
          // console.log("kidObj", kidObj);

          return {
            ...kidObj,
            attendance: attendanceRecord || null,
          };
        })
      );

      setKids(kidsWithAttendance);

      if (kidsWithAttendance.length > 0) {
        setAssignedSchool(kidsWithAttendance[0].school?.name || null);
      }

      // console.log("kids", kidsWithAttendance);
      // console.log("route Data", routeData);
      // console.log(routeId);
    };
    loadKids();
  }, [routeId, routesData, dbUser]);

  useEffect(() => {
    // console.log("Local Kids", kids);
    if (kids.length > 0) {
      const initial = {};

      kids.forEach((k) => {
        initial[k.kid.id] = {
          isChecked: k.attendance?.checked_in || false,
          isAbsent: k.attendance?.is_absent || false,
          undoEnabled: false,
          timer: null,
          pendingAction: null,
          attendanceId: k.attendanceId?.id || null,
          saved: false,
        };
      });

      setLocalKidsState(initial);
    }
  }, [kids]);

  const updateKidState = (kidId, newState) => {
    setLocalKidsState((prev) => ({
      ...prev,
      [kidId]: {
        ...prev[kidId],
        ...newState,
      },
    }));
  };

  const handlePushNotification = (type, kid) => {
    console.log("🔔 NEED TO SEND A NOTIFICATION →", type.toUpperCase());
    console.log("Kid:", kid.name, kid.id);
  };

  const goToStudentFeed = (kidId) => {
    navigation.navigate("StudentProfile", { id: kidId, readOnly: true });
  };

  const scheduleSave = (kidId, action, kidObj) => {
    const t = setTimeout(async () => {
      // const state = localKidsState[kidId];
      const state = kidsStateRef.current[kidId];
      console.log("state", state);

      // canceled already
      if (state.pendingAction !== action) return;

      try {
        if (action === "checkin") {
          await saveCheckInToDB(kidObj);
        } else if (action === "absent") {
          await saveAbsentToDB(kidObj);
        }

        handlePushNotification(action, kidObj);

        updateKidState(kidId, {
          undoEnabled: false,
          saved: true,
          timer: null,
          pendingAction: null,
        });
      } catch (err) {
        console.error("SAVE ERROR:", err);
        Alert.alert("Error", "Could not save status.");
      }
    }, 8000); // 8 seconds

    updateKidState(kidId, { timer: t });
  };

  const saveCheckInToDB = async (kidObj) => {
    const routeData = getRouteById(routeId);

    const { data, error } = await supabase
      .from("student_attendance")
      .insert({
        student_id: kidObj.id,
        route_id: routeData.id,
        van_id: routeData.vans[0].id,
        date: routeData.date,
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: dbUser.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const saveAbsentToDB = async (kidObj) => {
    // console.log("saving absent");
    const routeData = getRouteById(routeId);

    const { data, error } = await supabase
      .from("student_attendance")
      .insert({
        student_id: kidObj.id,
        route_id: routeData.id,
        van_id: routeData.vans[0].id,
        date: routeData.date,
        is_absent: true,
        absent_at: new Date().toISOString(),
        absent_by: dbUser.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const handleUndoAbsent = (item) => {
    const kidId = item.kid.id;
    const state = kidsStateRef.current[kidId];

    if (!state.undoEnabled) {
      return Alert.alert(
        "Undo expired",
        "This action can no longer be undone."
      );
    }

    Alert.alert("Undo Absent", `Undo absent for ${item.kid.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          clearTimeout(state.timer);

          updateKidState(kidId, {
            isAbsent: false,
            pendingAction: null,
            undoEnabled: false,
            timer: null,
          });

          console.log("UNDO ABSENT → canceled queued save");
        },
      },
    ]);
  };

  const handleCheckIn = (item) => {
    Alert.alert("Confirm Check-in", `Check in ${item.kid.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          const kidId = item.kid.id;

          updateKidState(kidId, {
            isChecked: true,
            isAbsent: false,
            undoEnabled: true,
            pendingAction: "checkin",
          });

          scheduleSave(kidId, "checkin", item.kid);

          // const t = setTimeout(() => {
          //   updateKidState(kidId, { undoEnabled: false });
          // }, 7000);

          // updateKidState(kidId, { timer: t });
          // const routeData = getRouteById(routeId);

          // doCheckIn(item.kid, routeData);
        },
      },
    ]);
  };

  const handleAbsent = (item) => {
    Alert.alert("Mark Absent", `Mark ${item.kid.name} as absent?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          const kidId = item.kid.id;

          updateKidState(kidId, {
            isAbsent: true,
            isChecked: false,
            undoEnabled: true,
            pendingAction: "absent",
          });

          scheduleSave(kidId, "absent", item.kid);
        },
      },
    ]);
  };

  // const doCheckIn = async (kidObj, routeData) => {
  //   // console.log({ kidObj, routeData });

  //   try {
  //     const routeDate = routeData.date;
  //     const routeId = routeData.id;
  //     const vanId = routeData?.vans[0].id;
  //     const kidId = kidObj.id;

  //     // console.log({ routeDate, routeId, vanId, kidId });

  //     const { data: inserted, error: insertError } = await supabase
  //       .from("student_attendance")
  //       .insert([
  //         {
  //           student_id: kidId,
  //           route_id: routeId,
  //           van_id: vanId,
  //           date: routeDate,
  //           checked_in: true,
  //           checked_in_at: new Date().toISOString(),
  //           checked_in_by: dbUser.id,
  //         },
  //       ])
  //       .select()
  //       .single();

  //     if (insertError) throw insertError;

  //     updateKidState(kidId, {
  //       attendanceId: inserted.id,
  //     });
  //   } catch (err) {
  //     console.error("CHECK-IN ERROR", err);
  //     Alert.alert("Error", "Could not save check-in.");
  //   }
  // };

  // const handleUndoCheckIn = (item) => {
  //   const kidId = item.kid.id;
  //   const state = localKidsState[kidId];
  //   const attendanceId = state.attendanceId;

  //   console.log(item);

  //   if (!state.undoEnabled) {
  //     return Alert.alert(
  //       "Undo expired",
  //       "You can no longer undo this check-in."
  //     );
  //   }

  //   Alert.alert("Undo Check-in", `Undo check-in for ${item.kid.name}?`, [
  //     { text: "Cancel", style: "cancel" },
  //     {
  //       text: "Confirm",
  //       onPress: () => {
  //         clearTimeout(state.timer);

  //         updateKidState(kidId, {
  //           isChecked: false,
  //           undoEnabled: false,
  //           timer: null,
  //         });

  //         console.log(attendanceId);

  //         if (attendanceId) {
  //           doUndoCheckIn(attendanceId);
  //         }
  //       },
  //     },
  //   ]);
  // };

  const handleUndoCheckIn = (item) => {
    const kidId = item.kid.id;
    const state = localKidsState[kidId];

    if (!state.undoEnabled) {
      return Alert.alert(
        "Undo expired",
        "This action can no longer be undone."
      );
    }

    Alert.alert("Undo Check-in", `Undo check-in for ${item.kid.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          clearTimeout(state.timer);

          updateKidState(kidId, {
            isChecked: false,
            pendingAction: null,
            undoEnabled: false,
            timer: null,
          });
        },
      },
    ]);
  };

  // const doUndoCheckIn = async (attendanceId) => {
  //   // console.log(attendanceId);
  //   try {
  //     const { error } = await supabase
  //       .from("student_attendance")
  //       .delete()
  //       .eq("id", attendanceId);

  //     if (error) throw error;

  //     console.log("Attendance removed:", attendanceId);
  //   } catch (err) {
  //     console.error("UNDO ERROR", err);
  //     Alert.alert("Error", "Could not undo the check-in.");
  //   }
  // };

  // const handleAbsent = (item) => {
  //   Alert.alert("Mark Absent", `Mark ${item.kid.name} as absent?`, [
  //     { text: "Cancel", style: "cancel" },
  //     {
  //       text: "Confirm",
  //       onPress: () => {
  //         const kidId = item.kid.id;

  //         updateKidState(kidId, {
  //           isAbsent: true,
  //           isChecked: false,
  //           undoEnabled: false,
  //         });

  //         // Salvar no DB depois, mas sem undo
  //         // doMarkAbsent(item.kid);
  //       },
  //     },
  //   ]);
  // };

  // const doMarkAbsent = async (item) => {
  //   try {
  //     const routeData = getRouteById(routeId);
  //     const routeIdValue = routeData.id;
  //     const vanId = routeData.vans[0].id;

  //     await supabase.from("student_attendance").insert([
  //       {
  //         student_id: item.kid.id,
  //         route_id: routeIdValue,
  //         van_id: vanId,
  //         date: routeData.date,
  //         is_absent: true,
  //         absent_marked_by: dbUser.id,
  //       },
  //     ]);
  //   } catch (err) {
  //     console.error("ABSENT ERROR", err);
  //     Alert.alert("Error", "Could not mark absent.");
  //   }
  // };

  const renderKidItem = ({ item, index }) => {
    const kidId = item.kid.id;
    const kidState = localKidsState[kidId] || {};

    const isChecked = kidState.isChecked;
    const isAbsent = kidState.isAbsent;
    const undoEnabled = kidState.undoEnabled;

    const cardStyles = [
      styles.stopCard,
      isChecked && styles.stopCardChecked,
      isAbsent && styles.stopCardAbsent,
    ];
    // const gradeText =
    //   item.kid.schoolGrade &&
    //   `Grade ${item.kid.schoolGrade}${
    //     item.kid.schoolGradeDivision
    //       ? ` (Div ${item.kid.schoolGradeDivision})`
    //       : ""
    //   }`;

    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={() => goToStudentFeed(item.kid.id)}
        activeOpacity={0.85}
      >
        {isChecked && (
          <View style={styles.checkedIconContainer}>
            <Text style={styles.checkedIcon}>✔</Text>
          </View>
        )}

        {isAbsent && (
          <View style={styles.absentBanner}>
            <Text style={styles.absentBannerText}>ABSENT</Text>
          </View>
        )}
        <RemoteImage
          bucketName="profilePhotos"
          path={item.kid.photo}
          name={item.kid.name}
          style={styles.avatar}
        />

        <View style={styles.infoContainer}>
          <Text style={styles.kidName}>{item.kid.name}</Text>
          {/* <Text style={styles.kidName}>{item.kid.id}</Text> */}

          {item.school.name && (
            <Text style={styles.infoLine}>{item.school.name}</Text>
          )}

          {item.kid.schoolTeacherName && (
            <Text style={styles.infoLine}>
              Teacher Name: {item.kid.schoolTeacherName}
            </Text>
          )}

          {(item.kid.schoolGrade || item.kid.schoolGradeDivision) && (
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeBadgeText}>
                Grade {item.kid.schoolGrade}
                {item.kid.schoolGradeDivision &&
                  ` – Division ${item.kid.schoolGradeDivision}`}
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            {!isChecked && !isAbsent && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionGreen]}
                  onPress={() => handleCheckIn(item)}
                >
                  <Text style={styles.btnText}>Check-in</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionRed]}
                  onPress={() => handleAbsent(item)}
                >
                  <Text style={styles.btnText}>Absent</Text>
                </TouchableOpacity>
              </>
            )}

            {isChecked && undoEnabled && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionRed]}
                onPress={() => handleUndoCheckIn(item)}
              >
                <Text style={styles.btnText}>Undo</Text>
              </TouchableOpacity>
            )}
            {isChecked && !undoEnabled && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#007bff" }]}
                onPress={() => console.log("Photo pressed!")}
              >
                <Text style={styles.btnText}>Photo</Text>
              </TouchableOpacity>
            )}
            {isAbsent && undoEnabled && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionRed]}
                onPress={() => handleUndoAbsent(item)}
              >
                <Text style={styles.btnText}>Undo Absent</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ marginTop: 50, alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading route...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        {kids.length > 0 && (
          <View>
            {assignedSchool && (
              <>
                <Text style={styles.headerText}>School for pickup</Text>
                <Text
                  style={[styles.headerText, { fontWeight: 600, marginTop: 5 }]}
                >
                  {assignedSchool}
                </Text>
              </>
            )}
            <Text style={[styles.headerText, { marginTop: 10 }]}>
              Kid{kids.length > 1 ? "s" : ""} at this school
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={kids}
        renderItem={renderKidItem}
        keyExtractor={(item) => item.kid.id}
        contentContainerStyle={{ padding: 10 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text>No assigned kids.</Text>
          </View>
        }
        // ListHeaderComponent={
        // }
      />
      {/* <FullScreenImage
        isVisible={fullscreenVisible}
        path={selectedPhoto}
        bucketName="profilePhotos"
        onClose={() => setFullscreenVisible(false)}
      /> */}
    </>
  );
};

export default HelperPickupScreen;
