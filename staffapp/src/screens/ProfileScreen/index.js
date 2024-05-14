import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePushNotificationsContext } from "../../contexts/PushNotificationsContext";
import { useNavigation } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_APIKEY } from "@env";
import { API, graphqlOperation } from "aws-amplify";
import PhoneInput from "react-native-phone-number-input";
import { createUser, updateUser } from "../../graphql/mutations";
//import { Auth } from "aws-amplify";

const ProfileScreen = () => {
  const { sub, setDbUser, dbUser, userEmail } = useAuthContext();
  const { expoPushToken } = usePushNotificationsContext();

  const [name, setName] = useState(dbUser?.name || "");
  const [address, setAddress] = useState(dbUser?.address || "");
  const [phoneNumber, setPhoneNumber] = useState(dbUser?.phoneNumber || "");
  const phoneInputRef = useRef(null);

  const [lat, setLat] = useState(dbUser?.lat || null);
  const [lng, setLng] = useState(dbUser?.lng || null);

  const navigation = useNavigation();

  const handleConfirm = () => {
    //console.log(phoneInputRef.current)

    if (phoneInputRef.current.isValidNumber(phoneNumber)) {
      // The phone number is valid, proceed to another control or screen
      //Alert.alert('Valid Phone Number', 'You can proceed to the next step.');
      Keyboard.dismiss();
    } else {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
    }
  };

  const onSave = async () => {
    if (dbUser) {
      await OnUpdateUser();
    } else {
      await OnCreateUser();
    }
    navigation.navigate("Home");
  };

  const OnUpdateUser = async () => {
    // const user = await DataStore.save(
    //   User.copyOf(dbUser, (updated) => {
    //     updated.name = name;
    //     // updated.unitNumber = unitNumber;
    //     updated.address = address;
    //     updated.phoneNumber = phoneNumber;
    //     updated.lat = parseFloat(lat);
    //     updated.lng = parseFloat(lng);
    //   })
    // );
    // setDbUser(user);
  };

  const OnCreateUser = async () => {
    try {
      const userDetails = {
        sub,
        name,
        userType: "STAFF",
        address,
        lng,
        lat,
        phoneNumber,
        pushToken: expoPushToken.data,
        email: userEmail,
        //lat: parseFloat(lat),
        //lng: parseFloat(lng),
      };
      const response = await API.graphql(
        graphqlOperation(createUser, { input: userDetails })
      );
      const newUser = response.data.createUser; // Access the user data from the response
      const userId = newUser.id; // Access the ID of the newly created user

      setDbUser(newUser);
    } catch (e) {
      Alert.alert("Error saving new user", e.message);
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
          //onChangeText={setPhoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
          }}
          defaultCode="CA"
          layout="first"
          placeholder="Phone Number"
          style={styles.phoneInputField}
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
        <View style={styles.saveContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
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
    //borderWidth: 1,
    //borderColor: '#ccc',
    //borderRadius: 5,
    paddingHorizontal: 10,
  },
  phoneInputField: {
    flex: 1,
    paddingVertical: 8, // Adjust the padding as needed
  },
  okButton: {
    backgroundColor: "green",
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 5, // Adjust the margin as needed
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
