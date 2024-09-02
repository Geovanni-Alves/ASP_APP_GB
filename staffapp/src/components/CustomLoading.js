import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Image, Easing } from "react-native";

const CustomLoading = ({ progress, size = 100, imageSize = 100 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spinning animation (rotate)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000, // Adjust the speed of rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loading bar animation only when progress is not provided
    if (progress === undefined) {
      Animated.loop(
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 5000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [rotateAnim, loadingAnim, progress]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"], // Full rotation
  });

  const loadingWidth =
    progress !== undefined
      ? `${progress}%`
      : loadingAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        });

  return (
    <View style={[styles.container, { width: size }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Image
          source={require("../../assets/sol.png")} // Adjust the path to your PNG file
          style={[styles.image, { width: imageSize, height: imageSize }]}
        />
      </Animated.View>
      <View style={styles.loadingBarBackground}>
        <Animated.View style={[styles.loadingBar, { width: loadingWidth }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    resizeMode: "contain",
  },
  loadingBarBackground: {
    width: "80%", // Ensures the loading bar is always 80% of the container's width
    height: 8, // Adjust the height as needed
    backgroundColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 2, // Reduced margin to decrease space between image and bar
  },
  loadingBar: {
    height: "100%",
    backgroundColor: "#ff0000", // Adjust color as needed
  },
});

export default CustomLoading;
