import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from "react";
import { LogBox } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import AuthContextProvider from "./src/contexts/AuthContext";
import RouteContextProvider from "./src/contexts/RouteContext";
import RootNavigator from "./src/navigation";
import PushNotificationsContextProvider from "./src/contexts/PushNotificationsContext";
import BackgroundTasksProvider from "./src/contexts/BackgroundTaskContext";
import PicturesContextProvider from "./src/contexts/PicturesContext";
import KidsContextProvider from "./src/contexts/KidsContext";
import MessageContextProvider from "./src/contexts/MessageContext";
import StaffContextProvider from "./src/contexts/StaffContext";
import UsersContextProvider from "./src/contexts/UsersContext";
import FeedContextProvider from "./src/contexts/FeedContext";

LogBox.ignoreLogs(["NSLocation*UsageDescription"]);

function App() {
  useEffect(() => {
    return () => {
      TaskManager.unregisterAllTasksAsync();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <PushNotificationsContextProvider>
          <AuthContextProvider>
            <PicturesContextProvider>
              <UsersContextProvider>
                <KidsContextProvider>
                  <StaffContextProvider>
                    <FeedContextProvider>
                      <MessageContextProvider>
                        <RouteContextProvider>
                          <BackgroundTasksProvider>
                            <RootNavigator />
                          </BackgroundTasksProvider>
                        </RouteContextProvider>
                      </MessageContextProvider>
                    </FeedContextProvider>
                  </StaffContextProvider>
                </KidsContextProvider>
              </UsersContextProvider>
            </PicturesContextProvider>
          </AuthContextProvider>
        </PushNotificationsContextProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default App;
