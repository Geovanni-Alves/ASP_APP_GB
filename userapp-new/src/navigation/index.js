// src/navigation/index.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import KidFeedScreen from "../screens/KidFeedScreen";
import ChatScreen from "../screens/ChatScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
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
