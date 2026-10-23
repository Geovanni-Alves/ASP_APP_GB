// The app of the parents. The pieces are added step by step.
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import AuthContextProvider from "./src/contexts/AuthContext";
import PushNotificationsContextProvider from "./src/contexts/PushNotificationsContext";
import { KidsContextProvider } from "./src/contexts/KidsContext";
import RootNavigator from "./src/navigation";

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
                <KidsContextProvider>
                  <RootNavigator />
                </KidsContextProvider>
              </PushNotificationsContextProvider>
            </AuthContextProvider>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
