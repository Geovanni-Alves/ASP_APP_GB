//import 'core-js/full/symbol/async-iterator';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from "react";
import { LogBox, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { withAuthenticator } from "@aws-amplify/ui-react-native";
import AuthContextProvider from "./src/contexts/AuthContext";
import RouteContextProvider from "./src/contexts/RouteContext";
import RootNavigator from "./src/navigation";
import PushNotificationsContextProvider from "./src/contexts/PushNotificationsContext";
import BackgroundTasksProvider from "./src/contexts/BackgroundTaskContext";
import PicturesContextProvider from "./src/contexts/PicturesContext";
import KidsContextProvider from "./src/contexts/KidsContext";
import MessageContextProvider from "./src/contexts/MessageContext";
import StaffContextProvider from "./src/contexts/StaffContext";

// Aws Amplify config
import { Amplify } from "aws-amplify";
import awsExports from "./src/aws-exports";
Amplify.configure(awsExports);

LogBox.ignoreLogs(["NSLocation*UsageDescription"]);

function App() {
  useEffect(() => {
    return () => {
      TaskManager.unregisterAllTasksAsync();
    };
  }, []);

  return (
    <NavigationContainer>
      <PushNotificationsContextProvider>
        <PicturesContextProvider>
          <AuthContextProvider>
            <KidsContextProvider>
              <StaffContextProvider>
                <MessageContextProvider>
                  <RouteContextProvider>
                    <BackgroundTasksProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <RootNavigator />
                      </GestureHandlerRootView>
                    </BackgroundTasksProvider>
                  </RouteContextProvider>
                </MessageContextProvider>
              </StaffContextProvider>
            </KidsContextProvider>
          </AuthContextProvider>
        </PicturesContextProvider>
      </PushNotificationsContextProvider>
    </NavigationContainer>
  );
}

export default withAuthenticator(App);
