// src/components/CustomLoading.js
import React from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";

// The sun and a spinner. "showContainer" puts a rounded white card behind them.
const CustomLoading = ({ imageSize = 60, showContainer = true }) => (
  <View style={showContainer ? styles.card : styles.plain}>
    <Image
      source={require("../../assets/sol.png")}
      style={{ width: imageSize, height: imageSize }}
      resizeMode="contain"
    />
    <ActivityIndicator style={{ marginTop: 10 }} color="#5337E0" />
  </View>
);

const styles = StyleSheet.create({
  plain: { alignItems: "center", justifyContent: "center" },
  card: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
});

export default CustomLoading;
