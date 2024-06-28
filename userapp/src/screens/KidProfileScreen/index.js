import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { supabase } from "../../lib/supabase";
import styles from "./styles";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import { SafeAreaView } from "react-native-safe-area-context";
import RemoteImage from "../../components/RemoteImage";
import PhotoOptionsModal from "../../components/PhotoOptionsModal";

// import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
// import { GOOGLE_MAPS_APIKEY } from "@env";

const KidProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: kidId, title } = route.params;
  const [kid, setKid] = useState(null);
  const [photoChangeLoading, setPhotoChangeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [formChanges, setFormChanges] = useState({});
  const [isConfirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isPhotoOptionsModalVisible, setPhotoModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [addresses, setAddresses] = useState(kid?.addresses || []);
  const [newAddress, setNewAddress] = useState("");

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

  const fetchData = async () => {
    setRefreshing(true);
    await fetchKidData();
    setRefreshing(false);
  };

  const fetchKidData = async () => {
    if (kidId) {
      try {
        let { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("id", kidId)
          .single();

        if (error) {
          throw error;
        }

        const fetchedKid = data;
        //console.log("kids", fetchedKid);
        setKid(fetchedKid);
        setActualPhoto(fetchedKid.photo);
      } catch (error) {
        console.error("Error fetching kid:", error);
      }
    }
  };

  useEffect(() => {
    if (kidId) {
      fetchData();
    }
  }, [kidId]);

  const handleUpdateKid = async () => {
    setConfirmationModalVisible(true);
  };

  const confirmUpdateKid = async () => {
    try {
      const updatedFields = Object.keys(formChanges);
      if (updatedFields.length > 0) {
        const { error } = await supabase
          .from("students")
          .update(formChanges)
          .eq("id", kidId);

        if (error) {
          throw error;
        }

        await fetchData();
        setFormChanges({});
      }
    } catch (error) {
      console.error("Error updating kid's data:", error);
    } finally {
      setConfirmationModalVisible(false);
      setShowConfirmationModal(true);
    }
  };

  const cancelUpdateKid = () => {
    setConfirmationModalVisible(false);
  };

  const handleNewPhoto = async (imagePath) => {
    setPhotoChangeLoading(true);

    try {
      if (imagePath) {
        await updateKidImage(imagePath);
        setActualPhoto(imagePath);
      }
    } catch (error) {
      console.error("Error saving image to storage", error);
    } finally {
      setPhotoChangeLoading(false);
    }
  };

  const updateKidImage = async (filename) => {
    try {
      if (!filename || !kidId) {
        throw new Error("Filename or kidId is not defined");
      }

      const kidDetails = {
        photo: filename,
      };

      const { data, error } = await supabase
        .from("students")
        .update(kidDetails)
        .eq("id", kidId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error updating kid's image:", error.message);
    }
  };

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <SafeAreaView style={styles.topContainer}>
          <View style={styles.imageWrapper}>
            <TouchableOpacity onPress={() => setPhotoModalVisible(true)}>
              <View style={styles.imageContainer}>
                <RemoteImage
                  path={actualPhoto}
                  style={styles.kidPhoto}
                  name={kid?.name}
                />
              </View>
              <View style={styles.cameraIcon}>
                <Text
                  style={{
                    position: "absolute",
                    bottom: -10,
                    right: 3,
                    fontSize: 15,
                    fontWeight: "500",
                  }}
                >
                  Edit
                </Text>
                <MaterialIcons name="photo-camera" size={32} color="#FF7276" />
              </View>
            </TouchableOpacity>
            {photoChangeLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }, [actualPhoto, photoChangeLoading]);

  const handleChangeText = useCallback((key, value) => {
    setFormChanges((prevFormChanges) => ({
      ...prevFormChanges,
      [key]: value,
    }));
  }, []);

  const handleConfirmDate = (date) => {
    setFormChanges((prevFormChanges) => ({
      ...prevFormChanges,
      birthDate: date.toISOString().split("T")[0],
    }));
    setDatePickerVisible(false);
  };

  const renderKidDetailsItem = ({ item }) => {
    if (item.type === "address") {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          {addresses.map((address, index) => (
            <Text key={index} style={styles.detailTextInput}>
              {address}
            </Text>
          ))}

          <View style={styles.addAddressContainer}>
            <TextInput
              style={styles.input}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Enter new address"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                const title = `${kid.name} Addresses`;
                navigation.navigate("AddressList", {
                  id: kid.id,
                  name: kid.name,
                  title,
                });
              }}
            >
              <FontAwesome name="plus-circle" size={24} color="#007BFF" />
              <Text style={styles.addButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (item.key === "birthDate") {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
            <Text style={styles.detailTextInput}>
              {formChanges.birthDate || kid?.birthDate || "Select Date"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleConfirmDate}
            onCancel={() => setDatePickerVisible(false)}
          />
        </View>
      );
    } else {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          <TextInput
            style={styles.detailTextInput}
            defaultValue={kid[item.key] || ""}
            onChangeText={(text) => handleChangeText(item.key, text)}
          />
        </View>
      );
    }
  };

  const detailsData = [
    { label: "Full Name:", key: "name" },
    { label: "Address", key: "address", type: "address" },
    { label: "Birthday:", key: "birthDate" },
    { label: "Notes:", key: "notes" },
    { label: "Allergies:", key: "allergies" },
    { label: "Medicine:", key: "medicine" },
  ];

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
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.container}>
        <FlatList
          ListHeaderComponent={renderHeader}
          data={detailsData}
          renderItem={renderKidDetailsItem}
          keyExtractor={(item, index) => index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
          }
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleUpdateKid}
            disabled={Object.keys(formChanges).length === 0}
            style={[
              styles.saveButton,
              Object.keys(formChanges).length === 0 && styles.disabledButton,
            ]}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
        <PhotoOptionsModal
          isVisible={isPhotoOptionsModalVisible}
          onClose={() => setPhotoModalVisible(false)}
          onSelectOption={handleNewPhoto}
        />
        <ConfirmationModal
          isVisible={isConfirmationModalVisible}
          onConfirm={confirmUpdateKid}
          onCancel={cancelUpdateKid}
          questionText={"Confirm all updates?"}
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

export default KidProfileScreen;

{
  /* <GooglePlacesAutocomplete
query={{
  key: GOOGLE_MAPS_APIKEY,
  language: "en",
  components: "country:ca",
}}
nearbyPlacesAPI="GooglePlacesSearch"
placeholder="Address"
onPress={(data, details) => {
  console.log("pressed");
  if (details) {
    console.log(data, details);
  }
  // setAddress(details.formatted_address);
  // const address = details.formatted_address || "";
  // handleChangeText(item.key, address);
}}
listViewDisplayed="auto"
debounce={400}
minLength={2}
onFail={(error) => console.log(error)}
onNotFound={() => console.log("no results")}
enablePoweredByContainer={false}
fetchDetails={true}
styles={googleAutoCompleteStyles}
/> */
}
