import React from "react";
import { SimpleLineIcons, FontAwesome5 } from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import DropOffRouteScreen from "../screens/DropOffRouteScreen";
import CompleteProfileScreen from "../screens/CompleteProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RouteScreen from "../screens/RouteScreen";
import ChatUserScreen from "../screens/ChatUserScreen";
import CheckIn from "../screens/CheckIn";
import { useUsersContext } from "../contexts/UsersContext";
import CustomDrawerContent from "../components/CustomDrawerContent";

const Drawer = createDrawerNavigator();

const CustomHamburgerMenu = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ paddingLeft: 20 }}
    >
      <SimpleLineIcons name="menu" size={23} color="#fff" />
    </TouchableOpacity>
  );
};

const DrawerNavigator = ({ currentUserData }) => (
  <Drawer.Navigator
    drawerContent={(props) => (
      <CustomDrawerContent {...props} currentUserData={currentUserData} />
    )}
    screenOptions={{
      drawerStyle: {
        backgroundColor: "#fff",
        width: 190,
      },
      headerStyle: { backgroundColor: "#ff7276" },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "700",
        letterSpacing: "1.5",
      },
      drawerActiveTintColor: "blue",
      drawerLabelStyle: {
        color: "#111",
      },
      headerLeft: () => <CustomHamburgerMenu />,
    }}
  >
    <Drawer.Screen
      name="DropOff"
      options={{
        drawerLabel: "Drop off",
        title: "Drop off Route",
        drawerIcon: () => (
          <SimpleLineIcons name="home" size={20} color="#808080" />
        ),
      }}
      component={DropOffRouteScreen}
    />
    <Drawer.Screen
      name="Chat"
      options={{
        drawerLabel: "Chat",
        title: "Chat",
        drawerIcon: () => (
          <SimpleLineIcons name="bubbles" size={20} color="#808080" />
        ),
      }}
      component={ChatScreen}
    />
    <Drawer.Screen
      name="Profile"
      options={{
        drawerLabel: "Profile",
        title: "Profile",
        drawerIcon: () => (
          <FontAwesome5 name="user" size={20} color="#808080" />
        ),
      }}
      component={ProfileScreen}
    />
    <Drawer.Screen
      name="Route"
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
      }}
      component={RouteScreen}
    />
    <Drawer.Screen
      name="ChatUser"
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
      }}
      component={ChatUserScreen}
    />
    <Drawer.Screen
      name="CheckIn"
      options={{
        drawerLabel: "Check In",
        title: "Check In",
        drawerIcon: () => (
          <SimpleLineIcons name="check" size={20} color="#808080" />
        ),
      }}
      component={CheckIn}
    />
  </Drawer.Navigator>
);

const RootNavigator = () => {
  const { dbUser, currentUserData } = useUsersContext();

  return dbUser ? (
    <DrawerNavigator currentUserData={currentUserData} />
  ) : (
    <CompleteProfileScreen />
  );
};

export default RootNavigator;
