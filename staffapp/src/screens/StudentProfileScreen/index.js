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
} from "react-native";
import { FontAwesome5, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import FullScreenImage from "../../components/FullScreenImageModal";
import { supabase } from "../../lib/supabase";
import OpenCamera from "../../components/OpenCamera";
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
import { usePicturesContext } from "../../contexts/PicturesContext";
import { useKidsContext } from "../../contexts/KidsContext";

const StudentProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: kidId } = route.params;
  const [selectedKid, setSelectedKid] = useState(null);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("Basic Info");
  const [age, SetAge] = useState("");
  const [belt, setBelt] = useState("White");
  const [stripes, setStripes] = useState(2);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { RefreshKidsData, kids, fetchSelectedKid } = useKidsContext();
  const Tab = createBottomTabNavigator();
  const { deleteMediaFromBucket } = usePicturesContext();
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });

  const avatarSize = activeTab === "Basic Info" ? 120 : 40;
  const containerHeight = activeTab === "Basic Info" ? 180 : 60;

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
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
    if (selectedKid) {
      navigation.setOptions({
        title: `${formattedName} Profile`,
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
    setActiveTab("Basic Info");
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

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  const handleNewProfilePhoto = async (imagePath) => {
    try {
      setLoading(true);
      setCallOpenCamera(false);
      const mediaToDeletePath = actualPhoto;

      if (mediaToDeletePath) {
        await deleteMediaFromBucket(mediaToDeletePath, "profilePhotos");
      }

      const newMediaPath = imagePath[0];
      if (newMediaPath) {
        await handleUpdateKid({ photo: newMediaPath });
        setActualPhoto(newMediaPath);
        await RefreshKidsData();
      }

      // Use handleUpdateKid to update only the photo field
    } catch (error) {
      console.error("Error changing the profile photo", error);
    } finally {
      setLoading(false);
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

  const handleUpdateKid = async (updatedFields) => {
    try {
      setLoading(true);
      // Merge the existing kid data with the updated fields
      const kidDetails = {
        ...updatedFields,
      };

      const { data, error } = await supabase
        .from("students")
        .update(kidDetails)
        .eq("id", kidId)
        .select();

      if (error) {
        throw error;
      }
      const updateKid = data[0];
      //setSelectedKid(updateKid);
      await RefreshKidsData();
      // await fetchData();

      //setIsFormChanged(false);
      return updateKid;
    } catch (error) {
      console.error("Error updating kid's data:", error);
    } finally {
      setLoading(false);
      // setShowConfirmationModal(true);
    }
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
            activeTab === "Basic Info"
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
                if (activeTab === "Basic Info" && actualPhoto) {
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

            {activeTab === "Basic Info" && (
              <View style={styles.cameraContainer}>
                <TouchableOpacity
                  style={styles.cameraIcon}
                  onPress={() => setCallOpenCamera(true)}
                >
                  <MaterialIcons name="photo-camera" size={32} color="gray" />
                </TouchableOpacity>
                <Text style={styles.editText}>Edit </Text>
              </View>
            )}
          </View>
          <Text
            style={
              activeTab === "Basic Info"
                ? styles.headerText
                : styles.minimizedHeaderText
            }
          >
            {selectedKid.name}
            {activeTab === "Basic Info" && age > 0 ? `, ${age} years old` : ""}
          </Text>
        </View>
        {/* Separator */}
        <View style={styles.separator} />

        <Tab.Navigator
          initialRouteName="Basic Info"
          screenOptions={{
            headerShown: false,
          }}
          screenListeners={({ route }) => ({
            tabPress: () => handleTabChange(route.name),
          })}
        >
          <Tab.Screen
            name="Basic Info"
            children={() => (
              <BasicInfoScreen
                kidId={selectedKid.id}
                setKidDetails={setSelectedKid}
                handleUpdateKid={handleUpdateKid}
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
            children={() => <ContactsScreen kid={selectedKid} />}
            options={{
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="contacts" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="School Info"
            children={() => <SchoolInfoScreen kid={selectedKid} />}
            options={{
              tabBarIcon: ({ color, size }) => (
                <FontAwesome name="building" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Address Info"
            children={() => <AddressInfoScreen kid={selectedKid} />}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="location-on" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Jiu Jitsu Info"
            children={() => (
              <JiuJitsuInfoScreen
                belt={belt}
                stripes={stripes}
                setBelt={setBelt}
                setStripes={setStripes}
              />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <FontAwesome5 name="medal" color={color} size={size} />
              ),
            }}
          />
        </Tab.Navigator>

        <OpenCamera
          isVisible={callOpenCamera}
          onPhotoTaken={() => setCallOpenCamera(false)}
          onSelectOption={handleNewProfilePhoto}
          onClose={() => setCallOpenCamera(false)}
          mode="photo"
          bucketName="profilePhotos"
          allowMultipleImages={false}
        />
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

const JiuJitsuInfoScreen = ({ belt, stripes, setBelt, setStripes }) => {
  const [bjjCategory, setBjjCategory] = useState("Little Champions");
  return (
    <View style={styles.tabContainer}>
      <Text>Actual Category</Text>
      <Text style={styles.categoryText}>{bjjCategory}</Text>
      <Text>Belt</Text>
      <TextInput style={styles.input} value={belt} onChangeText={setBelt} />
      <Text>Stripes</Text>
      <TextInput
        style={styles.input}
        value={stripes.toString()}
        onChangeText={(text) => setStripes(Number(text))}
      />
    </View>
  );
};
