import React, { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useKidsContext } from "../../contexts/KidsContext";
import styles from "./styles";
import BasicInfoScreen from "./BasicInfoScreen";
import SchoolInfoScreen from "./SchoolInfoScreen";
import AddressInfoScreen from "./AddressInfoScreen";
import JiuJitsuInfoScreen from "./JiuJitsuInfoScreen";
import ProfileHeader from "./ProfileHeader";

const Tab = createBottomTabNavigator();

const StudentProfileScreen = () => {
  const { id: kidId } = useRoute().params;
  const [kid, setKid] = useState(null);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [belt, setBelt] = useState("White");
  const [stripes, setStripes] = useState(2);
  const { RefreshKidsData } = useKidsContext();

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
        // Fetch the student data
        let { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(
            `
            *,
            schools(
            id,name
            )
          `
          )
          .eq("id", kidId)
          .single();

        if (studentError) {
          throw studentError;
        }

        const fetchedKid = studentData;
        console.log("fetchedKid", fetchedKid);
        const currentDropOffAddressId = fetchedKid.currentDropOffAddress;

        if (currentDropOffAddressId) {
          // Fetch the current drop-off address
          let { data: currentDropOffAddress, error: addressError } =
            await supabase
              .from("students_address")
              .select("*")
              .eq("id", currentDropOffAddressId)
              .single();
          if (addressError) {
            throw addressError;
          }
          // Set the fetched drop-off address to the kid object
          fetchedKid.dropOffAddress = currentDropOffAddress;
        }

        // else {
        //   setAddresses(fetchedKid.dropOffAddress);
        // }

        // Update state with fetched data
        setKid(fetchedKid);
        setActualPhoto(fetchedKid.photo);
        setName(fetchedKid.name);
        setBirthDate(fetchedKid.birthDate);
        setNotes(fetchedKid.notes);
        setAllergies(fetchedKid.allergies);
        setMedicine(fetchedKid.medicine);
        //console.log("fetchedKid", fetchedKid);
        if (fetchedKid.schools) {
          setSelectedSchool(fetchedKid.schools);
        }
      } catch (error) {
        console.error("Error fetching kid:", error);
      }
    }
  };

  if (!kid) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size="large"
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                setBirthDate={(date) =>
                  setKid((prev) => ({ ...prev, birthDate: date }))
                }
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
                selectedSchool={kid.school}
                schoolExitPhoto={kid.schoolExitPhoto}
                onChangePhoto={handleNewSchoolPhoto}
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
      </View>
    </KeyboardAvoidingView>
  );
};

export default StudentProfileScreen;
