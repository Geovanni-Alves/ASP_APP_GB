import React, { useEffect, useState } from "react";
import {
  SimpleLineIcons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { supabase } from "../lib/supabase";
import Auth from "../components/Auth";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text, Button } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import DropOffRouteScreen from "../screens/DropOffRouteScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WaitingScreen from "../screens/WaitingScreen";
import ChatScreen from "../screens/ChatScreen";
import ChatUserScreen from "../screens/ChatUserScreen";
import GalleryScreen from "../screens/GalleryScreen";
import FeedScreen from "../screens/FeedScreen";
import KidProfileScreen from "../screens/KidProfileScreen";
import NotStudentScreen from "../screens/NotStudentScreen";
import { useAuthContext } from "../contexts/AuthContext";
import { useRouteContext } from "../contexts/RouteContext";
import { useUsersContext } from "../contexts/UsersContext";
import { useKidsContext } from "../contexts/KidsContext";

const RootNavigator = () => {
  const { session, loading } = useAuthContext();
  const { dbUser, currentUserData } = useUsersContext();
  const { isRouteInProgress } = useRouteContext();
  const { noKids } = useKidsContext();

  //console.log(noKids);

  const Stack = createNativeStackNavigator();
  const Drawer = createDrawerNavigator();

  const DrawerNav = () => {
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
            fontWeight: "bold",
          },
          drawerActiveTintColor: "blue",
          drawerLabelStyle: {
            color: "#111",
          },
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
          name="Gallery"
          options={{
            drawerLabel: "Gallery",
            title: "Kid Gallery",
            drawerIcon: () => (
              <MaterialCommunityIcons
                name="view-gallery"
                size={20}
                color="#808080"
              />
            ),
          }}
          component={GalleryScreen}
        />
      </Drawer.Navigator>
    );
  };

  const StackNav = () => {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {noKids ? (
          <Stack.Screen name="NotStudent" component={NotStudentScreen} />
        ) : (
          <>
            {dbUser ? (
              <Stack.Screen name="DrawerNav" component={DrawerNav} />
            ) : (
              <Stack.Screen name="ParentLogin" component={ProfileScreen} />
            )}
            <Stack.Screen name="Wait" component={WaitingScreen} />
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="ChatUser" component={ChatUserScreen} />
            <Stack.Screen name="KidProfile" component={KidProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="gray" />;
  }

  if (!session) {
    console.log(session);
    return <Auth />;
  }

  return <StackNav />;
};

export default RootNavigator;
