import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import styles from "./styles";
import { GOOGLE_MAPS_APIKEY } from "@env";
import { useKidsContext } from "../../contexts/KidsContext";

const AddAddressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const kidId = route.params?.kidId;
  const currentAddress = route.params?.address || null;
  const mode = route.params?.mode;
  const from = route.params?.from;
  const [formChanged, setFormChanged] = useState(false);
  const { RefreshKidsData } = useKidsContext();
  //
  const [address, setAddress] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [houseName, setHouseName] = useState(null);
  const [addressNotes, setAddressNotes] = useState(null);
  const [unitNumber, setUnitNumber] = useState(null);
  const [city, setCity] = useState(null);
  const [province, setProvince] = useState(null);
  const [zipCode, setZipCode] = useState(null);
  const [country, setCountry] = useState(null);

  useEffect(() => {
    if (mode === "update" && currentAddress) {
      setAddress(currentAddress.addressLine1);
      setLat(currentAddress.lat);
      setLng(currentAddress.lng);
      setHouseName(currentAddress.houseName);
      setAddressNotes(currentAddress.addressNotes);
      setUnitNumber(currentAddress.unitNumber);
      setCity(currentAddress.city);
      setProvince(currentAddress.province);
      setZipCode(currentAddress.zipCode);
      setCountry(currentAddress.country);
    } else if (mode === "insert") {
      setAddress("");
      setLat(null);
      setLng(null);
      setHouseName("");
      setAddressNotes("");
      setUnitNumber("");
      setCity("");
      setProvince("");
      setZipCode("");
      setCountry("");
    }
  }, [mode, currentAddress]);

  const goBack = () => {
    if (from === "kidProfile") {
      navigation.navigate("Address Info");
    } else {
      navigation.navigate("AddressList", {
        kidId: kidId,
      });
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title: "Address",
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [route]);

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
      let data, error;

      if (mode === "update") {
        ({ data, error } = await supabase
          .from("students_address")
          .update({
            houseName,
            addressLine1: address,
            addressNotes,
            unitNumber,
            city,
            province,
            zipCode,
            country,
            lat,
            lng,
          })
          .eq("id", currentAddress.id));

        if (error) {
          throw error;
        }
      } else {
        // Check if the user already has any addresses
        const { data: existingAddresses, error: fetchError } = await supabase
          .from("students_address")
          .select("*")
          .eq("studentId", kidId);

        if (fetchError) {
          throw fetchError;
        }

        const isFirstAddress = existingAddresses.length === 0;

        // Insert new address
        const { data: newAddressData, error: insertError } = await supabase
          .from("students_address")
          .insert([
            {
              studentId: kidId,
              houseName,
              addressLine1: address,
              addressNotes,
              unitNumber,
              city,
              province,
              zipCode,
              country,
              lat,
              lng,
              isDefault: isFirstAddress,
            },
          ])
          .select();

        if (insertError) {
          throw insertError;
        }

        // If it's the first address, update the currentDropOffAddress in the students table
        if (isFirstAddress) {
          const newAddressId = newAddressData[0].id;
          //console.log("newAddressId", newAddressId);

          const { error: updateError } = await supabase
            .from("students")
            .update({ currentDropOffAddress: newAddressId })
            .eq("id", kidId);

          if (updateError) {
            throw updateError;
          }
        }
      }

      await RefreshKidsData();
      goBack();
    } catch (error) {
      console.error("Error saving address:", error.message);
      Alert.alert("Error", "Failed to save address");
    }
  };

  const handleAddressSelect = (data, details = null) => {
    const components = details.address_components;
    const latLng = details.geometry.location;
    const streetNumber =
      components.find((c) => c.types.includes("street_number"))?.long_name ||
      "";
    const route =
      components.find((c) => c.types.includes("route"))?.long_name || "";
    const addressLine1 = `${streetNumber} ${route}`;
    const city =
      components.find((c) => c.types.includes("locality"))?.long_name || "";
    const province =
      components.find((c) => c.types.includes("administrative_area_level_1"))
        ?.long_name || "";
    const zipCode =
      components.find((c) => c.types.includes("postal_code"))?.long_name || "";
    const country =
      components.find((c) => c.types.includes("country"))?.long_name || "";

    setAddress(addressLine1);
    setCity(city);
    setProvince(province);
    setZipCode(zipCode);
    setCountry(country);
    setFormChanged(true);
    setHouseName("My House");
    setLat(latLng.lat);
    setLng(latLng.lng);
  };

  const handleInputChange = () => {
    setFormChanged(true);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : null}
      keyboardVerticalOffset={Platform.OS === "ios" ? 65 : 0}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
          <Text style={styles.label}>Enter New Address:</Text>
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
            onPress={handleAddressSelect}
            query={{
              key: GOOGLE_MAPS_APIKEY,
              language: "en",
              components: "country:ca",
            }}
          />
        </View>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.textInput}
            value={address}
            editable={false}
          />
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.textInput} value={city} editable={false} />
          <Text style={styles.label}>Province</Text>
          <TextInput
            style={styles.textInput}
            value={province}
            editable={false}
          />
          <Text style={styles.label}>Zip Code</Text>
          <TextInput
            style={styles.textInput}
            value={zipCode}
            editable={false}
          />
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.textInput}
            value={country}
            editable={false}
          />
          <Text style={styles.label}>House Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="House Name"
            value={houseName}
            onChangeText={(text) => {
              setHouseName(text);
              setFormChanged(true);
            }}
          />
          <Text style={styles.label}>Address Notes</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Address Notes"
            value={addressNotes}
            onChangeText={(text) => {
              setAddressNotes(text);
              setFormChanged(true);
            }}
          />
          <Text style={styles.label}>Unit Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Unit Number"
            value={unitNumber}
            onChangeText={(text) => {
              setUnitNumber(text);
              setFormChanged(true);
            }}
          />
          <TouchableOpacity
            style={[styles.saveButton, !formChanged && styles.disabledButton]} // Disable style
            onPress={handleSaveAddress}
            disabled={!formChanged}
          >
            <Text style={styles.saveButtonText}>Save Address</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddAddressScreen;
