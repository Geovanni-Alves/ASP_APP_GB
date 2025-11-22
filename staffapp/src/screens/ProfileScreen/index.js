import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Keyboard,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { supabase } from "../../lib/supabase";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
// import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
// import { GOOGLE_MAPS_APIKEY } from "@env";
//import PhoneInput from "react-native-phone-number-input";
// import OSMAutocomplete from "../../components/OSMAutocomplete";
import MapBoxAutocomplete from "../../components/MapBoxAutocomplete";
import PhoneInput from "react-native-international-phone-number";
import { useUsersContext } from "../../contexts/UsersContext";
import styles from "./styles";
import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { usePicturesContext } from "../../contexts/PicturesContext";
import FullScreenImage from "../../components/FullScreenImageModal";
import { TouchableWithoutFeedback } from "react-native";

const ProfileScreen = () => {
  const { setDbUser, dbUser, RefreshCurrentUserData } = useUsersContext();
  const [name, setName] = useState(dbUser?.name || "");
  const [unitNumber, setUnitNumber] = useState(dbUser?.unitNumber || "");
  const [address, setAddress] = useState(dbUser?.address || "");
  const [phoneNumber, setPhoneNumber] = useState(dbUser?.phoneNumber || "");
  const [lat, setLat] = useState(dbUser?.lat || null);
  const [lng, setLng] = useState(dbUser?.lng || null);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(dbUser?.photo || null);
  const { deleteMediaFromBucket } = usePicturesContext();
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });
  const [selectedCountry, setSelectedCountry] = useState(null);

  const navigation = useNavigation();
  const userAddressRef = useRef();
  const flatListRef = useRef();

  // Capture the position of the small container (e.g., profile picture)
  const handleProfilePictureLayout = (event) => {
    const { x, y } = event.nativeEvent.layout;
    setContainerPosition({ x, y });
  };

  useEffect(() => {
    // console.log("dbUser", dbUser);
    if (dbUser) {
      // console.log("dbUser", dbUser);
      setName(dbUser.name || "");
      setPhoneNumber(dbUser.phoneNumber || "");
      if (dbUser.address) {
        setAddress(dbUser.address); // Load the address from dbUser
        if (userAddressRef.current) {
          userAddressRef.current.setAddressText(address); // Set the initial value
        }
      }
    }
  }, [dbUser]);

  // const handleConfirm = () => {
  //   if (phoneInputRef.current.isValidNumber(phoneNumber)) {
  //     Keyboard.dismiss();
  //   } else {
  //     Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
  //   }
  // };

  const handleConfirm = () => {
    if (phoneNumber) {
      Keyboard.dismiss();
      // Alert.alert(
      //   "Phone Number",
      //   `Phone: ${phoneNumber}, Country: ${selectedCountry.cca2}`
      // );
    } else {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
    }
  };

  const handleImagePress = (image) => {
    if (image) {
      setFullScreenImageModal(true);
    }
  };

  const closeFullScreenModal = () => {
    setFullScreenImageModal(false);
  };

  const handleNewPhoto = async (Paths) => {
    try {
      const mediaToDeletePath = actualPhoto;

      if (mediaToDeletePath) {
        await deleteMediaFromBucket(mediaToDeletePath, "profilePhotos");
      }
      const imagePath = Paths[0];
      if (imagePath) {
        await updateUserImage(imagePath);
        setActualPhoto(imagePath);
        await RefreshCurrentUserData();
      }
    } catch (error) {
      console.error("Error saving image to storage", error);
    }
  };

  const handlePhotoTaken = (photo) => {
    setCallOpenCamera(false);
  };

  const updateUserImage = async (filename) => {
    try {
      if (!filename || !dbUser.id) {
        throw new Error("Filename or userId is not defined");
      }

      const userDetails = {
        photo: filename,
      };

      const { error } = await supabase
        .from("users")
        .update(userDetails)
        .eq("id", dbUser.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error updating user image:", error.message);
    }
  };

  const onSave = async () => {
    try {
      const userDetails = {
        name,
        unitNumber,
        address,
        lng,
        lat,
        phoneNumber,
      };
      const { data, error } = await supabase
        .from("users")
        .update(userDetails)
        .eq("id", dbUser.id)
        .select();

      if (error) {
        throw error;
      }
      //console.log(data);
      const updatedUser = data[0];
      setDbUser(updatedUser);
      await RefreshCurrentUserData();

      Alert.alert("Success", "Profile updated successfully!");

      navigation.goBack();
    } catch (e) {
      Alert.alert("Error updating profile", e.message);
    }
  };

  const renderContent = () => (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.imageWrapper} onLayout={handleProfilePictureLayout}>
          <TouchableOpacity
            onPress={() => {
              if (actualPhoto) {
                handleImagePress(actualPhoto);
              }
            }}
          >
            <RemoteImage
              path={actualPhoto}
              style={styles.userPhoto}
              name={dbUser?.name}
              bucketName="profilePhotos"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cameraIcon}
            onPress={() => setCallOpenCamera(true)}
          >
            <Text
              style={{
                position: "absolute",
                bottom: -12,
                right: 3,
                fontSize: 15,
                fontWeight: "600",
                color: "blue",
              }}
            >
              Edit
            </Text>
            <MaterialIcons name="photo-camera" size={32} color="gray" />
          </TouchableOpacity>
          <OpenCamera
            isVisible={callOpenCamera}
            onPhotoTaken={handlePhotoTaken}
            onSelectOption={handleNewPhoto}
            onClose={() => setCallOpenCamera(false)}
            mode="photo"
            tag={false}
            allowMultipleImages={false}
            bucketName="profilePhotos"
            allowNotes={false}
          />
        </View>
        <View style={styles.textAvatar}>
          <Text style={styles.name}>{dbUser?.name}</Text>
          <Text style={styles.email}>{dbUser?.email}</Text>
        </View>
      </View>

      <View style={styles.separator}></View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name:</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          style={styles.input}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address</Text>
        <MapBoxAutocomplete
          defaultValue={address}
          onSelect={(place) => {
            setAddress(place.address);
            setLat(place.lat);
            setLng(place.lng);
            flatListRef.current.scrollToOffset({
              offset: 150,
              animated: true,
            });
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Unit Number</Text>
        <TextInput
          value={unitNumber}
          onChangeText={setUnitNumber}
          placeholder="Unit Number"
          style={styles.input}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneInputContainer}>
          <PhoneInput
            value={phoneNumber}
            onChangePhoneNumber={(phone) => {
              setPhoneNumber(phone);
            }}
            selectedCountry={selectedCountry}
            onChangeSelectedCountry={(country) => {
              setSelectedCountry(country);
            }}
            placeholder="Phone Number"
            language="en"
            defaultCountry="CA"
            phoneInputStyles={{
              container: {
                width: "89%",
              },
            }}
          />
          <TouchableOpacity style={styles.okButton} onPress={handleConfirm}>
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          (!name.trim() || !address.trim() || !phoneNumber.trim()) &&
            styles.saveButtonDisabled,
        ]}
        onPress={onSave}
        disabled={!name.trim() || !address.trim() || !phoneNumber.trim()}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 65 : 65}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <FullScreenImage
              isVisible={fullScreenImageModal}
              path={actualPhoto}
              onClose={closeFullScreenModal}
              targetX={containerPosition.x + 10}
              targetY={containerPosition.y + 10}
              bucketName="profilePhotos"
            />
            <FlatList
              ref={flatListRef}
              data={[{ key: "profile" }]}
              renderItem={renderContent}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="always"
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
