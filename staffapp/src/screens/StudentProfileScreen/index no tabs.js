import styles from "./styles";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { FontAwesome, Entypo } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { supabase } from "../../lib/supabase";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import RemoteImage from "../../components/RemoteImage";
//import PhotoOptionsModal from "../../components/PhotoOptionsModal";
import OpenCamera from "../../components/OpenCamera";
import { useKidsContext } from "../../contexts/KidsContext";

const StudentProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: kidId } = route.params;
  const [kid, setKid] = useState(null);
  //const [photoChangeLoading, setPhotoChangeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actualPhoto, setActualPhoto] = useState(null);
  const [isConfirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  //const [isPhotoOptionsModalVisible, setPhotoModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  //const [addresses, setAddresses] = useState([]);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicine, setMedicine] = useState("");
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [callOpenCamera, setCallOpenCamera] = useState(false);
  const [schoolList, setSchoolList] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isSchoolModalVisible, setSchoolModalVisible] = useState(false);
  const [schoolExitPhoto, setSchoolExitPhoto] = useState(null);
  const [callOpenCameraForSchool, setCallOpenCameraForSchool] = useState(false);
  const cameraMode = "photo";
  const { RefreshKidsData, kids } = useKidsContext();

  const goBack = () => {
    navigation.navigate("StudentFeed", { id: kidId });
  };

  const fetchData = async () => {
    setRefreshing(true);
    await fetchKidData();
    setRefreshing(false);
  };

  const fetchKidData = async () => {
    if (kidId) {
      try {
        // Fetch the student data
        let { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(
            `
            *,
            schools(
            id,name
            )
          `
          )
          .eq("id", kidId)
          .single();

        if (studentError) {
          throw studentError;
        }

        const fetchedKid = studentData;
        console.log("fetchedKid", fetchedKid);
        const currentDropOffAddressId = fetchedKid.currentDropOffAddress;

        if (currentDropOffAddressId) {
          // Fetch the current drop-off address
          let { data: currentDropOffAddress, error: addressError } =
            await supabase
              .from("students_address")
              .select("*")
              .eq("id", currentDropOffAddressId)
              .single();
          if (addressError) {
            throw addressError;
          }
          // Set the fetched drop-off address to the kid object
          fetchedKid.dropOffAddress = currentDropOffAddress;
        }

        // else {
        //   setAddresses(fetchedKid.dropOffAddress);
        // }

        // Update state with fetched data
        setKid(fetchedKid);
        setActualPhoto(fetchedKid.photo);
        setName(fetchedKid.name);
        setBirthDate(fetchedKid.birthDate);
        setNotes(fetchedKid.notes);
        setAllergies(fetchedKid.allergies);
        setMedicine(fetchedKid.medicine);
        //console.log("fetchedKid", fetchedKid);
        if (fetchedKid.schools) {
          setSelectedSchool(fetchedKid.schools);
        }
      } catch (error) {
        console.error("Error fetching kid:", error);
      }
    }
  };

  useEffect(() => {
    fetchData();
    setActualPhoto(null);
  }, [kidId, kids]);

  const fetchSchoolList = async () => {
    try {
      const { data: schoolData, error } = await supabase
        .from("schools")
        .select("*");

      if (error) {
        throw error;
      }
      if (schoolData) {
        setSchoolList(schoolData);
      }
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  useEffect(() => {
    fetchSchoolList();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack} style={styles.goBackIcon}>
          <FontAwesome name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
      ),
    });
    if (kid) {
      navigation.setOptions({
        title: `${kid?.name} Profile`,
      });
    }
  }, [route, kid]);

  const handleSelectSchool = (school) => {
    setSelectedSchool(school);
    console.log(school);
    setSchoolModalVisible(false);
  };

  <Modal
    visible={isSchoolModalVisible}
    onRequestClose={() => setSchoolModalVisible(false)}
  >
    <FlatList
      data={schoolList}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleSelectSchool(item)}>
          <Text>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  </Modal>;

  const handleUpdateKid = async () => {
    setConfirmationModalVisible(true);
  };

  const confirmUpdateKid = async () => {
    try {
      const kidDetails = {
        name,
        birthDate,
        notes,
        allergies,
        medicine,
      };

      const { error } = await supabase
        .from("students")
        .update(kidDetails)
        .eq("id", kidId);

      if (error) {
        throw error;
      }

      await fetchData();
      await RefreshKidsData();
      setIsFormChanged(false);
    } catch (error) {
      console.error("Error updating kid's data:", error);
    } finally {
      setConfirmationModalVisible(false);
      setShowConfirmationModal(true);
    }
  };

  const handleImagePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const cancelUpdateKid = () => {
    setConfirmationModalVisible(false);
  };

  const handleSelectOption = (imagePath) => {
    console.log("Image path received:", imagePath);
    setCallOpenCamera(false);
  };

  const handleNewSchoolPhoto = async (imagePath) => {
    setCallOpenCameraForSchool(false);
    try {
      if (imagePath) {
        console.log("image", imagePath[0]);
        setSchoolExitPhoto(imagePath[0]);
        // await supabase
        //   .from("students")
        //   .update({ schoolExitPhoto: imagePath })
        //   .eq("id", kidId);
      }
    } catch (error) {
      console.error("Error uploading exit door photo:", error);
    }
  };

  const handleNewPhoto = async (Paths) => {
    const imagePath = Paths[0];
    setCallOpenCamera(false);

    try {
      if (imagePath) {
        await updateKidImage(imagePath);
        setActualPhoto(imagePath);
      }
    } catch (error) {
      console.error("Error saving image to storage", error);
    } finally {
      //setPhotoChangeLoading(false);
      await RefreshKidsData();
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

  const handleConfirmDate = (date) => {
    setBirthDate(date.toISOString().split("T")[0]);
    setIsFormChanged(true);
    setDatePickerVisible(false);
  };

  const handleInputChange = (setter) => (text) => {
    setter(text);
    setIsFormChanged(true);
  };

  const renderKidDetailsItem = ({ item }) => {
    if (item.key === "address" && kid?.useDropOffService === true) {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>Current DropOff Address:</Text>
          <View style={styles.addressContainer}>
            <View style={{ flex: 1 }}>
              {kid.dropOffAddress && (
                <View>
                  {/* Display houseName on the first line */}
                  {kid.dropOffAddress.houseName && (
                    <Text style={styles.detailTextInput}>
                      {kid.dropOffAddress.houseName}
                    </Text>
                  )}

                  {/* Display the rest of the address on the second line */}
                  <Text style={styles.detailTextInput}>
                    {`${kid.dropOffAddress.addressLine1}, `}
                    {kid.dropOffAddress.unitNumber &&
                      `${kid.dropOffAddress.unitNumber}, `}
                    {`${kid.dropOffAddress.city}, ${kid.dropOffAddress.province}, ${kid.dropOffAddress.zipCode}, ${kid.dropOffAddress.country}`}
                  </Text>

                  {/* Display addressNotes on a separate line */}
                  {kid.dropOffAddress.addressNotes && (
                    <Text style={styles.detailTextInput}>
                      {kid.dropOffAddress.addressNotes}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.dropOffButton}
              onPress={() => {
                navigation.navigate("AddressList", {
                  kidId: kid.id,
                  useDropOff: kid.useDropOffService,
                });
              }}
            >
              <Text style={styles.dropOffButtonText}>
                {kid.dropOffAddress ? "Change" : "Add new address"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (item.key === "address" && kid?.useDropOffService === false) {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          <View style={styles.addressContainer}>
            <View style={{ flex: 1 }}>
              {kid.dropOffAddress && (
                <View>
                  <Text style={styles.detailTextInput}>
                    {`${kid.dropOffAddress.addressLine1}, ${
                      kid.dropOffAddress.unitNumber
                        ? `${kid.dropOffAddress.unitNumber}, `
                        : ""
                    }${kid.dropOffAddress.city}, ${
                      kid.dropOffAddress.province
                    }, ${kid.dropOffAddress.zipCode}, ${
                      kid.dropOffAddress.country
                    }`}
                    {`${
                      kid.dropOffAddress.addressNotes
                        ? ` - ${kid.dropOffAddress.addressNotes}`
                        : ""
                    }`}
                  </Text>
                </View>
              )}
            </View>
            {kid.dropOffAddress ? (
              <TouchableOpacity
                style={styles.dropOffButton}
                onPress={() => {
                  navigation.navigate("AddAddress", {
                    address: kid.dropOffAddress,
                    kidId: kid?.id,
                    mode: "update",
                    from: "kidProfile",
                  });
                }}
              >
                <Text style={styles.dropOffButtonText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.dropOffButton}
                onPress={() => {
                  navigation.navigate("AddAddress", {
                    kidId: kid?.id,
                    mode: "insert",
                    from: "kidProfile",
                  });
                }}
              >
                <Text style={styles.dropOffButtonText}>Add new address</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    } else if (item.key === "birthDate") {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
            <Text style={styles.detailTextInput}>
              {birthDate || "Select Date"}
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
    } else if (item.key === "school") {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>School:</Text>
          <View style={styles.schoolContainer}>
            <Text style={styles.detailTextInput}>
              {selectedSchool ? selectedSchool.name : "No school selected"}
            </Text>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setSchoolModalVisible(true)} // Open modal to select school
            >
              <Text style={styles.changeButtonText}>
                {selectedSchool ? "Change" : "Add School"}
              </Text>
            </TouchableOpacity>
            {/* Camera icon for uploading exit photo */}
            {selectedSchool && (
              <TouchableOpacity
                style={styles.cameraExitSchoolIcon}
                onPress={() => setCallOpenCameraForSchool(true)}
              >
                <MaterialIcons name="photo-camera" size={32} color="gray" />
              </TouchableOpacity>
            )}
          </View>
          {schoolExitPhoto && (
            <View style={styles.schoolPhotoContainer}>
              <Text>Pickup Door</Text>
              <Image
                source={{ uri: schoolExitPhoto }}
                style={styles.schoolPhoto}
              />
            </View>
          )}

          {/* Modal for changing school */}
          <Modal
            visible={isSchoolModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSchoolModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalDropdown}>
                <FlatList
                  data={schoolList}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.schoolOption}
                      onPress={() => {
                        handleSelectSchool(item);
                        setSchoolModalVisible(false);
                      }}
                    >
                      <Text>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setSchoolModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      );
    } else {
      return (
        <View style={styles.detailItemContainer}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          <TextInput
            style={styles.detailTextInput}
            defaultValue={kid[item.key] || ""}
            onChangeText={handleInputChange(item.setter)}
          />
        </View>
      );
    }
  };

  const detailsData = [
    { label: "Full Name:", key: "name", setter: setName },
    { label: "School Name", key: "school", setter: setSelectedSchool },
    { label: "Address:", key: "address", type: "address" },
    { label: "Birthday:", key: "birthDate", setter: setBirthDate },
    { label: "Notes:", key: "notes", setter: setNotes },
    { label: "Allergies:", key: "allergies", setter: setAllergies },
    { label: "Medicine:", key: "medicine", setter: setMedicine },
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
        <View style={styles.headerContainer}>
          <View style={styles.topContainer}>
            <View style={styles.imageWrapper}>
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => {
                  if (actualPhoto) {
                    handleImagePress(actualPhoto);
                  }
                }}
              >
                <RemoteImage
                  path={actualPhoto}
                  style={styles.kidPhoto}
                  name={kid?.name}
                  bucketName="profilePhotos"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraIcon}
                onPress={() => setCallOpenCamera(true)}
              >
                <Text
                  style={{
                    position: "absolute",
                    bottom: -12,
                    right: 3,
                    fontSize: 15,
                    fontWeight: "600",
                    color: "blue",
                  }}
                >
                  Edit
                </Text>
                <MaterialIcons
                  name="photo-camera"
                  size={32}
                  color="gray"
                  //color="#FF7276"
                />
              </TouchableOpacity>
              {/* {photoChangeLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                </View>
              )} */}
            </View>
          </View>
          <View style={styles.separator}></View>
        </View>

        <FlatList
          //ListHeaderComponent={renderHeader}
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
            disabled={!isFormChanged}
            style={[styles.saveButton, !isFormChanged && styles.disabledButton]}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
        {/* <PhotoOptionsModal
          isVisible={isPhotoOptionsModalVisible}
          onClose={() => setPhotoModalVisible(false)}
          onSelectOption={handleNewPhoto}
        /> */}
        <OpenCamera
          isVisible={callOpenCamera}
          onPhotoTaken={() => setCallOpenCamera(false)}
          onSelectOption={handleNewPhoto}
          onClose={() => setCallOpenCamera(false)}
          mode={cameraMode}
          bucketName="profilePhotos"
          allowMultipleImages={false}
          tag={false}
          allowNotes={false}
        />
        <ConfirmationModal
          isVisible={isConfirmationModalVisible}
          onConfirm={confirmUpdateKid}
          onCancel={cancelUpdateKid}
          questionText={"Confirm all updates?"}
        />

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <RemoteImage
              path={selectedImage}
              bucketName="profilePhotos"
              style={styles.fullImage}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={closeModal}
            >
              <Entypo name="cross" size={25} color="white" />
            </TouchableOpacity>
          </View>
        </Modal>

        {showConfirmationModal && (
          <InfoModal
            isVisible={true}
            onClose={() => setShowConfirmationModal(false)}
            infoItems={[
              { label: "All Done ✅", value: "Kid Updated successfully!" },
            ]}
          />
        )}
        <OpenCamera
          isVisible={callOpenCameraForSchool}
          onPhotoTaken={() => setCallOpenCameraForSchool(false)}
          onSelectOption={handleNewSchoolPhoto}
          onClose={() => setCallOpenCameraForSchool(false)}
          mode="photo"
          tag={false}
          allowNotes={false}
          bucketName="schoolExitPhotos"
          saveMediaOnCamera={false}
          allowMultipleImages={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default StudentProfileScreen;
