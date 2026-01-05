import React from "react";
import { SimpleLineIcons, FontAwesome5 } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { useUsersContext } from "../contexts/UsersContext";
import DropOffListScreen from "../screens/DropOffListScreen";
import DropOffRouteScreen from "../screens/DropOffRouteScreen";
import CompleteProfileScreen from "../screens/CompleteProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChatUserScreen from "../screens/ChatUserScreen";
import HomeScreen from "../screens/HomeScreen";
import StudentScreen from "../screens/StudentScreen";
import StudentFeedScreen from "../screens/StudentFeedScreen";
import StudentProfileScreen from "../screens/StudentProfileScreen";
import AddAddressScreen from "../screens/AddAddressScreen";
import AddressListScreen from "../screens/AddressListScreen";
import NewActivityScreen from "../screens/NewActivityScreen";
import IncidentsScreen from "../screens/IncidentsScreen";
import StudentSelectionScreen from "../screens/StudentSelectionScreen";
import PromotionScreen from "../screens/PromotionScreen";
import PickupListScreen from "../screens/PickupListScreen";
// import HelperPickupScreen from "../screens/PickupListScreen/PickupCheckInScreen";
import PickupCheckInScreen from "../screens/PickupListScreen/PickupCheckInScreen";
import DriverPickupScreen from "../screens/PickupListScreen/DriverPickupScreen";

const Drawer = createDrawerNavigator();

const CustomHamburgerMenu = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ paddingLeft: 20 }}
    >
      <SimpleLineIcons name="menu" size={23} color="gray" />
    </TouchableOpacity>
  );
};

const CustomBackButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={{ paddingLeft: 20, flexDirection: "row", alignItems: "center" }}
      onPress={() => navigation.goBack()}
    >
      <SimpleLineIcons name="arrow-left" size={20} color="gray" />
      {/* <Text style={{ marginLeft: 5, color: "gray" }}>Back</Text> */}
    </TouchableOpacity>
  );
};

const PickupCheckInScreenWrapper = ({ route }) => {
  return <PickupCheckInScreen routeId={route.params.routeId} />;
};

const DrawerNavigator = ({ currentUserData }) => (
  <Drawer.Navigator
    drawerContent={(props) => (
      <CustomDrawerContent {...props} currentUserData={currentUserData} />
    )}
    backBehavior="history"
    screenOptions={{
      drawerType: "front",
      swipeEdgeWidth: 50,
      drawerStyle: {
        backgroundColor: "#fff",
        width: 190,
      },
      headerStyle: { backgroundColor: "#FFD54F" },
      headerTintColor: "gray",
      headerTitleStyle: {
        fontWeight: "700",
        // letterSpacing: "1.5",
      },
      drawerActiveTintColor: "blue",
      drawerLabelStyle: {
        color: "#111",
      },
      headerLeft: () => <CustomHamburgerMenu />,
    }}
  >
    <Drawer.Screen
      name="Home"
      options={{
        drawerLabel: "Home",
        title: "Home Screen",
        drawerIcon: () => (
          <SimpleLineIcons name="home" size={20} color="#808080" />
        ),
      }}
      component={HomeScreen}
    />
    <Drawer.Screen
      name="PickupList"
      options={{
        drawerLabel: "Pickup",
        title: "Pickup List",
        drawerIcon: () => <FontAwesome name="bus" size={20} color="#808080" />,
        headerLeft: () => <CustomBackButton />,
      }}
      component={PickupListScreen}
    />
    <Drawer.Screen
      name="DropOffList"
      options={{
        drawerLabel: "Drop off",
        title: "Drop off List",
        drawerIcon: () => <FontAwesome name="bus" size={20} color="#808080" />,
        headerLeft: () => <CustomBackButton />,
      }}
      component={DropOffListScreen}
    />
    <Drawer.Screen
      name="Chat"
      options={{
        drawerLabel: "Chat",
        title: "Chat",
        drawerIcon: () => (
          <SimpleLineIcons name="bubbles" size={20} color="#808080" />
        ),
        headerLeft: () => <CustomBackButton />,
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
        headerLeft: () => <CustomBackButton />,
      }}
      component={ProfileScreen}
    />

    {/* <Drawer.Screen
      name="CheckIn"
      options={{
        drawerLabel: "Check In",
        title: "Check In",
        drawerIcon: () => (
          <SimpleLineIcons name="check" size={20} color="#808080" />
        ),
        headerLeft: () => <CustomBackButton />,
      }}
      component={CheckInScreen}
    /> */}
    <Drawer.Screen
      name="Students"
      options={{
        drawerLabel: "Students",
        title: "Students",
        drawerIcon: () => (
          <FontAwesome name="child" size={20} color="#808080" />
        ),
        headerLeft: () => <CustomBackButton />,
      }}
      component={StudentScreen}
    />
    <Drawer.Screen
      name="DropOffRoute"
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
      component={DropOffRouteScreen}
    />
    <Drawer.Screen
      name="ChatUser"
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
      component={ChatUserScreen}
    />
    <Drawer.Screen
      name="StudentFeed"
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
      component={StudentFeedScreen}
    />
    <Drawer.Screen
      name="StudentProfile"
      component={StudentProfileScreen}
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="AddAddress"
      component={AddAddressScreen}
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="AddressList"
      component={AddressListScreen}
      options={{
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="Activities"
      component={NewActivityScreen}
      options={{
        title: "Activities",
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="Incidents"
      component={IncidentsScreen}
      options={{
        title: "Incidents",
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="StudentSelection"
      component={StudentSelectionScreen}
      options={{
        title: "Select Students",
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="Promotions"
      component={PromotionScreen}
      options={{
        title: "Promotions Screen",
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="PickupCheckInScreen"
      component={PickupCheckInScreenWrapper}
      options={{
        title: "Check In Route Screen",
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
    />
    <Drawer.Screen
      name="DriverPickupScreen"
      component={DriverPickupScreen}
      options={{
        title: "Driver Route Screen",
        drawerItemStyle: { display: "none" },
        headerShown: true,
        headerLeft: () => <CustomBackButton />,
      }}
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
