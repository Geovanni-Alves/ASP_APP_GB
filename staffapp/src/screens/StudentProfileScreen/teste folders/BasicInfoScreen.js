import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import styles from "./styles";

const BasicInfoScreen = ({
  kid,
  setKidDetails,
  setBirthDate,
  setIsFormChanged,
}) => {
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const handleConfirmDate = (date) => {
    const formattedDate = date.toISOString().split("T")[0];
    setBirthDate(formattedDate);
    setKidDetails((prev) => ({ ...prev, birthDate: formattedDate }));
    setIsFormChanged(true);
    setDatePickerVisible(false);
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      style={styles.tabContainer}
    >
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>Birthday</Text>
        <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
          <Text style={styles.detailTextInput}>
            {kid.birthDate || "Select Date"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          date={kid.birthDate ? new Date(kid.birthDate) : new Date()}
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisible(false)}
        />
      </View>
      <Text style={styles.detailLabel}>Notes</Text>
      <TextInput
        style={styles.detailTextInput}
        value={kid.notes}
        onChangeText={(text) =>
          setKidDetails((prev) => ({ ...prev, notes: text }))
        }
      />
      <Text style={styles.detailLabel}>Allergies</Text>
      <TextInput
        style={styles.detailTextInput}
        value={kid.allergies}
        onChangeText={(text) =>
          setKidDetails((prev) => ({ ...prev, allergies: text }))
        }
      />
      <Text style={styles.detailLabel}>Medicine</Text>
      <TextInput
        style={styles.detailTextInput}
        value={kid.medicine}
        onChangeText={(text) =>
          setKidDetails((prev) => ({ ...prev, medicine: text }))
        }
      />
    </ScrollView>
  );
};

export default BasicInfoScreen;
