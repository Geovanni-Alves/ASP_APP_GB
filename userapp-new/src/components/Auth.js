// src/components/Auth.js
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from "react-native-paper";
import { useAuthContext } from "../contexts/AuthState";
import { errorMessage } from "../lib/api";

export default function Auth() {
  const { login, acceptInvite } = useAuthContext();

  const [mode, setMode] = useState("signin"); // "signin" | "invite"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setPassword("");
  };

  async function handleSubmit() {
    if (loading) return;
    if (!email.trim() || !password || (mode === "invite" && !code.trim())) {
      setError("Please fill in all the fields.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // On success the AuthContext opens the session and this screen is replaced by the app
      if (mode === "signin") await login(email, password);
      else await acceptInvite(email, code, password);
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/afterlogo.png")}
            style={styles.logo}
          />
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>
              {mode === "signin" ? "Welcome" : "Create your password"}
            </Title>
            <Paragraph style={styles.subtitle}>
              {mode === "signin"
                ? "Sign in to continue"
                : "Use the code from your invite e-mail"}
            </Paragraph>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {mode === "invite" && (
              <TextInput
                label="Invite code"
                value={code}
                onChangeText={setCode}
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            )}

            <TextInput
              label={mode === "signin" ? "Password" : "New password"}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              {mode === "signin" ? "Sign In" : "Create password and sign in"}
            </Button>

            <Button
              mode="text"
              onPress={() =>
                switchMode(mode === "signin" ? "invite" : "signin")
              }
              disabled={loading}
            >
              {mode === "signin" ? "I have an invite" : "Back to sign in"}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  logoContainer: {
    padding: 10,
    alignItems: "center",
  },
  logo: {
    width: 250,
    height: 250,
    aspectRatio: 2 / 2,
  },
  card: {
    padding: 16,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 16,
    color: "#6c757d",
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginVertical: 8,
  },
});
