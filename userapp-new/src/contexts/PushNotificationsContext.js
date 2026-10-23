// src/contexts/PushNotificationsContext.js
// The phone asks Expo for its "address" (the push token) and gives it to the API; the API is the one that sends
// the pushes (the child arrived, a new photo...). This provider must be INSIDE the login (AuthContext): it
// registers the phone for the person who is signed in. Tapping a push opens the news of that child.
import { createContext, useState, useEffect, useRef, useContext } from "react";
import { Platform, Linking, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import api from "../lib/api";
import { setPushToken } from "../lib/pushToken";
import { emitFamilyPush } from "../lib/pushEvents";

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
      getLastNotificationResponseAsync: async () => null,
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
          "Notifications are off",
          "Turn them on in the settings of the phone to know when your child arrives or when there is a new photo.",
          [
            {
              text: "Not now",
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

  // A tap on a push about a child: the news of that child open
  const openFromPush = (data) => {
    if (data?.type === "feed" && data.studentId) {
      emitFamilyPush();
      navigation.navigate("KidFeed", { kidId: data.studentId });
    } else if (data?.type === "message" && data.studentId) {
      emitFamilyPush();
      navigation.navigate("Chat", { kidId: data.studentId });
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Push received:", notification.request.content.title);
        // The app is open: the children and the news are looked at again right now
        const kind = notification.request.content.data?.type;
        if (kind === "feed" || kind === "message") {
          emitFamilyPush();
        }
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        openFromPush(response.notification.request.content.data);
      });

    // The app was closed and the person opened it by tapping a push
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          setTimeout(
            () => openFromPush(response.notification.request.content.data),
            600,
          );
        }
      })
      .catch(() => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <PushNotificationsContext.Provider
      value={{ expoToken, permissionMessage, registerForPushNotificationsAsync }}
    >
      {children}
    </PushNotificationsContext.Provider>
  );
};

export default PushNotificationsContextProvider;

export const usePushNotificationsContext = () =>
  useContext(PushNotificationsContext);
