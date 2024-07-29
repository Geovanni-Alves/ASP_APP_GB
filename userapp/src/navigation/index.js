import {
  SimpleLineIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import HomeScreen from "../screens/HomeScreen";
import DropOffRouteScreen from "../screens/DropOffRouteScreen";
import WaitingScreen from "../screens/WaitingScreen";
import ChatScreen from "../screens/ChatScreen";
import ChatUserScreen from "../screens/ChatUserScreen";
import GalleryScreen from "../screens/GalleryScreen";
import FeedScreen from "../screens/FeedScreen";
import AddAddressScreen from "../screens/AddAddressScreen";
import AddressListScreen from "../screens/AddressListScreen";
import KidProfileScreen from "../screens/KidProfileScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useRouteContext } from "../contexts/RouteContext";
import { useUsersContext } from "../contexts/UsersContext";

const RootNavigator = () => {
  const { currentUserData } = useUsersContext();
  const { isRouteInProgress } = useRouteContext();

  const Drawer = createDrawerNavigator();

  const CustomHamburgerMenu = () => {
    const navigation = useNavigation();
    return (
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ paddingLeft: 20 }}
      >
        <SimpleLineIcons name="menu" size={23} color="#fff" left={-5} />
      </TouchableOpacity>
    );
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent {...props} currentUserData={currentUserData} />
      )}
      screenOptions={{
        drawerStyle: {
          backgroundColor: "#fff",
          width: 190,
        },
        headerStyle: {
          backgroundColor: "#FF7276",
        },
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
        name="Home"
        options={{
          drawerLabel: "Home",
          title: "Home",
          drawerIcon: () => (
            <SimpleLineIcons name="home" size={20} color="#808080" />
          ),
        }}
        component={HomeScreen}
      />
      <Drawer.Screen
        name="Chat"
        options={{
          drawerLabel: "Chat",
          title: "Chat",
          drawerIcon: () => (
            <SimpleLineIcons name="people" size={20} color="#808080" />
          ),
        }}
        component={ChatScreen}
      />
      <Drawer.Screen
        name={isRouteInProgress ? "DropOffRoute" : "Wait"}
        options={{
          drawerLabel: "Drop-Off",
          title: "Drop Off",
          drawerIcon: () => (
            <FontAwesome5 name="bus" size={20} color="#808080" />
          ),
        }}
        component={isRouteInProgress ? DropOffRouteScreen : WaitingScreen}
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
        name="Feed"
        options={{
          drawerItemStyle: { display: "none" },
          headerShown: true,
        }}
        component={FeedScreen}
      />
      <Drawer.Screen
        name="ChatUser"
        component={ChatUserScreen}
        options={{
          drawerItemStyle: { display: "none" },
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="KidProfile"
        component={KidProfileScreen}
        options={{
          drawerItemStyle: { display: "none" },
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="AddAddress"
        component={AddAddressScreen}
        options={{
          drawerItemStyle: { display: "none" },
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="AddressList"
        component={AddressListScreen}
        options={{
          drawerItemStyle: { display: "none" },
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          drawerItemStyle: { display: "none" },
          headerShown: true,
          //drawerLabel: "Gallery",
          //title: "Kid Gallery",
          // drawerIcon: () => (
          //   <MaterialCommunityIcons
          //     name="view-gallery"
          //     size={20}
          //     color="#808080"
          //   />
          // ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default RootNavigator;
