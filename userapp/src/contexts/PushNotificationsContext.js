import { createContext, useState, useEffect, useRef, useContext } from "react";
import { Platform, Linking, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

const PushNotificationsContext = createContext({});

const PushNotificationsContextProvider = ({ children }) => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const [expoPushToken, setExpoPushToken] = useState("");
  //const [notification, setNotification] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigation = useNavigation();

  async function sendPushNotification(expoPushToken, title, body, data) {
    const message = {
      to: expoPushToken,
      sound: "default",
      title: title,
      body: body,
      data: data,
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  }

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();

        if (status !== "granted") {
          setPermissionMessage(true);
          // The user denied permission, show a confirmation dialog
          Alert.alert(
            "Permission Required",
            "To receive route updates, enable push notifications for this app in your device settings.",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: async () => {
                  setPermissionMessage(false);
                },
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

          return;
        }
      }

      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      });
      //console.log("token", token);
    } else {
      alert("Must use a physical device for Push Notifications");
      return;
    }

    // Check if the user has granted push notification permissions
    // if (token) {
    //   alert(
    //     "Push notifications enabled! You'll receive updates on route uploads."
    //   );
    // }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token)
    );
    // notificationListener.current =
    //   Notifications.addNotificationReceivedListener((notification) => {
    //     //console.log("listener notication", notification);
    //     setNotification(notification);
    //   });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Handle notification response

        // Extract data from the notification
        const { notification } = response;
        const { data } = notification.request.content;
        //console.log("response", data.kidID);
        // Assuming the notification contains information about the chat
        // Navigate to the chat screen passing necessary data

        //navigation.navigate("ChatUser", { id: user.id });
        if (data.kidID) {
          navigation.navigate("ChatUser", { id: data.kidID });
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <PushNotificationsContext.Provider
      value={{
        registerForPushNotificationsAsync,
        sendPushNotification,
        expoPushToken,
        permissionMessage,
      }}
    >
      {children}
    </PushNotificationsContext.Provider>
  );
};

export default PushNotificationsContextProvider;

export const usePushNotificationsContext = () =>
  useContext(PushNotificationsContext);
