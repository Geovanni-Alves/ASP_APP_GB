// AddAddressScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import styles from "./styles";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_APIKEY } from "@env";

const AddAddressScreen = ({ kid }) => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidId = route.params?.id;
  const currentKidDropOffAddress = route.params?.dropOffAddress;
  const title = route.params?.title;
  const [address, setAddress] = useState("");
  const [addresses, setAddresses] = useState([]);

  const goBack = () => {
    const title = `${kid?.name} Updates`;
    navigation.navigate("Feed", { id: kid?.id, title });
  };

  useEffect(() => {
    navigation.setOptions({
      title: title,
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [route]);

  const fetchAddresses = async () => {
    try {
      let { data, error } = await supabase
        .from("students_address")
        .select("*")
        .eq("studentId", kidId);

      if (error) {
        throw error;
      }
      const addresses = data || [];
      setAddresses(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error.message);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const autoComplete = {
    container: {
      margin: 10,
      flex: 0,
    },
    TextInput: {
      fontSize: 18,
    },
  };

  const handleSaveAddress = async () => {};

  const renderAddressItem = ({ item }) => {
    const title = item.houseName || item.addressLine1;

    const subtitles = [
      item.houseName ? item.addressLine1 : null,
      item.addressLine2,
      item.unitNumber,
      item.city,
      item.province,
      item.country,
      item.zipCode,
      item.addressNotes,
    ].filter((part) => part && part.trim() !== "");

    const formattedSubtitles = subtitles.join(", ");

    return (
      <View style={styles.addressItem}>
        <Text style={styles.addressTitle}>{title}</Text>
        {formattedSubtitles ? (
          <Text style={styles.addressSubtitle}>{formattedSubtitles}</Text>
        ) : null}
        {item.id === currentKidDropOffAddress && (
          <FontAwesome
            name="star"
            size={20}
            color="gold"
            style={styles.defaultIcon}
          />
        )}
      </View>
    );
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
          Language: "en",
          components: "country:ca",
        }}
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
        <Text style={styles.saveButtonText}>Save Address</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 20 }]}>List of Addresses:</Text>
      <FlatList
        data={addresses}
        renderItem={renderAddressItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        style={{ marginBottom: 20 }}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setAddress("")}>
        <Text style={styles.addButtonText}>+</Text>
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddAddressScreen;
