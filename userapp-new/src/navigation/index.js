// src/navigation/index.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import KidFeedScreen from "../screens/KidFeedScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CompleteProfileScreen from "../screens/CompleteProfileScreen";
import CustomLoading from "../components/CustomLoading";
import { useProfileContext } from "../contexts/ProfileContext";
import { View } from "react-native";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { profile, loading } = useProfileContext();

  // The first access: the profile is completed before the app opens
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <CustomLoading imageSize={50} showContainer={false} />
      </View>
    );
  }
  if (profile?.firstLogin) {
    return <CompleteProfileScreen />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KidFeed"
        component={KidFeedScreen}
        options={({ route }) => ({
          title: route.params?.name || "Updates",
          headerBackTitle: "Back",
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "My profile", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.name || "Messages",
          headerBackTitle: "Back",
        })}
      />
    </Stack.Navigator>
  );
}
