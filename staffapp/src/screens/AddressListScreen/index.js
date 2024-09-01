import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import styles from "./styles";
import { useKidsContext } from "../../contexts/KidsContext";

const AddressListScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidId = route.params?.kidId;
  //const kid = route.params?.kid;
  const useDropOffService = route.params?.useDropOff; //kid?.useDropOffService || false;
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { RefreshKidsData } = useKidsContext();
  const isOnRoute = false; // Placeholder for actual condition

  const goBack = () => {
    navigation.navigate("StudentProfile", {
      id: kidId,
    });
    console.log(route.params);
  };

  useEffect(() => {
    navigation.setOptions({
      title: "Drop-off Address List",
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
    console.log("route from address List", route.params);
  }, [route]);

  const fetchAddresses = async () => {
    if (!kidId) {
      //console.error("No kidId provided.");
      return;
    }

    try {
      let { data, error } = await supabase
        .from("students_address")
        .select("*")
        .eq("studentId", kidId);

      if (error) {
        throw error;
      }

      const sortedAddresses = data.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      setAddresses(sortedAddresses || []);
      const defaultAddress = data.find((address) => address.isDefault);
      setDefaultAddressId(defaultAddress ? defaultAddress.id : null);
    } catch (error) {
      console.error("Error fetching addresses:", error.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
      RefreshKidsData();
    }, [kidId])
  );

  // useEffect(() => {
  //   fetchAddresses();
  // }, [kidId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await RefreshKidsData();
    await fetchAddresses();
    setRefreshing(false);
  };

  const handleSetCurrentDropOff = async (addressId) => {
    if (isOnRoute) {
      Alert.alert(
        "Info",
        "Cannot change the current drop-off address while on route."
      );
      return;
    }

    try {
      await supabase
        .from("students_address")
        .update({ isDefault: false })
        .eq("studentId", kidId);

      await supabase
        .from("students_address")
        .update({ isDefault: true })
        .eq("id", addressId);

      await supabase
        .from("students")
        .update({ currentDropOffAddress: addressId })
        .eq("id", kidId);

      setDefaultAddressId(addressId);
      await RefreshKidsData();
      //Alert.alert("Success", "Current drop-off address updated successfully.");
      //goBack();
    } catch (error) {
      console.error("Error setting current drop-off address:", error.message);
      Alert.alert("Error", "Failed to set current drop-off address");
    }
  };

  const renderAddressItem = ({ item }) => {
    const isDefault = item.id === defaultAddressId;
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
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("AddAddress", {
            kidId,
            address: item,
            useDropOffService,
            mode: "update",
          })
        }
        style={[styles.addressItem, isDefault && styles.defaultAddressItem]}
      >
        <Text style={styles.addressTitle}>{title}</Text>
        {formattedSubtitles ? (
          <Text style={styles.addressSubtitle}>{formattedSubtitles}</Text>
        ) : null}
        {isDefault && (
          <FontAwesome
            name="check-circle"
            size={24}
            style={styles.defaultIcon}
          />
        )}
        <TouchableOpacity
          onPress={() => {
            if (!isDefault) {
              handleSetCurrentDropOff(item.id);
            }
          }}
          style={[
            styles.currentButton,
            isDefault
              ? styles.currentButtonInactive
              : styles.currentButtonActive,
          ]}
        >
          <Text style={styles.currentButtonText}>
            {isOnRoute ? "On Route" : "Set as Current"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate("AddAddress", {
            kidId,
            useDropOffService,
            mode: "insert",
          })
        }
      >
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddressListScreen;
