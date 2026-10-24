// src/screens/CompleteProfileScreen/index.js
// The first access: the person completes the profile (name, address and phone) before using the app.
// The API marks the profile as completed ("firstLogin" = false) and the app goes to the Home.
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "../../contexts/AuthState";
import { useProfileContext } from "../../contexts/ProfileContext";
import ProfileForm from "../../components/ProfileForm";

const CompleteProfileScreen = () => {
  const { logout } = useAuthContext();
  const { profile } = useProfileContext();
  const firstName = (profile?.name || "").trim().split(" ")[0];

  return (
    <SafeAreaView style={styles.screen}>
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

      <ProfileForm firstAccess />

      <View style={styles.footer}>
        <Text style={styles.signedAs}>Signed in as {profile?.email}</Text>
        <Button mode="text" onPress={logout} textColor="#c0392b">
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { alignItems: "center", marginTop: 8, paddingHorizontal: 16 },
  logo: { width: 90, height: 90 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 4, color: "#1f2937" },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  footer: { alignItems: "center", paddingBottom: 8 },
  signedAs: { color: "#9ca3af", fontSize: 12 },
});

export default CompleteProfileScreen;
