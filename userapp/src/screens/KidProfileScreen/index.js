import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { supabase } from "../../lib/supabase";
import { usePicturesContext } from "../../contexts/PicturesContext";
import styles from "./styles";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import { SafeAreaView } from "react-native-safe-area-context";
import RemoteImage from "../../components/RemoteImage";

const KidProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const kidId = route.params?.id;
  const title = route.params?.title;
  const [kid, setKid] = useState(null);
  const [photoChangeLoading, setPhotoChangeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [formChanges, setFormChanges] = useState({});
  const [isConfirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const { savePhotoInBucket } = usePicturesContext();

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

  useEffect(() => {
    if (kidId) {
      fetchData();
    }
  }, []);

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
        setKid(fetchedKid);
        setActualPhoto(fetchedKid.photo);
      } catch (error) {
        console.error("Error fetching kid:", error);
      }
    }
  };

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

  const handleChangePhoto = async () => {
    try {
      setPhotoChangeLoading(true);
      const imagePath = await savePhotoInBucket();
      if (imagePath.assets !== null) {
        await updateKidImage(imagePath);
        alert("Image successfully updated!");
      } else {
        console.log("Image selection canceled or encountered an error");
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

  const handleChangeText = (key, value) => {
    setKid({ ...kid, [key]: value });
    setFormChanges({ ...formChanges, [key]: value });
  };

  const renderKidDetailsItem = ({ item }) => {
    return (
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>{item.label}</Text>
        <TextInput
          style={styles.detailTextInput}
          value={kid[item.key] || ""}
          onChangeText={(text) => handleChangeText(item.key, text)}
        />
      </View>
    );
  };
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {photoChangeLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Changing Photo...</Text>
          </View>
        )}
        <SafeAreaView style={styles.topContainer}>
          <TouchableOpacity onPress={handleChangePhoto}>
            <View style={styles.imageContainer}>
              <RemoteImage
                path={actualPhoto}
                style={styles.kidPhoto}
                name={kid.name}
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
        </SafeAreaView>
      </View>
    );
  };

  if (!kid) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        size={"large"}
      />
    );
  }

  const detailsData = [
    { label: "Full Name:", key: "name" },
    { label: "Birthday:", key: "birthDate" },
    { label: "Notes:", key: "notes" },
    { label: "Allergies:", key: "allergies" },
    { label: "Medicine:", key: "medicine" },
    { label: "Address:", key: "dropOffAddress" },
  ];

  return (
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
  );
};

export default KidProfileScreen;
