// src/components/ProfileForm.js
// The data of the person: name, address and phone. Used in the first access (welcome) and in "My profile".
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RemoteImage from "./RemoteImage";
import { Button, TextInput } from "react-native-paper";
import PhoneInput from "react-native-international-phone-number";
import api, { errorMessage } from "../lib/api";
import AddressAutocomplete from "./AddressAutocomplete";
import { useProfileContext } from "../contexts/ProfileContext";

// A small round mark that is green with a check when the item is done
const StepMark = ({ done, label }) => (
  <View style={styles.step}>
    <View style={[styles.stepCircle, done && styles.stepCircleDone]}>
      <Text style={[styles.stepCheck, done && styles.stepCheckDone]}>
        {done ? "✓" : ""}
      </Text>
    </View>
    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
  </View>
);

// firstAccess: shows the three steps and marks the profile as completed when it is saved
const ProfileForm = ({ firstAccess = false, onSaved }) => {
  const { profile, refreshProfile } = useProfileContext();

  const [name, setName] = useState(profile?.name || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [lat, setLat] = useState(profile?.lat ?? null);
  const [lng, setLng] = useState(profile?.lng ?? null);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);

  // ---------------------------------------------------------------- the photo of the person (his OWN photo)
  const sendPhoto = async (asset) => {
    setUploading(true);
    try {
      const isPng = /\.png$/i.test(asset.uri) || (asset.mimeType || "").includes("png");
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: `photo.${isPng ? "png" : "jpg"}`,
        type: isPng ? "image/png" : "image/jpeg",
      });
      await api.post("/parent/me/photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: (body) => body, // send the form as it is
        timeout: 60000,
      });
      await refreshProfile();
    } catch (error) {
      Alert.alert("Could not change the photo", errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera is off",
        "Allow the camera in the settings of the phone, or choose a photo from your library.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) await sendPhoto(result.assets[0]);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) await sendPhoto(result.assets[0]);
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await api.delete("/parent/me/photo");
      await refreshProfile();
    } catch (error) {
      Alert.alert("Could not remove the photo", errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const choosePhoto = () =>
    Alert.alert("Your photo", undefined, [
      { text: "Take a photo", onPress: takePhoto },
      { text: "Choose from my library", onPress: pickPhoto },
      ...(profile?.photo
        ? [{ text: "Remove my photo", style: "destructive", onPress: removePhoto }]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);

  const nameDone = name.trim().length > 0;
  const addressDone = address.trim().length > 0;
  // 10 digits or more
  const phoneDone = phoneNumber.replace(/\D/g, "").length >= 10;
  const canSave = nameDone && addressDone && phoneDone && !saving;

  const onSave = async () => {
    setSaving(true);
    try {
      await api.patch("/users/me", {
        name: name.trim(),
        address,
        lat,
        lng,
        phoneNumber,
        // "firstLogin" (any value) tells the API that the profile is complete
        ...(firstAccess ? { firstLogin: false } : {}),
      });
      await refreshProfile(); // at the first access the app goes to the Home by itself
      if (onSaved) onSaved();
    } catch (error) {
      Alert.alert("Could not save", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* The photo of the person (the photo of the child is chosen by the team) */}
        <View style={styles.photoBox}>
          <TouchableOpacity onPress={choosePhoto} disabled={uploading}>
            <RemoteImage
              path={profile?.photo}
              name={profile?.name}
              bucketName="profilePhotos"
              style={styles.avatar}
            />
            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>
            {uploading ? "Sending..." : profile?.photo ? "Change my photo" : "Add my photo (optional)"}
          </Text>
        </View>

        {firstAccess && (
          <View style={styles.stepsRow}>
            <StepMark done={nameDone} label="Name" />
            <View style={styles.stepLine} />
            <StepMark done={addressDone} label="Address" />
            <View style={styles.stepLine} />
            <StepMark done={phoneDone} label="Phone" />
          </View>
        )}

        <TextInput
          mode="outlined"
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          style={styles.field}
        />

        <Text style={styles.label}>Address</Text>
        <AddressAutocomplete
          defaultValue={address}
          containerStyle={{ padding: 0 }}
          inputStyle={styles.addressInput}
          onSelect={(place) => {
            setAddress(place.address);
            setLat(place.lat);
            setLng(place.lng);
          }}
        />
        <Text style={styles.hint}>
          Start typing and choose your address from the list.
        </Text>

        <Text style={[styles.label, { marginTop: 18 }]}>Phone number</Text>
        <PhoneInput
          value={phoneNumber}
          onChangePhoneNumber={setPhoneNumber}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={setSelectedCountry}
          placeholder="Phone Number"
          language="en"
          defaultCountry="CA"
          phoneInputStyles={{
            container: { width: "100%", backgroundColor: "#ffffff" },
          }}
        />

        <Button
          mode="contained"
          onPress={onSave}
          disabled={!canSave}
          loading={saving}
          style={styles.saveButton}
          contentStyle={{ paddingVertical: 6 }}
        >
          {firstAccess ? "Save and continue" : "Save"}
        </Button>

        {!canSave && !saving && (
          <Text style={styles.disabledHint}>
            Fill in your name, address and phone to continue.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  photoBox: { alignItems: "center", marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#5337E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f5f5f5",
  },
  photoHint: { marginTop: 8, fontSize: 13, color: "#6b7280" },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  step: { alignItems: "center" },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  stepCircleDone: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  stepCheck: { fontSize: 14, color: "#d1d5db" },
  stepCheckDone: { color: "#ffffff", fontWeight: "bold" },
  stepLabel: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  stepLabelDone: { color: "#16a34a", fontWeight: "600" },
  stepLine: {
    width: 36,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 6,
    marginBottom: 16,
  },
  field: { backgroundColor: "#ffffff", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  addressInput: {
    left: 0,
    backgroundColor: "#ffffff",
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderColor: "#79747e",
  },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  saveButton: { marginTop: 24, borderRadius: 10 },
  disabledHint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
});

export default ProfileForm;
