import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Entypo } from "@expo/vector-icons";
import { supabase } from "../../../backend/lib/supabase";
import { usePicturesContext } from "../../contexts/PicturesContext";
import styles from "./styles";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import { SafeAreaView } from "react-native-safe-area-context";
import RemoteImage from "../../components/RemoteImage";

const KidProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { savePhotoInBucket } = usePicturesContext();

  const kidId = route.params?.id;

  const [kid, setKid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [formChanges, setFormChanges] = useState({});
  const [isConfirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const getInitials = (name) => {
    const nameArray = name.split(" ");
    return nameArray
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

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
        //console.log(fetchedKid.photo);
        setKid(fetchedKid);

        // if (fetchedKid && fetchedKid.photo) {
        //   //const imageURL = await getPhotoInBucket(fetchedKid.photo);

        setActualPhoto(fetchedKid.photo);
        // }
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
      setLoading(true);
      const imagePath = await savePhotoInBucket();
      //const filename = imagePath.imagePath;
      if (imagePath) {
        await updateKidImage(imagePath);
        alert("Image successfully updated!");
        //await fetchData();
      } else {
        console.log("Image selection canceled or encountered an error");
      }
    } catch (error) {
      console.error("Error saving image to storage", error);
    } finally {
      setLoading(false);
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

      // console.log(
      //   "Updating kid image with details:",
      //   kidDetails,
      //   "for kidId:",
      //   kidId
      // );

      const { data, error } = await supabase
        .from("students")
        .update(kidDetails)
        .eq("id", kidId);

      if (error) {
        throw error;
      }

      //console.log("Kid image updated successfully:", data);
    } catch (error) {
      console.error("Error updating kid's image:", error.message);
    }
  };

  const goBack = () => {
    navigation.goBack();
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

  const renderItemSeparator = () => {
    return <View style={styles.separator} />;
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
      <View style={styles.headerContainer}>
        <View style={styles.containerMenu}>
          <TouchableOpacity style={styles.goBackIcon} onPress={() => goBack()}>
            <Entypo name="chevron-left" size={30} color="white" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.kidNameText}>{kid?.name}'s Profile</Text>
          </View>
        </View>
      </View>
      <SafeAreaView style={styles.topContainer}>
        <TouchableOpacity onPress={handleChangePhoto}>
          <View style={styles.imageContainer}>
            {actualPhoto ? (
              <RemoteImage path={actualPhoto} style={styles.kidPhoto} />
            ) : (
              <View>
                <Text style={styles.placeholderText}>
                  {getInitials(kid.name)}
                </Text>
              </View>
            )}
            <MaterialIcons name="add-a-photo" size={24} color="#FF7276" />
          </View>
        </TouchableOpacity>
      </SafeAreaView>
      <FlatList
        data={detailsData}
        renderItem={renderKidDetailsItem}
        keyExtractor={(item, index) => index.toString()}
        ItemSeparatorComponent={renderItemSeparator}
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
