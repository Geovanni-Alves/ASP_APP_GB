//import 'core-js/full/symbol/async-iterator';
//import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
//import { Auth } from "aws-amplify";
import {
  withAuthenticator,
  Authenticator,
  useTheme,
  ThemeProvider,
} from "@aws-amplify/ui-react-native";
import AuthContextProvider from "./src/contexts/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import PushNotificationsContextProvider from "./src/contexts/PushNotificationsContext";
import { PaperProvider } from "react-native-paper";
import CustomHeader from "./src/layout/CustomHeader";
import CustomFooter from "./src/layout/CustomFooter";
import getTheme from "./src/layout/CustomTheme";
import RouteContextProvider from "./src/contexts/RouteContext";
import PicturesContextProvider from "./src/contexts/PicturesContext";
import MessageContextProvider from "./src/contexts/MessageContext";
import StaffContextProvider from "./src/contexts/StaffContext";
import FeedContextProvider from "./src/contexts/FeedContext";
import KidsContextProvider from "./src/contexts/KidsContext";

// Aws Amplify config
import { Amplify } from "aws-amplify";
import awsExports from "./src/aws-exports";
Amplify.configure(awsExports);
const Stack = createStackNavigator();

function App() {
  const {
    tokens: { colors },
  } = useTheme();
  const myTheme = getTheme();
  return (
    <NavigationContainer>
      <ThemeProvider theme={myTheme}>
        <Authenticator.Provider>
          <Authenticator
            Header={CustomHeader}
            Footer={CustomFooter}
            //Container={(props) => <Authenticator.Container {...props} />}
          >
            <PushNotificationsContextProvider>
              <PicturesContextProvider>
                <AuthContextProvider>
                  <KidsContextProvider>
                    <StaffContextProvider>
                      <MessageContextProvider>
                        <RouteContextProvider>
                          <FeedContextProvider>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                              <PaperProvider>
                                <RootNavigator />
                              </PaperProvider>
                            </GestureHandlerRootView>
                          </FeedContextProvider>
                        </RouteContextProvider>
                      </MessageContextProvider>
                    </StaffContextProvider>
                  </KidsContextProvider>
                </AuthContextProvider>
              </PicturesContextProvider>
            </PushNotificationsContextProvider>
          </Authenticator>
        </Authenticator.Provider>
      </ThemeProvider>
    </NavigationContainer>
  );
}

export default App;
