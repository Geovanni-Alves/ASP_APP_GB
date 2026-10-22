import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { FontAwesome5, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import FullScreenImage from "../../components/FullScreenImageModal";
import RemoteImage from "../../components/RemoteImage";
// import ConfirmationModal from "../../components/ConfirmationModal";
// import InfoModal from "../../components/InfoModal";
import styles from "./styles";
import {
  useNavigation,
  useRoute,
  //useFocusEffect,
} from "@react-navigation/native";
import CustomLoading from "../../components/CustomLoading";
import BasicInfoScreen from "./BasicInfoScreen";
import SchoolInfoScreen from "./SchoolInfoScreen";
import ContactsScreen from "./ContactsScreen";
import AddressInfoScreen from "./AddressInfoScreen";
// import JiuJitsuInfoScreen from "./JiuJitsuInfoScreen";
import { useKidsContext } from "../../contexts/KidsContext";
import { useUsersContext } from "../../contexts/UsersContext";
import { usePicturesContext } from "../../contexts/PicturesContext";
import OpenCamera from "../../components/OpenCamera";
import api from "../../lib/api";
import { canEditStudents } from "../../lib/roles";

// What the people who run the school may change from the app (the rest is done in the dashboard).
// Add "allergies" or "medicine" here if the app should be able to change them too.
const EDITABLE_FIELDS = ["notes"];

const StudentProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: kidId } = route.params;
  // The staff and the drivers only LOOK at a student (and add photos of the dismissal door).
  // The owner, the managers and the admins may also change the photo, the notes and the dismissal
  // photos. Name, birthday, allergies, medicine, contacts, school and addresses: the dashboard.
  const { currentUserData } = useUsersContext();
  const canEdit = canEditStudents(currentUserData);
  const readOnly = !canEdit;
  const { deleteMediaFromBucket } = usePicturesContext();
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [selectedKid, setSelectedKid] = useState(null);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("BasicInfo");
  const [age, SetAge] = useState("");
  const [belt, setBelt] = useState("White");
  const [stripes, setStripes] = useState(2);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { RefreshKidsData, kids, fetchSelectedKid } = useKidsContext();
  const Tab = createBottomTabNavigator();
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });

  const avatarSize = activeTab === "BasicInfo" ? 120 : 40;
  const containerHeight = activeTab === "BasicInfo" ? 180 : 60;

  const formatKidName = (fullName) => {
    if (!fullName) return "";

    const nameParts = fullName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1]; // Take only the first and last names

    const fullDisplayName = `${firstName} ${lastName}`;

    return fullDisplayName;
  };

  const goBack = () => {
    navigation.navigate("StudentFeed", { id: kidId });
  };

  useEffect(() => {
    const formattedName = formatKidName(selectedKid?.name);
    // navigation.setOptions({
    //   headerLeft: () => (
    //     <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
    //       <FontAwesome name="arrow-left" size={23} color="#fff" />
    //     </TouchableOpacity>
    //   ),
    // });
    if (selectedKid) {
      navigation.setOptions({
        title: `${formattedName} Profile `,
      });
    }
  }, [route, selectedKid, activeTab]);

  const fetchData = async () => {
    //setRefreshing(true);
    if (kidId) {
      setLoading(true);
      const kid = await fetchSelectedKid(kidId);
      setSelectedKid(kid);
      setActualPhoto(kid.photo);
      SetAge(calculateAge(kid.birthDate));
      setLoading(false);
    }
  };

  useEffect(() => {
    setActualPhoto(null);
    //setActiveTab("Basic Info");
    fetchData();
  }, [kidId, kids]);

  // Capture the position of the small container (e.g., profile picture)
  const handleProfilePictureLayout = (event) => {
    const { x, y } = event.nativeEvent.layout;
    setContainerPosition({ x, y });
  };

  // Helper function to calculate age
  const calculateAge = (birthDate) => {
    if (birthDate) {
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
    } else {
      return 0;
    }
  };

  // A new photo for the student: the file is sent by the camera, here the student gets it and
  // the old file is removed
  const handleNewProfilePhoto = async (paths) => {
    const path = paths?.[0];
    if (!path) return;

    try {
      const oldPhoto = actualPhoto;
      await api.patch(`/students/${selectedKid.id}`, { photo: path });
      setActualPhoto(path);
      if (oldPhoto) {
        await deleteMediaFromBucket(oldPhoto, "profilePhotos");
      }
      await RefreshKidsData();
    } catch (error) {
      console.error(
        "Error changing the student photo:",
        error?.response?.data || error.message,
      );
      Alert.alert("Error", "Failed to change the photo.");
    }
  };

  // Saves the fields the app may change (the notes). The API answers with the updated student.
  const handleUpdateKid = async (updatedFields) => {
    const body = {};
    EDITABLE_FIELDS.forEach((field) => {
      if (field in updatedFields) body[field] = updatedFields[field];
    });

    try {
      const { data } = await api.patch(`/students/${selectedKid.id}`, body);
      await RefreshKidsData();
      return { ...selectedKid, ...data };
    } catch (error) {
      console.error(
        "Error updating the student:",
        error?.response?.data || error.message,
      );
      Alert.alert("Error", "Failed to save the changes.");
      return null;
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
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

  if (!selectedKid || loading) {
    return (
      <View style={{ flex: 1 }}>
        <CustomLoading imageSize={70} text="Loading..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 15 : 20}
    >
      <View style={{ flex: 1 }}>
        <View
          style={[
            activeTab === "BasicInfo"
              ? styles.fullHeaderContainer
              : styles.minimizedHeaderContainer,
            { height: containerHeight },
          ]}
        >
          <View
            onLayout={handleProfilePictureLayout}
            style={styles.imageWrapper}
          >
            <Pressable
              onPress={() => {
                if (activeTab === "BasicInfo" && actualPhoto) {
                  handleImagePress(actualPhoto);
                }
              }}
            >
              <RemoteImage
                path={actualPhoto}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                }} // Dynamic avatar size
                name={selectedKid.name}
                bucketName="profilePhotos"
              />
            </Pressable>

            {canEdit && activeTab === "BasicInfo" && (
              <TouchableOpacity
                style={styles.cameraContainer}
                onPress={() => setCallOpenCamera(true)}
              >
                <MaterialIcons name="photo-camera" size={28} color="gray" />
              </TouchableOpacity>
            )}
          </View>
          <Text
            style={
              activeTab === "BasicInfo"
                ? styles.headerText
                : styles.minimizedHeaderText
            }
          >
            {selectedKid.name}
            {activeTab === "BasicInfo" && age > 0 ? `, ${age} years old` : ""}
          </Text>
        </View>
        {/* Separator */}
        <View style={styles.separator} />

        <Tab.Navigator
          initialRouteName={activeTab}
          screenOptions={{
            headerShown: false,
          }}
          screenListeners={({ route }) => ({
            tabPress: () => handleTabChange(route.name),
          })}
        >
          <Tab.Screen
            name="BasicInfo"
            children={() => (
              <BasicInfoScreen
                kidId={selectedKid.id}
                setKidDetails={setSelectedKid}
                handleUpdateKid={handleUpdateKid}
                editableFields={canEdit ? EDITABLE_FIELDS : []}
                readOnly={readOnly}
              />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <FontAwesome5 name="info-circle" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Contacts"
            children={() => (
              <ContactsScreen kid={selectedKid} readOnly={readOnly} />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="contacts" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="School Info"
            children={() => (
              <SchoolInfoScreen kid={selectedKid} canEdit={canEdit} />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <FontAwesome name="building" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Address Info"
            children={() => (
              <AddressInfoScreen kid={selectedKid} readOnly={readOnly} />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="location-on" color={color} size={size} />
              ),
            }}
          />
          {/* <Tab.Screen
            name="Jiu Jitsu Info"
            children={() => (
              <JiuJitsuInfoScreen kid={selectedKid} readOnly={readOnly} />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <FontAwesome5 name="medal" color={color} size={size} />
              ),
            }}
          /> */}
        </Tab.Navigator>

        {/* <OpenCamera
          isVisible={callOpenCameraForSchool}
          onPhotoTaken={() => setCallOpenCameraForSchool(false)}
          onSelectOption={handleNewSchoolPhoto}
          onClose={() => setCallOpenCameraForSchool(false)}
          mode="photo"
          bucketName="schoolExitPhotos"
          allowMultipleImages={false}
          saveMediaOnCamera={false}
        /> */}
        {/* <ConfirmationModal
          isVisible={isFormChanged}
          onConfirm={handleUpdateKid}
          onCancel={() => setIsFormChanged(false)}
          questionText="Save changes to the profile?"
        /> */}

        <OpenCamera
          isVisible={callOpenCamera}
          onSelectOption={handleNewProfilePhoto}
          onClose={() => setCallOpenCamera(false)}
          mode="photo"
          tag={false}
          allowMultipleImages={false}
          bucketName="profilePhotos"
          allowNotes={false}
        />

        <FullScreenImage
          isVisible={fullScreenImageModal}
          path={actualPhoto}
          onClose={closeFullScreenModal}
          targetX={containerPosition.x + 50}
          targetY={containerPosition.y + 50}
          bucketName={"profilePhotos"}
        />
        {/* <Modal
          visible={fullScreenImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeFullScreenModal}
        >
          <View style={styles.fullScreenModalContainer}>
            {selectedImage ? (
              <RemoteImage
                path={selectedImage}
                bucketName="profilePhotos"
                style={styles.fullImage}
              />
            ) : (
              <ActivityIndicator size="large" />
            )}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={closeFullScreenModal}
            >
              <Entypo name="cross" size={25} color="white" />
            </TouchableOpacity>
          </View>
        </Modal> */}
        {/* {showConfirmationModal && (
          <InfoModal
            isVisible={true}
            onClose={() => setShowConfirmationModal(false)}
            infoItems={[
              { label: "All Done ✅", value: "Kid Updated successfully!" },
            ]}
          />
        )} */}
      </View>
    </KeyboardAvoidingView>
  );
};

export default StudentProfileScreen;
