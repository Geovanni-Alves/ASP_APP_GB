import React from "react";
import { View, Text } from "react-native";
import styles from "./styles";

const AddressInfoScreen = ({ kid }) => {
  return (
    <View style={styles.tabContainer}>
      {kid.dropOffAddress ? (
        <Text>Drop Off Address: {kid.dropOffAddress.addressLine1}</Text>
      ) : (
        <Text>No drop off address added</Text>
      )}
    </View>
  );
};

export default AddressInfoScreen;
