import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import styles from "./styles";
import { GOOGLE_MAPS_APIKEY } from "@env";

const AddAddressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const kidId = route.params?.kidId;
  const [address, setAddress] = useState("");
  const [houseName, setHouseName] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [unitNumber, setUnitNumber] = useState("");

  const autoComplete = {
    container: {
      margin: 10,
      flex: 0,
    },
    textInput: {
      fontSize: 18,
    },
  };

  const handleSaveAddress = async () => {
    if (!address.trim()) {
      Alert.alert("Error", "Address cannot be empty");
      return;
    }

    try {
      const { data, error } = await supabase.from("students_address").insert([
        {
          studentId: kidId,
          houseName,
          addressLine1: address,
          addressNotes,
          unitNumber,
          isDefault: false,
        },
      ]);

      if (error) {
        throw error;
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving address:", error.message);
      Alert.alert("Error", "Failed to save address");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter Address:</Text>
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
        }}
        query={{
          key: GOOGLE_MAPS_APIKEY,
          language: "en",
          components: "country:ca",
        }}
      />
      <TextInput
        style={styles.textInput}
        placeholder="House Name"
        value={houseName}
        onChangeText={setHouseName}
      />
      <TextInput
        style={styles.textInput}
        placeholder="Address Notes"
        value={addressNotes}
        onChangeText={setAddressNotes}
      />
      <TextInput
        style={styles.textInput}
        placeholder="Unit Number"
        value={unitNumber}
        onChangeText={setUnitNumber}
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
        <Text style={styles.saveButtonText}>Save Address</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddAddressScreen;
