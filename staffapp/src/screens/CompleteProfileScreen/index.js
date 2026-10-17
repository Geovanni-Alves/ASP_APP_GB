// src/screens/CompleteProfileScreen/index.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button, TextInput } from "react-native-paper";
import PhoneInput from "react-native-international-phone-number";
import api from "../../lib/api";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import { useUsersContext } from "../../contexts/UsersContext";
import { useAuthContext } from "../../contexts/AuthContext";

// The first access after the invite: the person completes the profile (name, address and phone).
// The API marks the profile as completed ("firstLogin" = false) and the app goes to the home screen.

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

const CompleteProfileScreen = () => {
  const { setDbUser, dbUser, userEmail, RefreshCurrentUserData } =
    useUsersContext();
  const { logout } = useAuthContext();

  const [name, setName] = useState(dbUser?.name || "");
  const [address, setAddress] = useState(dbUser?.address || "");
  const [phoneNumber, setPhoneNumber] = useState(dbUser?.phoneNumber || "");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [lat, setLat] = useState(dbUser?.lat ?? null);
  const [lng, setLng] = useState(dbUser?.lng ?? null);
  const [saving, setSaving] = useState(false);

  const nameDone = name.trim().length > 0;
  const addressDone = address.trim().length > 0;
  // 10 digits or more (the same rule as before)
  const phoneDone = phoneNumber.replace(/\D/g, "").length >= 10;
  const canSave = nameDone && addressDone && phoneDone && !saving;

  const firstName = name.trim().split(" ")[0];

  const onSave = async () => {
    setSaving(true);
    try {
      // The API saves the profile and marks it as completed (the "firstLogin" key does that)
      const { data: updatedUser } = await api.patch("/users/me", {
        name: name.trim(),
        address,
        lat,
        lng,
        phoneNumber,
        firstLogin: false,
      });

      // The profile is complete: the app shows the home screen by itself
      setDbUser(updatedUser);
      await RefreshCurrentUserData();
    } catch (error) {
      Alert.alert(
        "Error saving the profile",
        error?.response?.data?.error || error.message,
      );
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require("../../../assets/afterlogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
            </Text>
            <Text style={styles.subtitle}>
              Complete your profile before you start using the app.
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              {/* Progress */}
              <View style={styles.stepsRow}>
                <StepMark done={nameDone} label="Name" />
                <View style={styles.stepLine} />
                <StepMark done={addressDone} label="Address" />
                <View style={styles.stepLine} />
                <StepMark done={phoneDone} label="Phone" />
              </View>

              {/* Name */}
              <TextInput
                mode="outlined"
                label="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                style={styles.field}
              />

              {/* Address */}
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

              {/* Phone */}
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
                  container: {
                    width: "100%",
                    backgroundColor: "#ffffff",
                  },
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
                Save and continue
              </Button>

              {!canSave && !saving && (
                <Text style={styles.disabledHint}>
                  Fill in your name, address and phone to continue.
                </Text>
              )}
            </Card.Content>
          </Card>

          <Text style={styles.signedAs}>Signed in as {userEmail}</Text>
          <Button mode="text" onPress={logout} textColor="#c0392b">
            Sign out
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 8,
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingVertical: 6,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  step: {
    alignItems: "center",
  },
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
  stepCircleDone: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  stepCheck: {
    fontSize: 14,
    color: "#d1d5db",
  },
  stepCheckDone: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  stepLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  stepLabelDone: {
    color: "#16a34a",
    fontWeight: "600",
  },
  stepLine: {
    width: 36,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 6,
    marginBottom: 16,
  },
  field: {
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  addressInput: {
    left: 0,
    backgroundColor: "#ffffff",
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderColor: "#79747e",
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 10,
  },
  disabledHint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  signedAs: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 16,
  },
});

export default CompleteProfileScreen;
