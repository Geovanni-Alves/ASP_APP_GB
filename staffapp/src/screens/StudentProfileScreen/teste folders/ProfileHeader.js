import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import RemoteImage from "../../components/RemoteImage";
import styles from "./styles";

const ProfileHeader = ({
  name,
  birthDate,
  category,
  photo,
  onPressEditPhoto,
}) => {
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const age = calculateAge(birthDate);

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={onPressEditPhoto}>
        {photo ? (
          <RemoteImage
            path={photo}
            bucketName="profilePhotos"
            style={styles.profilePicture}
          />
        ) : (
          <View style={styles.profilePicturePlaceholder}>
            <Text>No Image</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.headerText}>
        {name}, {age} years old
      </Text>
      <Text style={styles.categoryText}>{category}</Text>
    </View>
  );
};

export default ProfileHeader;
