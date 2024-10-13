import { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import styles from "./styles";
import { useKidsContext } from "../../contexts/KidsContext";

const BasicInfoScreen = ({ kidId, setKidDetails, handleUpdateKid }) => {
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { kids, fetchSelectedKid } = useKidsContext();
  const [localKid, setLocalKid] = useState(null);
  const [kidName, setKidName] = useState(null);

  const fetchData = async () => {
    if (kidId) {
      const kid = await fetchSelectedKid(kidId);
      setLocalKid(kid);
      setKidName(kid.name);
    }
  };
  useEffect(() => {
    fetchData();
  }, [kidId]);

  const hideDataPicker = () => {
    setDatePickerVisible(false);
  };

  const handleConfirmDate = (date) => {
    const formattedDate = date.toISOString().split("T")[0];

    if (formattedDate !== localKid?.birthDate) {
      //setBirthDate(formattedDate);
      setLocalKid((prev) => ({ ...prev, birthDate: formattedDate }));
      setIsFormChanged(true); // Mark form as changed
    }

    hideDataPicker();
  };

  const handleInputChange = (key, value) => {
    if (value !== localKid[key]) {
      //console.log(key, value);
      if (key !== "name") {
        setLocalKid((prev) => ({ ...prev, [key]: value }));
        setKidDetails((prev) => ({ ...prev, [key]: value }));
        setIsFormChanged(true); // Mark form as changed
      } else {
        setKidName(value);
        setIsFormChanged(true); // Mark form as changed
      }
    }
  };

  const saveChanges = async () => {
    const updatedFields = {
      name: kidName,
      birthDate: localKid.birthDate,
      notes: localKid.notes,
      allergies: localKid.allergies,
      medicine: localKid.medicine,
    };
    // Call the save function from the parent and wait for the result.
    const updatedKid = await handleUpdateKid(updatedFields);
    if (updatedKid) {
      // Update the local state with the new kid details after saving.
      setLocalKid(updatedKid);
      setKidName(updatedKid.name);
      setIsFormChanged(false);
    } else {
      console.log("Error", "Failed to update the kid's information.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      style={styles.tabContainer}
    >
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>Name</Text>
        <TextInput
          style={styles.detailTextInput}
          value={kidName || ""}
          onChangeText={(text) => handleInputChange("name", text)}
        />
        <Text style={styles.detailLabel}>Birthday</Text>
        <TouchableOpacity
          onPress={() => {
            setDatePickerVisible(true);
          }}
        >
          <Text style={styles.detailTextInput}>
            {localKid?.birthDate || "Select Date"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          date={
            localKid?.birthDate ? new Date(localKid?.birthDate) : new Date()
          } // Use current date if birthDate is not set
          onConfirm={handleConfirmDate}
          onCancel={hideDataPicker}
        />
      </View>
      <Text style={styles.detailLabel}>Notes</Text>
      <TextInput
        style={styles.detailTextInput}
        value={localKid?.notes || ""}
        onChangeText={(text) => handleInputChange("notes", text)}
      />
      <Text style={styles.detailLabel}>Allergies</Text>
      <TextInput
        style={styles.detailTextInput}
        value={localKid?.allergies || ""}
        onChangeText={(text) => handleInputChange("allergies", text)}
      />
      <Text style={styles.detailLabel}>Medicine</Text>
      <TextInput
        style={styles.detailTextInput}
        value={localKid?.medicine || ""}
        onChangeText={(text) => handleInputChange("medicine", text)}
      />
      {isFormChanged && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveChanges} // Call the save function on press
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default BasicInfoScreen;
