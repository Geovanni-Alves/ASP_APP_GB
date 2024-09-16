import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import styles from "./styles";

const SchoolInfoScreen = ({
  selectedSchool,
  schoolExitPhoto,
  onChangePhoto,
}) => {
  return (
    <View style={styles.tabContainer}>
      <Text>
        School: {selectedSchool ? selectedSchool.name : "No school selected"}
      </Text>
      {schoolExitPhoto ? (
        <Image source={{ uri: schoolExitPhoto }} style={styles.schoolPhoto} />
      ) : (
        <Text>No exit door photo</Text>
      )}
      <TouchableOpacity onPress={onChangePhoto} style={styles.changeButton}>
        <Text style={styles.changeButtonText}>Change Exit Door Photo</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SchoolInfoScreen;
