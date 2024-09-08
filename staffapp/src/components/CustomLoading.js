import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Image, Easing, Text } from "react-native";

const CustomLoading = ({
  progress,
  imageSize = 80, // This is the size of the rotating image (sun)
  size = imageSize, // This is the size of the entire loader container
  loadingBar = false, // Optional loading bar
  text = "", // Optional text to display below the spinner
  showContainer = true, // property to show or not the container...
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const RotateSun = require("../../assets/sol.png");

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

  const renderContent = () => (
    <View style={[styles.container, { height: size }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Image
          source={RotateSun} // Adjust the path to your PNG file
          style={[styles.image, { width: imageSize, height: imageSize }]}
        />
      </Animated.View>
      {loadingBar && (
        <View style={[styles.loadingBarBackground, { width: size * 0.8 }]}>
          <Animated.View style={[styles.loadingBar, { width: loadingWidth }]} />
        </View>
      )}
      {text ? <Text style={styles.loadingText}>{text}</Text> : null}
    </View>
  );

  // Conditionally render either with or without overlay and container
  return showContainer ? (
    <View style={styles.loadingOverlay}>
      <View
        style={[
          styles.loadingContainer,
          {
            width: imageSize + 50, // Adjust container width based on image size with padding
            height: imageSize + (loadingBar ? 70 : 50), // Height includes image and optional loading bar
          },
        ]}
      >
        {renderContent()}
      </View>
    </View>
  ) : (
    renderContent() // Directly render the content without overlay or container
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Transparent dark background
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    //width: 200, // Container width
    padding: 10,
    backgroundColor: "white", // Background for the container
    borderRadius: 10, // Rounded corners
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  image: {
    resizeMode: "contain",
  },
  loadingBarBackground: {
    height: 8, // Adjust the height as needed
    backgroundColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 7,
  },
  loadingBar: {
    height: "100%",
    backgroundColor: "#ff0000", // Adjust color as needed
  },
  loadingText: {
    marginTop: 8,
    fontSize: 18,
    color: "#000", // Text color
  },
});

export default CustomLoading;
