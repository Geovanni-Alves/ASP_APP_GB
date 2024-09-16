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
} from "react-native";
import { FontAwesome5, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { supabase } from "../../lib/supabase";
import OpenCamera from "../../components/OpenCamera";
import RemoteImage from "../../components/RemoteImage";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import { useKidsContext } from "../../contexts/KidsContext";
import styles from "./styles";
import { useNavigation, useRoute } from "@react-navigation/native"; // Corrected Import
import { ScrollView } from "react-native-gesture-handler";

// Helper function to calculate age
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

// Header with Profile Picture, Name, Age, and Jiu Jitsu Category
const ProfileHeader = ({
  name,
  birthDate,
  category,
  photo,
  onPressEditPhoto,
}) => {
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

const Tab = createBottomTabNavigator();

const BasicInfoScreen = ({
  kid,
  setKidDetails,
  setBirthDate,
  setIsFormChanged,
}) => {
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  //const [birthDate, setBirthDate] = useState("");

  const handleConfirmDate = (date) => {
    try {
      // Convert date to the expected format and update birth date
      const formattedDate = date.toISOString().split("T")[0];
      setBirthDate(formattedDate);

      // If you're storing birthDate in kidDetails, update it as well
      setKidDetails((prev) => ({
        ...prev,
        birthDate: formattedDate,
      }));

      // Mark the form as changed
      setIsFormChanged(true);

      // Close the Date Picker
      setDatePickerVisible(false);
    } catch (error) {
      console.error("Error updating date:", error); // Add error handling for debugging
      setDatePickerVisible(false); // Ensure the modal closes even on error
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      style={styles.tabContainer}
    >
      {/* <View style={styles.tabContainer}> */}
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>Birthday</Text>
        <TouchableOpacity
          onPress={() => {
            setDatePickerVisible(true);
          }}
        >
          <Text style={styles.detailTextInput}>
            {kid.birthDate || "Select Date"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          date={kid.birthDate ? new Date(kid.birthDate) : new Date()} // Use current date if birthDate is not set
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisible(false)}
        />
      </View>
      <Text style={styles.detailLabel}>Notes</Text>
      <TextInput
        style={styles.detailTextInput}
        value={kid.notes}
        onChangeText={(text) =>
          setKidDetails((prev) => ({ ...prev, notes: text }))
        }
      />
      <Text style={styles.detailLabel}>Allergies</Text>
      <TextInput
        style={styles.detailTextInput}
        value={kid.allergies}
        onChangeText={(text) =>
          setKidDetails((prev) => ({ ...prev, allergies: text }))
        }
      />
      <Text style={styles.detailLabel}>Medicine</Text>
      <TextInput
        style={styles.detailTextInput}
        value={kid.medicine}
        onChangeText={(text) =>
          setKidDetails((prev) => ({ ...prev, medicine: text }))
        }
      />
      {/* </View> */}
    </ScrollView>
  );
};

const SchoolInfoScreen = ({
  selectedSchool,
  schoolExitPhoto,
  onChangePhoto,
}) => (
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

const StudentProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: kidId } = route.params;
  const [kid, setKid] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [isConfirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolExitPhoto, setSchoolExitPhoto] = useState(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicine, setMedicine] = useState("");
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [belt, setBelt] = useState("White");
  const [stripes, setStripes] = useState(2);
  const [callOpenCameraForSchool, setCallOpenCameraForSchool] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const { RefreshKidsData } = useKidsContext();

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
        setBirthDate(fetchedKid.birthDate);
        setNotes(fetchedKid.notes);
        setAllergies(fetchedKid.allergies);
        setMedicine(fetchedKid.medicine);
        if (fetchedKid.schools) {
          setSelectedSchool(fetchedKid.schools);
        }
      } catch (error) {
        console.error("Error fetching kid:", error);
      }
    }
  };

  useEffect(() => {
    fetchData();
    setActualPhoto(null);
  }, [kidId]);

  const handleNewSchoolPhoto = async (imagePath) => {
    setCallOpenCameraForSchool(false);
    setSchoolExitPhoto(imagePath[0]);
  };

  const handleNewProfilePhoto = async (imagePath) => {
    setCallOpenCamera(false);
    setActualPhoto(imagePath[0]);
  };

  const handleUpdateKid = async () => {
    setIsFormChanged(false);
    const kidDetails = {
      name: kid.name,
      birthDate: kid.birthDate,
      notes: kid.notes,
      allergies: kid.allergies,
      medicine: kid.medicine,
      photo: actualPhoto,
    };

    try {
      const { error } = await supabase
        .from("students")
        .update(kidDetails)
        .eq("id", kidId);

      if (error) {
        throw error;
      }

      await fetchData();
      await RefreshKidsData();
    } catch (error) {
      console.error("Error updating kid's data:", error);
    }
  };

  if (!kid) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size={"large"}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}
    >
      <View style={{ flex: 1 }}>
        <ProfileHeader
          name={kid.name}
          birthDate={kid.birthDate}
          category="Little Champions"
          photo={actualPhoto}
          onPressEditPhoto={() => setCallOpenCamera(true)}
        />
        <Tab.Navigator>
          <Tab.Screen
            name="Basic Info"
            children={() => (
              <BasicInfoScreen
                kid={kid}
                setKidDetails={setKid}
                setBirthDate={setBirthDate}
                setIsFormChanged={setIsFormChanged}
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
                selectedSchool={selectedSchool}
                schoolExitPhoto={schoolExitPhoto}
                onChangePhoto={() => setCallOpenCameraForSchool(true)}
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
        <OpenCamera
          isVisible={callOpenCameraForSchool}
          onPhotoTaken={() => setCallOpenCameraForSchool(false)}
          onSelectOption={handleNewSchoolPhoto}
          onClose={() => setCallOpenCameraForSchool(false)}
          mode="photo"
          bucketName="schoolExitPhotos"
          allowMultipleImages={false}
          saveMediaOnCamera={false}
        />
        <ConfirmationModal
          isVisible={isFormChanged}
          onConfirm={handleUpdateKid}
          onCancel={() => setIsFormChanged(false)}
          questionText="Save changes to the profile?"
        />
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
