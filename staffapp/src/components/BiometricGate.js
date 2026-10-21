// src/components/BiometricGate.js
// Locks the app behind Face ID / fingerprint. It does NOT store any password: the session (the token)
// is the same one; this only decides if the screen is covered or not.
//   - When the app is opened with a session already saved, it asks for the biometrics.
//   - When the app comes back from the background after LOCK_AFTER_MS, it asks again.
//   - After a password login it does NOT ask (the person just proved who they are).
//   - The first time, it offers to turn this on (and remembers the answer on this phone).
// The same file works in the parents' app.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTING_KEY = "asp.biometricLock"; // "on" | "off"; nothing saved = not asked yet
const LOCK_AFTER_MS = 2 * 60 * 1000; // how long the app may stay in the background before it locks

// While developing, every reload (r in Metro) starts the app again and would ask for Face ID each time.
// Turn this on only when you want to test the lock. In a real build (no __DEV__) the lock always works.
const LOCK_IN_DEVELOPMENT = false;
const SKIP_LOCK = __DEV__ && !LOCK_IN_DEVELOPMENT;

// What the screens (a future settings page) can use
const BiometricContext = createContext({
  available: false,
  enabled: false,
  label: "biometrics",
  setEnabled: async () => false,
});
export const useBiometricLock = () => useContext(BiometricContext);

// "Face ID", "Touch ID"... the way the phone calls it
const labelOf = (types) => {
  const { FACIAL_RECOGNITION, FINGERPRINT } =
    LocalAuthentication.AuthenticationType;
  if (types.includes(FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "Face unlock";
  }
  if (types.includes(FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
  return "Biometrics";
};

export default function BiometricGate({
  children,
  startUnlocked = false, // true right after a password login
  onSignOut,
}) {
  const [ready, setReady] = useState(false); // the setting and the sensor are known
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState("biometrics");
  const [enabled, setEnabledState] = useState(false);
  // Until we know, the app stays covered (so nothing shows for a moment)
  const [locked, setLocked] = useState(!startUnlocked && !SKIP_LOCK);

  const authenticating = useRef(false); // the system prompt also changes the state of the app
  const backgroundAt = useRef(null);

  const authenticate = useCallback(async (message) => {
    if (authenticating.current) return false;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: message,
        cancelLabel: "Cancel",
        disableDeviceFallback: false, // the phone passcode also works, when the face or finger fails
      });
      return result.success;
    } catch (error) {
      console.log("Biometric error:", error?.message);
      return false;
    } finally {
      authenticating.current = false;
    }
  }, []);

  const unlock = useCallback(async () => {
    if (await authenticate("Unlock ASP Staff")) setLocked(false);
  }, [authenticate]);

  // Turn it on (after confirming with the biometrics) or off. For a settings page.
  const setEnabled = useCallback(
    async (on) => {
      if (on) {
        if (!available) return false;
        if (!(await authenticate(`Confirm ${label}`))) return false;
        await AsyncStorage.setItem(SETTING_KEY, "on");
        setEnabledState(true);
        return true;
      }
      await AsyncStorage.setItem(SETTING_KEY, "off");
      setEnabledState(false);
      return true;
    },
    [available, label, authenticate],
  );

  // The first time: is there a sensor? is it turned on? Offers to turn it on if never asked.
  useEffect(() => {
    (async () => {
      let ok = false;
      let name = "biometrics";
      let saved = null;
      try {
        const [hasHardware, isEnrolled, types] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
        ]);
        ok = hasHardware && isEnrolled;
        name = labelOf(types);
        saved = await AsyncStorage.getItem(SETTING_KEY);
      } catch (error) {
        console.log("Could not check the biometrics:", error?.message);
      }

      setAvailable(ok);
      setLabel(name);
      setEnabledState(ok && saved === "on");

      // No sensor, or turned off: nothing to unlock
      if (SKIP_LOCK || !ok || saved !== "on") setLocked(false);
      setReady(true);

      // Never asked: offers it, once
      if (ok && saved == null) {
        setTimeout(() => {
          Alert.alert(
            `Use ${name} to open the app?`,
            "The app will ask for it when you come back after a while, so nobody else can open it on your phone.",
            [
              {
                text: "Not now",
                style: "cancel",
                onPress: () => AsyncStorage.setItem(SETTING_KEY, "off"),
              },
              {
                text: `Use ${name}`,
                onPress: async () => {
                  if (await authenticate(`Confirm ${name}`)) {
                    await AsyncStorage.setItem(SETTING_KEY, "on");
                    setEnabledState(true);
                  }
                },
              },
            ],
          );
        }, 800);
      }
    })();
  }, []);

  // It asks by itself as soon as the app gets covered
  useEffect(() => {
    if (ready && enabled && locked) unlock();
  }, [ready, enabled, locked, unlock]);

  // Back from the background after a while: covered again
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (authenticating.current) return;

      if (state === "background") {
        backgroundAt.current = Date.now();
      } else if (state === "active") {
        const since = backgroundAt.current;
        backgroundAt.current = null;
        if (
          enabled &&
          !SKIP_LOCK &&
          since &&
          Date.now() - since > LOCK_AFTER_MS
        ) {
          setLocked(true);
        }
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  const confirmSignOut = () =>
    Alert.alert(
      "Use my password instead?",
      "You will be signed out and will need your e-mail and password to come back.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: onSignOut },
      ],
    );

  return (
    <BiometricContext.Provider
      value={{ available, enabled, label, setEnabled }}
    >
      <View style={{ flex: 1 }}>
        {children}

        {/* A native modal: it covers the WHOLE screen and blocks every touch, whatever the layout of the
            app is (a view inside the app only covered part of the screen) */}
        <Modal
          visible={locked}
          animationType="none"
          transparent={false}
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => {}} // the back button of Android does not open the app
        >
          <View style={styles.cover}>
            <Image
              source={require("../../assets/sol.png")}
              style={styles.sun}
              resizeMode="contain"
            />
            <Text style={styles.title}>ASP Staff is locked</Text>

            {ready && enabled && (
              <TouchableOpacity style={styles.unlockButton} onPress={unlock}>
                <Text style={styles.unlockText}>Unlock with {label}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={confirmSignOut}>
              <Text style={styles.signOut}>Use my password instead</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </BiometricContext.Provider>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: "#5337E0",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sun: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 28,
  },
  unlockButton: {
    backgroundColor: "#FFC933",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    marginBottom: 22,
  },
  unlockText: {
    color: "#1F1B4D",
    fontSize: 16,
    fontWeight: "700",
  },
  signOut: {
    color: "#ffffff",
    fontSize: 14,
    textDecorationLine: "underline",
    opacity: 0.9,
  },
});
