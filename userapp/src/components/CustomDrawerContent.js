import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import React, { useState } from "react";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import { Auth } from "aws-amplify";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import ConfirmationModal from "./ConfirmationModal";
//import User from "../../assets/user.jpeg";

export default function CustomDrawerContent(props) {
  const { currentUserData } = props;
  const [isConfirmationModalVisible, setConfirmationModalVisible] =
    useState(false);

  const handleLogout = async () => {
    setConfirmationModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      // Sign out the user using Amplify Auth
      await Auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setConfirmationModalVisible(false);
    }
  };

  const cancelLogout = () => {
    setConfirmationModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.userContent}>
        <Image
          source={{ uri: currentUserData?.uriUser }}
          style={styles.userPic}
        ></Image>
        <Text style={styles.userName}>{currentUserData?.name}</Text>
      </View>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <MaterialCommunityIcons name="logout" size={24} color="black" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>

      <ConfirmationModal
        isVisible={isConfirmationModalVisible}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        questionText={"Are you sure you want to logout?"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  logoutButtonText: {
    marginLeft: 10,
    fontSize: 16,
  },
  userContent: {
    height: 200,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderBottomColor: "#f4f4f4",
    borderBottomWidth: 1,
  },
  userPic: {
    height: 130,
    width: 130,
    borderRadius: 65,
  },
  userName: {
    fontSize: 22,
    marginVertical: 6,
    fontWeight: "bold",
    color: "#111",
  },
});
