import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import RemoteImage from "../../components/RemoteImage";
import { useRoutesContext } from "../../contexts/RoutesContext";
import { useUsersContext } from "../../contexts/UsersContext";
import api, { getActAs } from "../../lib/api";
import { usePendingActions } from "../../contexts/PendingActionsContext";
import { useFeedContext } from "../../contexts/FeedContext";
import OpenCamera from "../../components/OpenCamera";
import InfoModal from "../../components/InfoModal";
import FullScreenImage from "../../components/FullScreenImageModal";
import useKeepRoutesFresh, {
  useGoBackWhenRouteGone,
} from "../../lib/useKeepRoutesFresh";

import styles from "./styles";

const PickupCheckInScreen = ({ routeId: routeIdFromProps, onClose }) => {
  const navigation = useNavigation();
  // Opened as a screen, the id comes in the route; it can also be given as a prop
  const route = useRoute();
  const routeId = routeIdFromProps ?? route.params?.routeId;
  // When the driver arrives at a school where he picks up kids, only the kids of that school show
  // The routes are looked at again while this screen is open; if the manager re-opens the route, it says so
  useKeepRoutesFresh();
  const routeGone = useGoBackWhenRouteGone(routeId);
  const schoolId = route.params?.schoolId;

  const { routesData, loading } = useRoutesContext();
  const { dbUser } = useUsersContext();
  // The super admin may open a route AS somebody (test mode): then the routes are that person's
  const effectiveId = getActAs() || dbUser?.id;

  const [kids, setKids] = useState([]);
  const [assignedSchool, setAssignedSchool] = useState(null);
  const [localKidsState, setLocalKidsState] = useState({});
  const { addPendingAction, cancelPendingAction } = usePendingActions();
  const { createNewFeedForKid } = useFeedContext();
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [bucketName, setBucketName] = useState(null);
  const [pickupPhotoKidId, setPickupPhotoKidId] = useState([]);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [pickupPictureDone, setPickupPictureDone] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);

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
      // console.log({ routeId });
      if (!routeId || !routesData.length || !dbUser) return;

      const routeData = getRouteById(routeId);

      if (!routeData) {
        setKids([]); // the route is gone: no stale kids to tap
        return;
      }

      // find van where this helper or driver is assigned
      const myVan = routeData.vans.find(
        (v) =>
          v.driver_id === effectiveId || v.helper_ids?.includes(effectiveId),
      );

      if (!myVan) {
        setKids([]);
        return;
      }

      // Filter only kids assigned to THIS STAFF
      const assignedKids = myVan.kids.filter(
        (k) =>
          k.responsible_staff_id === effectiveId &&
          (!schoolId || k.school?.id === schoolId),
      );

      // console.log("assignedKids", assignedKids);

      // The API already sends the attendance of each kid (check-in / absence) with the route,
      // so there is nothing else to ask for
      const kidsWithAttendance = assignedKids;

      setKids(kidsWithAttendance);

      if (kidsWithAttendance.length > 0) {
        setAssignedSchool(kidsWithAttendance[0].school?.name || null);
      }

      // console.log("kids", kidsWithAttendance);
      // console.log("route Data", routeData);
      // console.log(routeId);
    };
    loadKids();
  }, [routeId, routesData, dbUser, schoolId]);

  useEffect(() => {
    if (kids.length === 0) return;

    // The screen looks again every few seconds: what is still waiting to be saved (the 5 seconds of
    // "Undo") is kept, and the rest is read again from the server
    setLocalKidsState((previous) => {
      const next = {};
      kids.forEach((k) => {
        const old = previous[k.kid.id];
        next[k.kid.id] =
          old && (old.pendingActionId || old.undoEnabled)
            ? old
            : {
                isChecked: k.attendance?.checked_in || false,
                isAbsent: k.attendance?.is_absent || false,
                undoEnabled: false,
                timer: null,
                pendingAction: null,
                attendanceId: k.attendanceId?.id || null,
                saved: false,
              };
      });
      return next;
    });
  }, [kids]);

  const isKidFinalized = (state) => {
    if (!state) return false;

    const isDone = state.isChecked || state.isAbsent;
    const noPending = !state.pendingActionId;
    const noUndo = !state.undoEnabled;

    return isDone && noPending && noUndo;
  };

  const isPickupCompleted =
    kids.length > 0 &&
    kids.every((item) => isKidFinalized(localKidsState[item.kid.id]));

  const pickupCompleted = useMemo(() => {
    if (!kids.length) return false;

    return kids.every((item) => {
      const state = localKidsState[item.kid.id];
      if (!state) return false;

      return (
        (state.isChecked || state.isAbsent) &&
        !state.pendingActionId &&
        !state.undoEnabled
      );
    });
  }, [kids, localKidsState]);

  const ListHeader = () => {
    if (!pickupCompleted) return null;

    return (
      <View style={styles.pickupDoneHeader}>
        <Text style={styles.pickupDoneText}>Pickup completed</Text>
        <Text style={styles.pickupDoneSubtext}>Waiting for driver arrival</Text>
      </View>
    );
  };

  const updateKidState = (kidId, newState) => {
    setLocalKidsState((prev) => ({
      ...prev,
      [kidId]: {
        ...prev[kidId],
        ...newState,
      },
    }));
  };

  const goToStudentFeed = (kidId) => {
    navigation.navigate("StudentProfile", { id: kidId, readOnly: true });
  };

  const handleCheckIn = (item) => {
    Alert.alert("Confirm Check-in", `Check in ${item.kid.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          const kidId = item.kid.id;

          // Immediate UI update
          updateKidState(kidId, {
            isChecked: true,
            isAbsent: false,
            undoEnabled: true,
            pendingActionId: null, // will set soon
          });

          // const routeData = getRouteById(routeId);

          // Create a pending action
          const id = addPendingAction({
            type: "checkin",
            entityId: kidId,
            delay: 5000,
            payload: {
              kidId,
              routeId,
              // vanId: routeData.vans[0].id,
              // date: routeData.date,
            },

            onExecute: async ({ payload }) => {
              console.log("⏳ Saving CHECK-IN...", payload);

              try {
                // The API saves the check-in AND the news for the family ("Picked up from school")
                await api.post(
                  `/my/routes/${payload.routeId}/kids/${payload.kidId}/check-in`,
                );
              } catch (error) {
                // It was not saved: the card goes back, and the person sees why
                updateKidState(kidId, {
                  isChecked: false,
                  undoEnabled: false,
                  pendingActionId: null,
                });
                Alert.alert(
                  "Check-in not saved",
                  error?.response?.data?.error || "Please try again.",
                );
              }
            },

            onFinish: () => {
              updateKidState(kidId, {
                undoEnabled: false,
                pendingActionId: null,
              });
            },
          });

          // Save the pending action ID in local state
          updateKidState(kidId, { pendingActionId: id });
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

          // Immediate UI update
          updateKidState(kidId, {
            isAbsent: true,
            isChecked: false,
            undoEnabled: true,
            pendingActionId: null,
          });

          // const routeData = getRouteById(routeId);

          const id = addPendingAction({
            type: "absent",
            entityId: kidId,
            delay: 5000,
            payload: {
              kidId,
              routeId,
              // vanId: routeData.vans[0].id,
              // date: routeData.date,
            },

            onExecute: async ({ payload }) => {
              console.log("⏳ Saving ABSENT...", payload);

              try {
                // The API saves the absence AND the news for the family ("Marked as absent")
                await api.post(
                  `/my/routes/${payload.routeId}/kids/${payload.kidId}/absent`,
                );
              } catch (error) {
                // It was not saved: the card goes back, and the person sees why
                updateKidState(kidId, {
                  isAbsent: false,
                  undoEnabled: false,
                  pendingActionId: null,
                });
                Alert.alert(
                  "Absence not saved",
                  error?.response?.data?.error || "Please try again.",
                );
              }
            },

            onFinish: () => {
              updateKidState(kidId, {
                undoEnabled: false,
                pendingActionId: null,
              });
            },
          });

          updateKidState(kidId, { pendingActionId: id });
        },
      },
    ]);
  };

  const handleImagePress = (image) => {
    if (!image) return;

    setSelectedImage(image);
    setFullScreenImageModal(true);
  };

  const closeFullScreenModal = () => {
    setFullScreenImageModal(false);
    setSelectedImage(null);
  };

  const handlePickupPhotoPress = (kidId) => {
    // console.log({ kidId });
    setCameraMode("photo");
    setBucketName("feedPhotos");
    setPickupPhotoKidId(kidId);
    setCallOpenCamera(true);
  };

  const handleSelectPhotoVideo = (paths, selectedKids, notes) => {
    // console.log({ paths, selectedKids, notes });
    const mediaType = cameraMode === "photo" ? "PHOTO" : "VIDEO";

    if (pickupPhotoKidId) {
      paths.forEach((path) => {
        createNewFeedForKid(pickupPhotoKidId, path, mediaType, notes);
      });
    }

    setShowPostConfirmation(true); // Show confirmation
    setPickupPictureDone(true);
  };

  const handleUndoCheckIn = (item) => {
    const kidId = item.kid.id;
    const state = localKidsState[kidId];

    if (!state?.undoEnabled) return;

    // 1️⃣ cancel pending FIRST
    if (state.pendingActionId) {
      cancelPendingAction(state.pendingActionId);
    }

    // 2️⃣ revert UI
    updateKidState(kidId, {
      isChecked: false,
      undoEnabled: false,
      pendingActionId: null,
      pendingAction: null,
      timer: null,
    });
  };

  const handleUndoAbsent = (item) => {
    const kidId = item.kid.id;
    const state = localKidsState[kidId];

    if (!state?.undoEnabled) return;

    if (state.pendingActionId) {
      cancelPendingAction(state.pendingActionId);
    }

    updateKidState(kidId, {
      isAbsent: false,
      undoEnabled: false,
      pendingActionId: null,
      pendingAction: null,
      timer: null,
    });
  };

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
        <Pressable
          onPress={() => {
            handleImagePress(item.kid.photo);
          }}
        >
          <RemoteImage
            bucketName="profilePhotos"
            path={item.kid.photo}
            name={item.kid.name}
            style={styles.avatar}
          />
        </Pressable>

        <View style={styles.infoContainer}>
          <Text style={styles.kidName}>{item.kid.name}</Text>

          {item.school.name && (
            <Text style={styles.infoLine}>{item.school.name}</Text>
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
                onPress={() => handlePickupPhotoPress(item.kid.id)}
              >
                <Text style={styles.btnText}>Pickup Photo</Text>
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

  // The manager re-opened the route (or it was removed): nothing to check in here until it is sent again
  if (routeGone) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}>
          This route was re-opened
        </Text>
        <Text style={{ marginTop: 8, textAlign: "center", color: "#6c757d" }}>
          The manager is changing it. You will get a notification when the new
          one is ready.
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 20,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 10,
            backgroundColor: "#007bff",
          }}
          onPress={() => navigation.navigate("PickupList")}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>
            Back to the list
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
              {kids.length > 1 ? "Children" : "Child"} at this school
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
        ListHeaderComponent={<ListHeader />}
      />
      <FullScreenImage
        isVisible={fullScreenImageModal}
        path={selectedImage}
        onClose={closeFullScreenModal}
        bucketName="profilePhotos"
      />
      <OpenCamera
        isVisible={callOpenCamera}
        //onPhotoTaken={handlePhotoTaken}
        onSelectOption={handleSelectPhotoVideo}
        onClose={() => setCallOpenCamera(false)}
        mode={cameraMode}
        bucketName={bucketName}
        tag={false}
      />
      <InfoModal
        isVisible={showPostConfirmation}
        onClose={() => setShowPostConfirmation(false)}
        infoItems={[
          { label: "Success!", value: "New activity successfully created" },
        ]}
        labelStyle={{ textAlign: "center" }}
      />
      {onClose && (
        <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
          <Text style={{ color: "blue" }}>Close</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default PickupCheckInScreen;
