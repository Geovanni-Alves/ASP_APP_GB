// src/screens/ProfileScreen/index.js
// "My profile": the person changes the name, the address and the phone, or signs out.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { useAuthContext } from "../../contexts/AuthState";
import { useProfileContext } from "../../contexts/ProfileContext";
import ProfileForm from "../../components/ProfileForm";

const ProfileScreen = ({ navigation }) => {
  const { logout } = useAuthContext();
  const { profile } = useProfileContext();

  return (
    <View style={styles.screen}>
      <ProfileForm onSaved={() => navigation.goBack()} />

      <View style={styles.footer}>
        <Text style={styles.signedAs}>Signed in as {profile?.email}</Text>
        <Button mode="outlined" onPress={logout} textColor="#c0392b">
          Sign out
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  footer: { alignItems: "center", paddingBottom: 24, gap: 8 },
  signedAs: { color: "#9ca3af", fontSize: 12 },
});

export default ProfileScreen;
