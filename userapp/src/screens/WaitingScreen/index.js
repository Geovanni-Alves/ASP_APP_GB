import React, { useState } from "react";
import {
  View,
  SafeAreaView,
  Text,
  useWindowDimensions,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
// import { Auth } from "aws-amplify";
import styles from "./styles";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import HighlightMessage from "../../components/HighlightMessage";
import { useUsersContext } from "../../contexts/UsersContext";

const WaitingScreen = () => {
  const { currentUserData } = useUsersContext();
  const windowWidth = useWindowDimensions().width;

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require("../../../assets/ondacima.png")}
        style={[styles.waveImage, { top: 0, height: 115, width: 480 }]}
      />
      <Image
        source={require("../../../assets/afterlogo.png")}
        style={{ height: 180, width: 370 }}
      />
      <View style={styles.centeredTextWrapper}>
        <HighlightMessage
          message={`Hello ${currentUserData?.name}, We don't have a Drop-off route for your little champ yet. You will be notified when we do.`}
        />
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "800",
          color: "black",
          textTransform: "uppercase",
          letterSpacing: 2.5,
          marginTop: 10,
          marginBottom: 20,
        }}
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
            //backgroundColor: "rgb(2 119 247)",
            backgroundColor: "gray",
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
      <Image
        source={require("../../../assets/ondabaixo.png")}
        style={[styles.waveImage, { bottom: 0, height: 102, width: 500 }]}
      />
    </SafeAreaView>
  );
};

export default WaitingScreen;
