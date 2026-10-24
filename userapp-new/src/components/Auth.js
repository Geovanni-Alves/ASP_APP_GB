// src/components/Auth.js
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TextInput,
  Checkbox,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from "react-native-paper";
import { useAuthContext } from "../contexts/AuthState";
import { errorMessage } from "../lib/api";
import SunMascot from "./SunMascot";

// "Remember my email": only the e-mail is kept on the phone (never the password)
const LAST_EMAIL_KEY = "asp.parent.lastEmail";
const REMEMBER_KEY = "asp.parent.rememberEmail";

export default function Auth() {
  const { login, acceptInvite, requestPasswordReset, resetPassword } =
    useAuthContext();

  // "signin" | "invite" | "forgot" (asks for the e-mail) | "reset" (the code and the new password)
  const [mode, setMode] = useState("signin");
  const [info, setInfo] = useState("");
  const [remember, setRemember] = useState(true);
  // The sun: which field has the focus (the eyes follow the text, the hands cover them on the password)
  const [focus, setFocus] = useState(null); // null | "email" | "code" | "password"
  const [mood, setMood] = useState("idle"); // "idle" | "happy" | "sad"

  // It works: the sun jumps of joy for a moment before the app opens
  const celebrate = async () => {
    setMood("happy");
    await new Promise((resolve) => setTimeout(resolve, 800));
  };
  // It did not work: the sun shakes its head, then it is calm again
  const disappoint = () => {
    setMood("sad");
    setTimeout(() => setMood("idle"), 1400);
  };

  // The e-mail of the last time comes already typed
  useEffect(() => {
    (async () => {
      try {
        const [saved, flag] = await Promise.all([
          AsyncStorage.getItem(LAST_EMAIL_KEY),
          AsyncStorage.getItem(REMEMBER_KEY),
        ]);
        if (flag === "0") {
          setRemember(false);
        } else if (saved) {
          setEmail(saved);
        }
      } catch (error) {
        // no saved e-mail: the field starts empty
      }
    })();
  }, []);

  const toggleRemember = async () => {
    const next = !remember;
    setRemember(next);
    try {
      await AsyncStorage.setItem(REMEMBER_KEY, next ? "1" : "0");
      if (!next) await AsyncStorage.removeItem(LAST_EMAIL_KEY); // the saved e-mail is forgotten at once
    } catch (error) {
      // nothing
    }
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setCode("");
  };

  // The code of "I forgot my password" goes to the e-mail
  async function sendCode() {
    if (loading) return;
    if (!email.trim()) {
      setError("Please type your email.");
      return;
    }
    setFocus(null);
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setMode("reset");
      setInfo(
        "If that email has an account, we sent a 6-digit code. It is valid for 30 minutes.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (loading) return;
    if (mode === "forgot") {
      await sendCode();
      return;
    }
    const needsCode = mode === "invite" || mode === "reset";
    if (!email.trim() || !password || (needsCode && !code.trim())) {
      setError("Please fill in all the fields.");
      return;
    }
    if (mode === "reset" && password.length < 8) {
      setError("The new password must have at least 8 characters.");
      return;
    }

    setFocus(null);
    setLoading(true);
    setError("");
    try {
      // On success the AuthContext opens the session and this screen is replaced by the app
      if (mode === "signin") {
        await login(email, password, celebrate);
        // It worked (the screen closes by itself): the e-mail is kept for the next time
        if (remember) {
          await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());
        }
      } else if (mode === "invite") {
        await acceptInvite(email, code, password, celebrate);
      } else {
        await resetPassword(email, code, password, celebrate);
      }
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
      disappoint();
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
          <SunMascot
            size={170}
            focus={focus}
            textLength={focus === "code" ? code.length : email.length}
            mood={mood}
          />
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>
              {mode === "signin"
                ? "Welcome"
                : mode === "invite"
                  ? "Create your password"
                  : "Reset your password"}
            </Title>
            <Paragraph style={styles.subtitle}>
              {mode === "signin"
                ? "Sign in to continue"
                : mode === "invite"
                  ? "Use the code from your invite e-mail"
                  : mode === "forgot"
                    ? "Type your email and we will send you a code"
                    : "Type the code we sent and choose a new password"}
            </Paragraph>

            {!!info && <HelperText type="info" visible>{info}</HelperText>}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
            />

            {(mode === "invite" || mode === "reset") && (
              <TextInput
                label={mode === "invite" ? "Invite code" : "Code from the email"}
                value={code}
                onChangeText={setCode}
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
                onFocus={() => setFocus("code")}
                onBlur={() => setFocus(null)}
              />
            )}

            {mode !== "forgot" && (
              <TextInput
                label={mode === "signin" ? "Password" : "New password"}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                // So the phone can offer to fill in and to save the password (in the real app)
                textContentType={mode === "signin" ? "password" : "newPassword"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus(null)}
              />
            )}

            {mode === "signin" && (
              <Checkbox.Item
                label="Remember my email"
                status={remember ? "checked" : "unchecked"}
                onPress={toggleRemember}
                position="leading"
                style={styles.remember}
                labelStyle={styles.rememberLabel}
              />
            )}

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
              {mode === "signin"
                ? "Sign In"
                : mode === "invite"
                  ? "Create password and sign in"
                  : mode === "forgot"
                    ? "Send me the code"
                    : "Reset password and sign in"}
            </Button>

            {mode === "signin" && (
              <>
                <Button
                  mode="text"
                  onPress={() => switchMode("forgot")}
                  disabled={loading}
                >
                  Forgot password?
                </Button>
                <Button
                  mode="text"
                  onPress={() => switchMode("invite")}
                  disabled={loading}
                >
                  I have an invite
                </Button>
              </>
            )}

            {mode === "reset" && (
              <Button mode="text" onPress={sendCode} disabled={loading}>
                Send the code again
              </Button>
            )}

            {mode !== "signin" && (
              <Button
                mode="text"
                onPress={() => switchMode("signin")}
                disabled={loading}
              >
                Back to sign in
              </Button>
            )}
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
  remember: { paddingVertical: 0, marginLeft: -12, marginBottom: 4 },
  rememberLabel: { fontSize: 14, textAlign: "left", color: "#4b5563" },
  button: {
    marginVertical: 8,
  },
});
