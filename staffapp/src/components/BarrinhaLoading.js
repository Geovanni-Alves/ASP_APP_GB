import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Image, Easing } from "react-native";

const BarrinhaLoading = ({ progress, size = 100, imageSize = 100 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dancing animation (scale and rotate)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loading bar animation only when progress is not provided
    if (progress === undefined) {
      Animated.loop(
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [scaleAnim, rotateAnim, loadingAnim, progress]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "15deg"], // Adjust for a subtle tilt
  });

  const loadingWidth =
    progress !== undefined
      ? `${progress}%`
      : loadingAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate }] }}>
        <Image
          source={require("../../assets/barrinha.png")} // Adjust the path to your PNG file
          style={[styles.image, { width: imageSize, height: imageSize }]}
        />
      </Animated.View>
      <View
        style={[
          styles.loadingBarBackground,
          { width: size * 0.8, height: size * 0.1 },
        ]}
      >
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
    backgroundColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  loadingBar: {
    height: "100%",
    backgroundColor: "#ff0000", // Adjust color as needed
  },
});

export default BarrinhaLoading;
