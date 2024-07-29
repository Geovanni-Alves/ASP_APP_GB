import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import React, { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUsersContext } from "../../contexts/UsersContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import { useNavigation } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_APIKEY } from "@env";
import PhoneInput from "react-native-phone-number-input";
import { supabase } from "../../lib/supabase"; // Ensure this is the correct path to your Supabase client

const ProfileScreen = () => {
  const { authUser, setDbUser, dbUser, userEmail } = useUsersContext();
  const { expoPushToken } = usePushNotificationsContext();

  const [name, setName] = useState(dbUser?.name || "");
  const [address, setAddress] = useState(dbUser?.address || "");
  const [phoneNumber, setPhoneNumber] = useState(dbUser?.phoneNumber || "");
  const phoneInputRef = useRef(null);

  const [lat, setLat] = useState(dbUser?.lat || null);
  const [lng, setLng] = useState(dbUser?.lng || null);

  const navigation = useNavigation();

  const handleConfirm = () => {
    if (phoneInputRef.current.isValidNumber(phoneNumber)) {
      Keyboard.dismiss();
    } else {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
    }
  };

  const onSave = async () => {
    if (dbUser) {
      await onUpdateUser();
    } else {
      await onCreateUser();
    }
    navigation.navigate("Home");
  };

  // const onUpdateUser = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from("users")
  //       .update({
  //         name,
  //         sub: authUser.id,
  //         address,
  //         phoneNumber,
  //         lat: parseFloat(lat),
  //         lng: parseFloat(lng),
  //       })
  //       .eq("id", dbUser.id);

  //     if (error) throw error;

  //     setDbUser(data[0]);
  //   } catch (error) {
  //     Alert.alert("Error updating user", error.message);
  //   }
  // };

  const onCreateUser = async () => {
    try {
      const userDetails = {
        sub: authUser.id,
        name,
        userType: "STAFF",
        address,
        lng,
        lat,
        phoneNumber,
        pushToken: expoPushToken.data,
        email: userEmail,
      };

      const { data, error } = await supabase
        .from("users")
        .insert(userDetails)
        .select("*");

      if (error) throw error;

      setDbUser(data[0]);
    } catch (error) {
      Alert.alert("Error saving new user", error.message);
    }
  };

  return (
    <SafeAreaView>
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
        debounce={400}
        minLength={2}
        onFail={(error) => console.log(error)}
        onNotFound={() => console.log("no results")}
        enablePoweredByContainer={false}
        fetchDetails={true}
        autoFocus={true}
        styles={autoComplete}
        onPress={(data, details = null) => {
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
      <View>
        <View style={styles.saveContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
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
    margin: 10,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 5,
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
    justifyContent: "space-between",
    padding: 20,
  },
  kidName: {
    fontSize: 16,
  },
  confirmButton: {
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
    paddingHorizontal: 10,
  },
  phoneInputField: {
    flex: 1,
    paddingVertical: 8,
  },
  okButton: {
    backgroundColor: "green",
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  okButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});

const autoComplete = {
  container: {
    margin: 10,
    flex: 0,
  },
  TextInput: {
    fontSize: 18,
  },
};

export default ProfileScreen;
