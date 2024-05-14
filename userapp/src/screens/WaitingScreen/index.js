import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  Text,
  useWindowDimensions,
  Image,
  TextStyle,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
} from "react-native";
import { Auth } from "aws-amplify";
import styles from "./styles";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useAuthContext } from "../../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

// import { API, graphqlOperation } from "aws-amplify";
// import { onUpdateRoute } from "../../graphql/subscriptions";

const WaitingScreen = () => {
  const { currentUserData } = useAuthContext();

  const windowWidth = useWindowDimensions().width;
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const navigation = useNavigation();

  const funTextStyle: TextStyle = {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    textTransform: "uppercase",
    letterSpacing: 2,
  };

  const handleLogout = async () => {
    try {
      // Sign out the user using Amplify Auth
      await Auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setConfirmationModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require("../../../assets/ondacima.png")}
        style={[styles.waveImage, { top: 0, height: 115, width: 480 }]}
      />
      <Image
        source={require("../../../assets/afterlogo.png")}
        style={{ height: 200, width: 400, marginTop: -20 }}
      />
      <View style={styles.centeredTextWrapper}>
        <Text style={[funTextStyle, styles.centeredText]}>
          Hello {currentUserData?.name}, We don't have a Drop-off route for your
          little champ yet. You will be notified when we do
        </Text>
        <View style={styles.parallelogramContainer}>
          <View style={styles.parallelogram1}></View>
          <View style={styles.parallelogram2}></View>
        </View>
      </View>
      <Text
        style={[
          funTextStyle,
          { marginTop: "40%", marginBottom: 10, color: "black" },
        ]}
      >
        Have Questions? Give us a call
      </Text>
      <View style={{ alignItems: "center", marginTop: 1 }}>
        <TouchableOpacity
          onPress={() => {
            const phoneNumber = "2368652297";
            const phoneNumberWithPrefix = `tel:${phoneNumber}`;

            Linking.canOpenURL(phoneNumberWithPrefix)
              .then((supported) => {
                if (!supported) {
                  console.error("Phone number not supported");
                } else {
                  return Linking.openURL(phoneNumberWithPrefix);
                }
              })
              .catch((error) => console.error(error));
          }}
          style={{
            backgroundColor: "rgb(2 119 247)",
            padding: 10,
            borderRadius: 10,
          }}
        >
          <View style={styles.callBtn}>
            <Text style={{ color: "white", fontSize: 20 }}>Call Us </Text>
            <MaterialIcons name="call" size={24} color="white" />
          </View>
        </TouchableOpacity>
      </View>
      {/* Logout Button */}
      {/* <TouchableOpacity
        onPress={() => setConfirmationModalVisible(true)}
        style={styles.logoutButton}
      >
        <Text style={{ color: "white", fontSize: 20 }}>Logout</Text>
      </TouchableOpacity> */}

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmationModalVisible}
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.confirmLogoutText}>
              Are you sure you want to logout?
            </Text>
            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Text style={funTextStyle}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonConfirm]}
                onPress={handleLogout}
              >
                <Text style={funTextStyle}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Image
        source={require("../../../assets/ondabaixo.png")}
        style={[styles.waveImage, { bottom: 0, height: 102, width: 500 }]}
      />
    </SafeAreaView>
  );
};

export default WaitingScreen;
