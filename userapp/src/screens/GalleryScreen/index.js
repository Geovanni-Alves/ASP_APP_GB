import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import styles from "./styles";
//import SideDrawer from "../SideDrawer/SideDrawer";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const GalleryScreen = () => {
  //const [isSideDrawerVisible, setSideDrawerVisible] = useState(false);
  // Dummy data
  const kid = {
    name: "Davi",
    profilePicture: "https://i.ibb.co/H7L0jbj/profile.jpg",
    pictures: [
      { uri: "https://i.ibb.co/9gkbCw1/picture1.jpg", date: "2024-02-20" },
      { uri: "https://i.ibb.co/gdsTwXk/picture2.jpg", date: "2024-02-21" },
      { uri: "https://i.ibb.co/NsZBJv6/picture3.jpg", date: "2024-02-22" },
    ],
  };

  // const handleLogout = async () => {
  //   try {
  //     await Auth.signOut();
  //   } catch (error) {
  //     console.error("Logout error:", error);
  //   } finally {
  //     setSideDrawerVisible(false);
  //   }
  // };

  // const toggleSideDrawer = () => {
  //   setSideDrawerVisible(!isSideDrawerVisible);
  // };

  return (
    <View style={styles.container}>
      {/* <View style={styles.containerMenu}>
        <TouchableOpacity onPress={toggleSideDrawer}>
          <MaterialIcons name="menu" size={30} color="white" />
        </TouchableOpacity>

        <SideDrawer
          isVisible={isSideDrawerVisible}
          onClose={toggleSideDrawer}
          onLogout={handleLogout}
        />
      </View> */}
      {/* Profile Section */}
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: kid.profilePicture }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfoContainer}>
          <Text style={styles.profileName}>{kid.name}</Text>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="call" size={32} color="#FF7276" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="info" size={32} color="#FF7276" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="report-problem" size={32} color="#FF7276" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="healing" size={32} color="#FF7276" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Pictures Section */}
      <Text style={styles.picturesHeader}>Gallery</Text>
      <ScrollView style={{ marginBottom: 20 }}>
        {kid.pictures.map((picture, index) => (
          <View key={index} style={styles.pictureContainer}>
            <Image source={{ uri: picture.uri }} style={styles.pictureImage} />
            <Text style={styles.pictureDate}>Date: {picture.date}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default GalleryScreen;
