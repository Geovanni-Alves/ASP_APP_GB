// The app of the parents. The pieces are added step by step.
import React from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import AuthContextProvider from "./src/contexts/AuthContext";
import PushNotificationsContextProvider from "./src/contexts/PushNotificationsContext";
import { ProfileContextProvider } from "./src/contexts/ProfileContext";
import { KidsContextProvider } from "./src/contexts/KidsContext";
import { MessagesContextProvider } from "./src/contexts/MessagesContext";
import RootNavigator from "./src/navigation";

// The app is light: a phone in dark mode does not change it
Appearance.setColorScheme("light");

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer>
            {/* Without a session the login screen shows by itself; with one, the app.
                The push provider is INSIDE the login: it registers the phone for the person who signed in. */}
            <AuthContextProvider>
              <PushNotificationsContextProvider>
                <ProfileContextProvider>
                  <KidsContextProvider>
                    <MessagesContextProvider>
                      <RootNavigator />
                    </MessagesContextProvider>
                  </KidsContextProvider>
                </ProfileContextProvider>
              </PushNotificationsContextProvider>
            </AuthContextProvider>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
