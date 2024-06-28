import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import styles from "./styles";

const AddressListScreen = ({ id, name }) => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidId = route.params?.id;
  const title = route.params?.title;
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);

  const goBack = () => {
    const title = `${name} Profile`;
    navigation.navigate("KidProfile", { id: id, title });
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
      setAddresses(data || []);
      const defaultAddress = data.find((address) => address.isDefault);
      setDefaultAddressId(defaultAddress ? defaultAddress.id : null);
    } catch (error) {
      console.error("Error fetching addresses:", error.message);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSetDefault = async (addressId) => {
    try {
      await supabase
        .from("students_address")
        .update({ isDefault: false })
        .eq("studentId", kidId);

      await supabase
        .from("students_address")
        .update({ isDefault: true })
        .eq("id", addressId);

      setDefaultAddressId(addressId);
    } catch (error) {
      console.error("Error setting default address:", error.message);
      Alert.alert("Error", "Failed to set default address");
    }
  };

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
        {item.id === defaultAddressId && (
          <FontAwesome
            name="check-circle"
            size={20}
            color="green"
            style={styles.defaultIcon}
          />
        )}
        <TouchableOpacity
          onPress={() => handleSetDefault(item.id)}
          style={styles.defaultButton}
        >
          <Text style={styles.defaultButtonText}>
            {item.id === defaultAddressId ? "Default" : "Set as Default"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>List of Drop Off Addresses:</Text>
      <FlatList
        data={addresses}
        renderItem={renderAddressItem}
        keyExtractor={(item) => item.id.toString()}
        style={{ marginBottom: 20 }}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddAddress", { kidId })}
      >
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddressListScreen;
