import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const HighlightMessage = ({ message }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleValue]);

  return (
    <Animated.View
      style={[styles.parallelogram, { transform: [{ scale: scaleValue }] }]}
    >
      <View style={styles.parallelogramInner}>
        <MaterialIcons
          name="announcement"
          size={30}
          color="yellow"
          style={styles.icon}
        />
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  parallelogram: {
    backgroundColor: "rgb(2, 119, 247)",
    width: "90%",
    height: 130,
    //transform: [{ skewY: "-5deg" }],
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    marginVertical: 20,
  },
  parallelogramInner: {
    //transform: [{ skewY: "5deg" }],
    alignItems: "center",
  },
  messageText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  icon: {
    marginBottom: 5,
  },
});

export default HighlightMessage;
