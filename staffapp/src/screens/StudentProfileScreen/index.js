import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  FontAwesome5,
  MaterialIcons,
  FontAwesome,
  Entypo,
} from "@expo/vector-icons";
import FullScreenImageModal from "../../components/FullScreenImageModal";
import { supabase } from "../../lib/supabase";
import OpenCamera from "../../components/OpenCamera";
import RemoteImage from "../../components/RemoteImage";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import styles from "./styles";
import { useNavigation, useRoute } from "@react-navigation/native"; // Corrected Import
import CustomLoading from "../../components/CustomLoading";
import BasicInfoScreen from "./BasicInfoScreen";
import SchoolInfoScreen from "./SchoolInfoScreen";
import { usePicturesContext } from "../../contexts/PicturesContext";
import { useKidsContext } from "../../contexts/KidsContext";

const StudentProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: kidId } = route.params;
  const [kid, setKid] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(null);
  // const [isConfirmationModalVisible, setConfirmationModalVisible] =
  //   useState(false);
  //const [selectedSchool, setSelectedSchool] = useState(null);
  //const [schoolExitPhoto, setSchoolExitPhoto] = useState(null);
  const [name, setName] = useState("");
  const [bjjCategory, setBjjCategory] = useState("Little Champions");
  const [age, SetAge] = useState("");
  //const [selectedImage, setSelectedImage] = useState(null);
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [belt, setBelt] = useState("White");
  const [stripes, setStripes] = useState(2);
  const [callOpenCameraForSchool, setCallOpenCameraForSchool] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [fullScreenImageModal, setFullScreenImageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { RefreshKidsData } = useKidsContext();
  const Tab = createBottomTabNavigator();
  const { deleteMediaFromBucket } = usePicturesContext();
  const [urlPicture, setUrlPicture] = useState(null);
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });

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

  const goBack = () => {
    navigation.navigate("StudentFeed", { id: kidId });
  };

  const fetchData = async () => {
    setRefreshing(true);
    await fetchKidData();
    setRefreshing(false);
  };

  const fetchKidData = async () => {
    if (kidId) {
      try {
        let { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(
            `
              *,
              schools(id, name)
            `
          )
          .eq("id", kidId)
          .single();

        if (studentError) {
          throw studentError;
        }

        const fetchedKid = studentData;
        const currentDropOffAddressId = fetchedKid.currentDropOffAddress;

        if (currentDropOffAddressId) {
          let { data: currentDropOffAddress, error: addressError } =
            await supabase
              .from("students_address")
              .select("*")
              .eq("id", currentDropOffAddressId)
              .single();
          if (addressError) throw addressError;
          fetchedKid.dropOffAddress = currentDropOffAddress;
        }

        setKid(fetchedKid);
        setActualPhoto(fetchedKid.photo);
        setName(fetchedKid.name);
        // setBirthDate(fetchedKid.birthDate);
        // setNotes(fetchedKid.notes);
        // setAllergies(fetchedKid.allergies);
        // setMedicine(fetchedKid.medicine);
        SetAge(calculateAge(fetchedKid.birthDate));
        // if (fetchedKid.schools) {
        //   setSelectedSchool(fetchedKid.schools);
        // }
      } catch (error) {
        console.error("Error fetching kid:", error);
      }
    }
  };

  useEffect(() => {
    fetchData();
    setActualPhoto(null);
  }, [kidId]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
    if (kid) {
      navigation.setOptions({
        title: `${kid?.name} Profile`,
      });
    }
  }, [route, kid]);

  const handleNewProfilePhoto = async (imagePath) => {
    try {
      setLoading(true);
      setCallOpenCamera(false);
      const mediaToDeletePath = actualPhoto;

      if (mediaToDeletePath) {
        await deleteMediaFromBucket(mediaToDeletePath, "profilePhotos");
      }

      const newMediaPath = imagePath[0];
      setActualPhoto(newMediaPath);

      // Use handleUpdateKid to update only the photo field
      await handleUpdateKid({ photo: newMediaPath });
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

      const { error } = await supabase
        .from("students")
        .update(kidDetails)
        .eq("id", kidId);

      if (error) {
        throw error;
      }

      await fetchData();
      await RefreshKidsData();
      setIsFormChanged(false);
    } catch (error) {
      console.error("Error updating kid's data:", error);
    } finally {
      setLoading(false);
      setShowConfirmationModal(true);
    }
  };

  if (!kid || loading) {
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
        <View style={styles.headerContainer}>
          <View
            style={styles.imageWrapper}
            onLayout={handleProfilePictureLayout}
          >
            <TouchableOpacity
              // style={styles.imageContainer}
              onPress={() => {
                if (urlPicture) {
                  handleImagePress(urlPicture);
                }
              }}
            >
              <RemoteImage
                path={actualPhoto}
                style={styles.profilePicture}
                name={kid?.name}
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
              <MaterialIcons
                name="photo-camera"
                size={32}
                color="gray"
                //color="#FF7276"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerText}>
            {name}
            {age > 0 ? `, ${age} years old` : ""}
          </Text>
          <Text style={styles.categoryText}>{bjjCategory}</Text>
        </View>
        <Tab.Navigator>
          <Tab.Screen
            name="Basic Info"
            children={() => (
              <BasicInfoScreen
                kid={kid}
                setKidDetails={setKid}
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
            name="School Info"
            children={() => (
              <SchoolInfoScreen
                kid={kid}
                // selectedSchool={selectedSchool}
                // setSelectedSchool={setSelectedSchool}
                // schoolExitPhoto={schoolExitPhoto}
              />
            )}
            options={{
              tabBarIcon: ({ color, size }) => (
                <FontAwesome name="building" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Address Info"
            children={() => <AddressInfoScreen kid={kid} />}
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

        <FullScreenImageModal
          isVisible={fullScreenImageModal}
          source={urlPicture}
          onClose={closeFullScreenModal}
          targetX={containerPosition.x + 50}
          targetY={containerPosition.y + 50}
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
        {showConfirmationModal && (
          <InfoModal
            isVisible={true}
            onClose={() => setShowConfirmationModal(false)}
            infoItems={[
              { label: "All Done ✅", value: "Kid Updated successfully!" },
            ]}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default StudentProfileScreen;

const AddressInfoScreen = ({ kid }) => (
  <View style={styles.tabContainer}>
    {kid.dropOffAddress ? (
      <Text>Drop Off Address: {kid.dropOffAddress.addressLine1}</Text>
    ) : (
      <Text>No drop off address added</Text>
    )}
  </View>
);

const JiuJitsuInfoScreen = ({ belt, stripes, setBelt, setStripes }) => (
  <View style={styles.tabContainer}>
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
