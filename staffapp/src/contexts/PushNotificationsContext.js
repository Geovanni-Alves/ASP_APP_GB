// src/contexts/PushNotificationsContext.js
// The phone asks Expo for its "address" (the push token) and gives it to the API; the API is the one that
// sends the pushes (a new route, a check-in...). This provider must be INSIDE the login (AuthContext): it
// registers the phone for the person who is signed in.
import { createContext, useState, useEffect, useRef, useContext } from "react";
import { Platform, Linking, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import api from "../lib/api";
import { setPushToken } from "../lib/pushToken";
import { emitRoutePush } from "../lib/pushEvents";

// Expo Go on Android has no remote push since SDK 53 (loading the package there fails): there the push
// does nothing. On the iPhone, Expo Go still receives them. Development builds and the real app: always.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const pushUnavailable = isExpoGo && Platform.OS === "android";

const Notifications = pushUnavailable
  ? {
      setNotificationHandler: () => {},
      addNotificationReceivedListener: () => ({ remove() {} }),
      addNotificationResponseReceivedListener: () => ({ remove() {} }),
    }
  : require("expo-notifications");

// How a push looks when it arrives with the app open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PushNotificationsContext = createContext({});

const PushNotificationsContextProvider = ({ children }) => {
  const [expoToken, setExpoToken] = useState(null);
  const [permissionMessage, setPermissionMessage] = useState(false);

  const notificationListener = useRef();
  const responseListener = useRef();
  const navigation = useNavigation();

  // Asks for the permission, gets the token of this phone and gives it to the API
  async function registerForPushNotificationsAsync() {
    if (pushUnavailable) return null;
    if (!Device.isDevice) return null; // an emulator has no push

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setPermissionMessage(true);
        Alert.alert(
          "Permission Required",
          "Please enable notifications in the settings of the phone.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setPermissionMessage(false),
            },
            {
              text: "Open Settings",
              onPress: async () => {
                await Linking.openSettings();
                setPermissionMessage(false);
              },
            },
          ],
        );
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      console.log("Push token:", token);

      await api.post("/push/register", { token, platform: Platform.OS });
      setPushToken(token);
      setExpoToken(token);
      return token;
    } catch (error) {
      console.log(
        "Could not register for push:",
        error?.response?.data || error.message,
      );
      return null;
    }
  }

  // A test push to the phones of the person who is signed in (now, or later to lock the phone first)
  async function sendTestPush(delaySeconds = 0) {
    try {
      const { data } = await api.post("/push/test", { delaySeconds });
      if (!data.tokens) {
        Alert.alert(
          "Test push",
          "This phone has no push address yet. Allow the notifications and open the app again.",
        );
        return;
      }
      if (data.scheduled_in_seconds) {
        Alert.alert(
          "Test push",
          `It will arrive in ${data.scheduled_in_seconds} seconds. Lock the phone now.`,
        );
        return;
      }
      Alert.alert(
        "Test push",
        `Sent to ${data.sent} of ${data.tokens} phone(s).` +
          (data.problems?.length ? `\n\n${data.problems.join("\n")}` : ""),
      );
    } catch (error) {
      Alert.alert(
        "Test push failed",
        error?.response?.data?.error || error.message,
      );
    }
  }

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Push received:", notification.request.content.title);
        // A push about a route (sent, changed, re-opened): the routes are looked at again right now
        if (notification.request.content.data?.type === "route") {
          emitRoutePush();
        }
      });

    // The person taps the push: the app goes to the right place
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "route") {
          emitRoutePush();
          navigation.navigate("PickupList");
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <PushNotificationsContext.Provider
      value={{
        expoToken,
        permissionMessage,
        registerForPushNotificationsAsync,
        sendTestPush,
      }}
    >
      {children}
    </PushNotificationsContext.Provider>
  );
};

export default PushNotificationsContextProvider;

export const usePushNotificationsContext = () =>
  useContext(PushNotificationsContext);
