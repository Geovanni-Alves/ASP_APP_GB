import { createContext, useState, useEffect, useRef, useContext } from "react";
import { Platform, Linking, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

const SUPABASE_PUSH_URL = process.env.EXPO_PUBLIC_SUPABASE_PUSH_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

const PushNotificationsContext = createContext({});

const PushNotificationsContextProvider = ({ children }) => {
  // Handle foreground notifications
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const [expoToken, setExpoToken] = useState(null); // iOS
  const [fcmToken, setFcmToken] = useState(null); // Android
  const [deviceType, setDeviceType] = useState(null); // "ios" | "android"
  const [permissionMessage, setPermissionMessage] = useState(false);

  const notificationListener = useRef();
  const responseListener = useRef();
  const navigation = useNavigation();

  // ----------------------------------------------------------
  //  SEND NOTIFICATION → iOS (Expo) | Android (Supabase Edge)
  // ----------------------------------------------------------

  async function sendNotification({ token, device, title, body }) {
    console.log("🔔 Sending push to:", token, "device:", device);

    // ---------------------- iOS (Expo Push)
    if (device === "ios") {
      return fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "default",
          title,
          body,
        }),
      });
    }

    // ---------------------- Android (Supabase Edge Function)
    const { data, error } = await supabase.functions.invoke("sendPushV2", {
      body: {
        token,
        title,
        body,
      },
    });

    if (error) {
      console.log("❌ invoke error:", error);
      throw error;
    }

    console.log("✅ Push sent successfully:", data);
    return data; // ✅ NÃO res
  }

  // async function sendNotification({ token, device, title, body, data }) {
  //   console.log("🔔 Sending push to:", token, "device:", device);

  //   // ---------------------- iOS (Expo Push API)
  //   if (device === "ios") {
  //     const message = {
  //       to: token,
  //       sound: "default",
  //       title,
  //       body,
  //       data,
  //     };

  //     return fetch("https://exp.host/--/api/v2/push/send", {
  //       method: "POST",
  //       headers: {
  //         Accept: "application/json",
  //         "Accept-Encoding": "gzip, deflate",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(message),
  //     });
  //   }
  //   // ANDROID → Supabase Edge Function
  //   // const { data: res, error } = await supabase.functions.invoke("sendPush", {
  //   //   body: {
  //   //     token,
  //   //     title,
  //   //     body,
  //   //     data,
  //   //   },
  //   // });

  //   // if (error) {
  //   //   console.log("❌ error:", error);
  //   //   console.log("❌ error context:", error.context);
  //   //   console.log("❌ error message:", error.message);
  //   //   throw error;
  //   // }

  //   const { data: payLoad, error } = await supabase.functions.invoke(
  //     "sendPushV2",
  //     {
  //       body: {
  //         token: fcmToken,
  //         title: "Test",
  //         body: "Test",
  //       },
  //     }
  //   );

  //   if (error) {
  //     console.log("❌ invoke error:", error);

  //     // 👇 ISSO É A CHAVE
  //     const response = error.context?.response;
  //     if (response) {
  //       const text = await response.text();
  //       console.log("❌ Edge Function raw response:", text);
  //     }

  //     throw error;
  //   }

  //   console.log("✅ success:", data);

  //   return res;
  // }

  // ----------------------------------------------------------
  //  SEND NOTIFICATION → Works for BOTH iOS and Android
  // ----------------------------------------------------------
  // async function sendNotification({ token, device, title, body, data }) {
  //   console.log("🔔 Sending push to:", token, "device:", device);

  //   if (device === "ios") {
  //     // ---------------------- iOS (Expo Push API)
  //     const message = {
  //       to: token,
  //       sound: "default",
  //       title,
  //       body,
  //       data,
  //     };

  //     return fetch("https://exp.host/--/api/v2/push/send", {
  //       method: "POST",
  //       headers: {
  //         Accept: "application/json",
  //         "Accept-encoding": "gzip, deflate",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(message),
  //     });
  //   }

  //   // ---------------------- Android (FCM HTTP v1 API)
  //   const FIREBASE_SERVER_KEY = process.env.EXPO_PUBLIC_FCM_SERVER_KEY;

  //   if (!FIREBASE_SERVER_KEY) {
  //     console.warn("❌ Missing FCM server key");
  //     return;
  //   }

  //   const androidMessage = {
  //     message: {
  //       token: token,
  //       notification: { title, body },
  //       data: data || {},
  //     },
  //   };

  //   return fetch(
  //     "https://fcm.googleapis.com/v1/projects/YOUR_FIREBASE_PROJECT_ID/messages:send",
  //     {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${FIREBASE_SERVER_KEY}`,
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(androidMessage),
  //     }
  //   );
  // }

  // ----------------------------------------------------------
  //  REGISTER DEVICE FOR PUSH TOKENS
  // ----------------------------------------------------------
  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
      alert("Must use a physical device for push notifications");
      return null;
    }

    // Ask permission
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
        "Please enable notifications in device settings.",
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
        ]
      );
      return null;
    }

    // PLATFORM-SPECIFIC TOKEN
    let tokenValue = null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });

      const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
      console.log("📱 ANDROID FCM TOKEN:", fcmToken);

      tokenValue = fcmToken;
      setDeviceType("android");
      setFcmToken(tokenValue);
    } else {
      const { data: expoToken } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      });
      console.log("🍎 IOS EXPO TOKEN:", expoToken);

      tokenValue = expoToken;
      setExpoToken(tokenValue);
      setDeviceType("ios");
    }

    return tokenValue;
  }

  // ----------------------------------------------------------
  //  LISTENERS (foreground + tap/open)
  // ----------------------------------------------------------
  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📩 NOTIFICATION RECEIVED:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { data } = response.notification.request.content;
        if (data?.kidID) {
          navigation.navigate("ChatUser", { id: data.kidID });
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // useEffect(() => {
  //   if (!fcmToken) return;
  //   if (deviceType !== "android") return;

  //   console.log("🧪 TEST PUSH (context)");
  //   console.log("🔑 FCM Token:", fcmToken);
  //   console.log("🌐 Push URL:", SUPABASE_PUSH_URL);

  //   sendNotification({
  //     token: fcmToken,
  //     device: "android",
  //     title: "🚀 Push Test",
  //     body: "Push sended from PushNotificationsContext",
  //     data: { source: "context_test" },
  //   })
  //     .then((data) => {
  //       console.log("✅ Push response data:", data);
  //     })

  //     .catch((err) => {
  //       console.error("❌ Push test error:", err);
  //     });
  // }, [fcmToken, deviceType]);

  return (
    <PushNotificationsContext.Provider
      value={{
        expoToken,
        fcmToken,
        deviceType,
        permissionMessage,
        sendNotification, // Now supports BOTH platforms
        registerForPushNotificationsAsync,
      }}
    >
      {children}
    </PushNotificationsContext.Provider>
  );
};

export default PushNotificationsContextProvider;

export const usePushNotificationsContext = () =>
  useContext(PushNotificationsContext);
