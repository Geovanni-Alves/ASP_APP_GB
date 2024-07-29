import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import { TextInput, Button, Card, Title, Paragraph } from "react-native-paper";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/afterlogo.png")}
          style={styles.logo}
        />
      </View>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Welcome</Title>
          <Paragraph style={styles.subtitle}>Sign in to continue</Paragraph>
          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => setEmail(text)}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => setPassword(text)}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button
            mode="contained"
            onPress={signInWithEmail}
            loading={loading}
            style={styles.button}
          >
            Sign In
          </Button>
          <Button
            mode="outlined"
            onPress={signUpWithEmail}
            loading={loading}
            style={styles.button}
          >
            Sign Up
          </Button>
        </Card.Content>
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 16,
  },
  logoContainer: {
    // flex: 1,
    padding: 10,
    //marginTop: 30,
    //paddingTop: 35,
    alignItems: "center",
    //marginBottom: 32,
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
    marginBottom: 16,
  },
  button: {
    marginVertical: 8,
  },
});
