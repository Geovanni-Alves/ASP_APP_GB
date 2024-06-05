import RootNavigator from "./src/navigation";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import PushNotificationsContextProvider from "./src/contexts/PushNotificationsContext";
import AuthContextProvider from "./src/contexts/AuthContext";
import UsersContextProvider from "./src/contexts/UsersContext";
import KidsContextProvider from "./src/contexts/KidsContext";
import RouteContextProvider from "./src/contexts/RouteContext";
import PicturesContextProvider from "./src/contexts/PicturesContext";
import MessageContextProvider from "./src/contexts/MessageContext";
import StaffContextProvider from "./src/contexts/StaffContext";
import FeedContextProvider from "./src/contexts/FeedContext";

// Supabase
// import { supabase } from "./backend/lib/supabase";

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <PushNotificationsContextProvider>
          <AuthContextProvider>
            <PicturesContextProvider>
              <UsersContextProvider>
                <KidsContextProvider>
                  <RouteContextProvider>
                    <MessageContextProvider>
                      <StaffContextProvider>
                        <FeedContextProvider>
                          <PaperProvider>
                            <RootNavigator />
                          </PaperProvider>
                        </FeedContextProvider>
                      </StaffContextProvider>
                    </MessageContextProvider>
                  </RouteContextProvider>
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
