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
  Modal,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Entypo } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_APIKEY } from "@env";
import PhoneInput from "react-native-phone-number-input";
import { useUsersContext } from "../../contexts/UsersContext";
import styles from "./styles";
import RemoteImage from "../../components/RemoteImage";
import OpenCamera from "../../components/OpenCamera";
import { usePicturesContext } from "../../contexts/PicturesContext";
import FullScreenImageModal from "../../components/FullScreenImageModal";
//import PhotoOptionsModal from "../../components/PhotoOptionsModal";

const ProfileScreen = () => {
  const { setDbUser, dbUser, RefreshCurrentUserData } = useUsersContext();
  const [name, setName] = useState(dbUser?.name || "");
  const [unitNumber, setUnitNumber] = useState(dbUser?.unitNumber || "");
  const [address, setAddress] = useState(dbUser?.address || "");
  //const [email, setEmail] = useState(dbUser?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(dbUser?.phoneNumber || "");
  const phoneInputRef = useRef(null);
  const [lat, setLat] = useState(dbUser?.lat || null);
  const [lng, setLng] = useState(dbUser?.lng || null);
  //const [isPhotoOptionsModalVisible, setPhotoModalVisible] = useState(false);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  //const [modalVisible, setModalVisible] = useState(false);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(dbUser?.photo || null);
  const { deleteMediaFromBucket } = usePicturesContext();
  const [urlPicture, setUrlPicture] = useState(null);
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });

  const navigation = useNavigation();
  const userAddressRef = useRef();
  const flatListRef = useRef();

  // Capture the position of the small container (e.g., profile picture)
  const handleProfilePictureLayout = (event) => {
    const { x, y } = event.nativeEvent.layout;
    setContainerPosition({ x, y });
  };

  useEffect(() => {
    if (dbUser?.address) {
      setAddress(dbUser.address);
    }
  }, [dbUser]);

  // useEffect(() => {
  //   userAddressRef.current?.setAddressText(address);
  // }, [address]);

  const handleConfirm = () => {
    if (phoneInputRef.current.isValidNumber(phoneNumber)) {
      Keyboard.dismiss();
    } else {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
    }
  };

  const handleImagePress = (image) => {
    if (image) {
      //setSelectedImage(image);
      setFullScreenImageModal(true);
    }
  };

  const closeFullScreenModal = () => {
    //setSelectedImage(null);
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
    <View style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        <View style={styles.imageWrapper} onLayout={handleProfilePictureLayout}>
          <TouchableOpacity
            // style={styles.imageContainer}
            //onPress={() => handleImagePress(actualPhoto)}
            onPress={() => {
              if (urlPicture) {
                handleImagePress(urlPicture);
              }
            }}
          >
            <RemoteImage
              path={actualPhoto}
              style={styles.userPhoto}
              name={dbUser?.name}
              bucketName="profilePhotos"
              onImageLoaded={(url) => setUrlPicture(url)}
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
          {/* <PhotoOptionsModal
            isVisible={isPhotoOptionsModalVisible}
            onClose={() => setPhotoModalVisible(false)}
            onSelectOption={handleNewPhoto}
          /> */}
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
        <GooglePlacesAutocomplete
          nearbyPlacesAPI="GooglePlacesSearch"
          ref={userAddressRef}
          placeholder="Address"
          debounce={400}
          minLength={2}
          textInputProps={{
            value: address,
            onChangeText: (text) => {
              setAddress(text);
              flatListRef.current.scrollToOffset({
                offset: 150,
                animated: true,
              });
            },
          }}
          onFail={(error) => console.log(error)}
          onNotFound={() => console.log("no results")}
          enablePoweredByContainer={false}
          fetchDetails={true}
          styles={styles.autoComplete}
          // styles={{
          //   textInputContainer: styles.autoCompleteTextInputContainer,
          //   textInput: styles.autoCompleteTextInput,
          //   listView: styles.autoCompleteListView,
          // }}
          onPress={(data, details = null) => {
            //console.log(details.formatted_address);
            setAddress(details.formatted_address);
            setLat(details.geometry.location.lat);
            setLng(details.geometry.location.lng);
          }}
          query={{
            key: GOOGLE_MAPS_APIKEY,
            language: "en",
            components: "country:ca",
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
            ref={phoneInputRef}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
            }}
            defaultCode="CA"
            layout="first"
            placeholder="Phone Number"
            style={styles.phoneInputField}
          />
          <TouchableOpacity style={styles.okButton} onPress={handleConfirm}>
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <RemoteImage
            path={selectedImage}
            bucketName="profilePhotos"
            style={styles.fullImage}
          />
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={closeModal}
          >
            <Entypo name="cross" size={25} color="white" />
          </TouchableOpacity>
        </View>
      </Modal> */}

      {/* <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
        />
      </View> */}

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
        <FullScreenImageModal
          isVisible={fullScreenImageModal}
          source={urlPicture}
          onClose={closeFullScreenModal}
          targetX={containerPosition.x + 10}
          targetY={containerPosition.y + 10}
        />
        <FlatList
          ref={flatListRef}
          data={[{ key: "profile" }]}
          renderItem={renderContent}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="always"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
