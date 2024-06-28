import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
//import { useNavigation } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_APIKEY } from "@env";
import PhoneInput from "react-native-phone-number-input";
//import PhoneInput from "react-native-phone-input";
import { useUsersContext } from "../../contexts/UsersContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";

const CompleteProfileScreen = ({ kids }) => {
  const { setDbUser, dbUser, userEmail, authUser } = useUsersContext();
  const { expoPushToken } = usePushNotificationsContext();

  const [name, setName] = useState(dbUser?.name || "");
  const [unitNumber, setUnitNumber] = useState(dbUser?.unitNumber || "");
  const [address, setAddress] = useState(dbUser?.address || "");
  const [completeAddress, setCompleteAddress] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(dbUser?.phoneNumber || "");
  const phoneInputRef = useRef(null);

  const [lat, setLat] = useState(dbUser?.lat || null);
  const [lng, setLng] = useState(dbUser?.lng || null);
  const [confirmations, setConfirmations] = useState(kids.map(() => false));

  //const navigation = useNavigation();

  const handleConfirm = () => {
    if (phoneInputRef.current.isValidNumber(phoneNumber)) {
      Keyboard.dismiss();
    } else {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
    }
  };

  const isSaveButtonVisible =
    name.trim() !== "" &&
    address.trim() !== "" &&
    phoneNumber.trim() !== "" &&
    confirmations.every((confirmed) => confirmed);

  const toggleKidConfirmation = (index) => {
    const updatedConfirmations = [...confirmations];
    updatedConfirmations[index] = !updatedConfirmations[index];
    setConfirmations(updatedConfirmations);
  };

  const onCreateUser = async () => {
    try {
      //const formattedAddress = address.formatted_address;
      const userDetails = {
        name,
        sub: authUser.id,
        email: userEmail,
        userType: "PARENT",
        unitNumber,
        address,
        lng,
        lat,
        phoneNumber: phoneNumber,
        pushToken: expoPushToken.data,
      };

      const { data, error } = await supabase
        .from("users")
        .insert(userDetails)
        //.eq("id", dbUser.id)
        .select();

      if (error) {
        throw error;
      }

      const newUser = data[0];
      setDbUser(newUser);

      return newUser;
    } catch (e) {
      Alert.alert("Error creating user", e.message);
    }
  };

  const createStudentAddress = async (kidId, address) => {
    try {
      const addressDetails = {
        studentId: kidId,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        province: address.province,
        zipCode: address.zipCode,
        unitNumber,
        lat,
        lng,
        country: address.country,
      };
      const { data, error } = await supabase
        .from("students_address")
        .insert(addressDetails)
        .select();

      if (error) {
        throw error;
      }

      return data[0].id;
    } catch (e) {
      Alert.alert("Error creating student address", e.message);
    }
  };

  const updateKidDropOffAddress = async (kidId, addressId) => {
    try {
      const updateData = {
        dropOffAddress: addressId,
      };

      const { data, error } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", kidId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error updating drop off address on students", error);
    }
  };

  const updateKidUserID = async (newUser) => {
    try {
      for (const kid of kids) {
        // Determine the parent field to update
        // const parentField =
        //   kid.parent1Email === null ? "parent2Id" : "parent1Id";

        // // Prepare the update data
        let parentField = null;

        // Determine the parent field to update based on the new user's email
        if (kid.parent1Email === newUser.email) {
          parentField = "parent1Id";
        } else if (kid.parent2Email === newUser.email) {
          parentField = "parent2Id";
        }
        if (parentField) {
          const updateData = {};
          updateData[parentField] = newUser.id;

          // Update the student's parent ID in the Supabase `students` table
          const { data, error } = await supabase
            .from("students")
            .update(updateData)
            .eq("id", kid.id);

          if (error) {
            throw error;
          }
        }
      }
    } catch (e) {
      Alert.alert("Error updating kid", e.message);
    }
  };

  const onSave = async () => {
    try {
      // Update the user and get the updated user object
      const newUser = await onCreateUser();
      // update the ParentId of kids
      await updateKidUserID(newUser);

      // create a new student_address with the same address of current user if not already exists
      const userAddress = completeAddress;
      // loop throughout all kids
      for (let kid of kids) {
        if (kid.dropOffAddress === null) {
          const kidId = kid.id;
          // Create a new student_address entry with user's address
          const newKidAddressId = await createStudentAddress(
            kidId,
            userAddress
          );

          // Assign the new address id to dropOffAddress on students table
          await updateKidDropOffAddress(kidId, newKidAddressId);
        }
      }

      // Update the kids with the updated user object
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const parseAddressComponents = (addressComponents) => {
    const address = {
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      zipCode: "",
      country: "",
    };

    addressComponents.forEach((component) => {
      const types = component.types;

      if (types.includes("street_number")) {
        address.addressLine1 = component.long_name + " " + address.addressLine1;
      }
      if (types.includes("route")) {
        address.addressLine1 += component.long_name;
      }
      if (types.includes("locality")) {
        address.city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        address.province = component.short_name;
      }
      if (types.includes("postal_code")) {
        address.zipCode = component.long_name;
      }
      if (types.includes("country")) {
        address.country = component.long_name;
      }
    });

    return address;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Complete your Profile</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        style={styles.input}
      />
      <GooglePlacesAutocomplete
        nearbyPlacesAPI="GooglePlacesSearch"
        placeholder="Address"
        listViewDisplayed="auto"
        //textInputProps={}
        debounce={400}
        minLength={2}
        onFail={(error) => console.log(error)}
        onNotFound={() => console.log("no results")}
        enablePoweredByContainer={false}
        fetchDetails={true}
        autoFocus={true}
        styles={autoComplete}
        onPress={(data, details = null) => {
          const completeAddress = parseAddressComponents(
            details.address_components
          );
          setCompleteAddress(completeAddress);
          setAddress(details.formatted_address);
          setLat(details.geometry.location.lat);
          setLng(details.geometry.location.lng);
        }}
        query={{
          key: GOOGLE_MAPS_APIKEY,
          Language: "en",
          components: "country:ca",
        }}
      />
      <TextInput
        value={unitNumber}
        onChangeText={setUnitNumber}
        placeholder="Unit Number"
        style={styles.input}
      />
      <View style={styles.phoneInputContainer}>
        <PhoneInput
          ref={phoneInputRef}
          value={phoneNumber}
          //onChangeText={setPhoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
          }}
          defaultCode="CA"
          layout="first"
          placeholder="Phone Number"
          //style={styles.phoneInputField}
          //style={styles.phoneInput}
        />
        <TouchableOpacity
          style={styles.okButton}
          onPress={() => {
            handleConfirm();
          }}
        >
          <Text style={styles.okButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
      <View>
        <Text style={styles.subTitle}>
          Please confirm your child{kids.length > 1 ? "s" : ""} name
          {kids.length > 1 ? "s" : ""}
        </Text>
        {kids.map((kid, index) => (
          <View key={index} style={styles.kidContainer}>
            <Text style={styles.kidName}>{kid.name}</Text>
            <TouchableOpacity
              style={
                confirmations[index]
                  ? styles.confirmedButton
                  : styles.confirmButton
              }
              onPress={() => toggleKidConfirmation(index)}
            >
              <Text style={styles.confirmButtonText}>
                {confirmations[index] ? "Confirmed" : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        {isSaveButtonVisible && (
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    margin: 10,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    margin: 10,
    marginTop: 10,
  },
  input: {
    marginLeft: 10,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
    width: "95%",
    //margin: 10,
  },
  googleAutoComp: {
    padding: 20,
  },
  kidContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  container: {
    flex: 1,
    marginTop: 50,
    backgroundColor: "#E0E0E0",
    //justifyContent: "space-between",
    //padding: 20,
  },
  kidName: {
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: "gray",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    elevation: 2,
  },
  confirmedButton: {
    backgroundColor: "green",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    elevation: 2,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  confirmedButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "blue",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 15,
  },
  saveContainer: {
    padding: 10,
    alignItems: "center",
    //width: '30%'
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  signOutButton: {
    backgroundColor: "red",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
  },
  signOutButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    //borderWidth: 1,
    //borderColor: '#ccc',
    //borderRadius: 5,
    paddingHorizontal: 10,
  },

  okButton: {
    backgroundColor: "green",
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  okButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    padding: 5,
  },
});

const autoComplete = {
  container: {
    margin: 10,
    flex: 0,
  },
  textInput: {
    fontSize: 16,
    marginBottom: 1,
  },
};
export default CompleteProfileScreen;
