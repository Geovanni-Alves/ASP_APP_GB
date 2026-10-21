import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  Image,
  TouchableOpacity,
} from "react-native";
import Entypo from "react-native-vector-icons/Entypo";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import CustomLoading from "./CustomLoading";
import RemoteImage from "./RemoteImage";

const { width, height } = Dimensions.get("window");

interface FullScreenImageProps {
  isVisible: boolean;
  source?: string | null;
  path?: string | null;
  onClose: () => void;
  targetX?: number;
  targetY?: number;
  bucketName: string;
}

const FullScreenImage: React.FC<FullScreenImageProps> = ({
  isVisible,
  source = null,
  path = null,
  onClose,
  targetX = width / 2,
  targetY = height / 2,
  bucketName,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.1)).current;

  const translateXAnim = useRef(
    new Animated.Value(targetX - width / 2),
  ).current;

  const translateYAnim = useRef(
    new Animated.Value(targetY - height / 2),
  ).current;

  // Separate animation for dragging
  const dragYAnim = useRef(new Animated.Value(0)).current;

  // Prevent closing multiple times
  const closingRef = useRef(false);

  // Opening animation
  useEffect(() => {
    if (!isVisible) return;

    closingRef.current = false;

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.1);
    dragYAnim.setValue(0);

    translateXAnim.setValue(targetX - width / 2);
    translateYAnim.setValue(targetY - height / 2);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateXAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, targetX, targetY]);

  // Closing animation
  const runCloseAnimation = () => {
    if (closingRef.current) return;

    closingRef.current = true;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateXAnim, {
        toValue: targetX - width / 2,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: targetY - height / 2,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(dragYAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      } else {
        closingRef.current = false;
      }
    });
  };

  // Drag down to dismiss
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-10, 10])
    .failOffsetX([-30, 30])
    .onUpdate((event) => {
      if (closingRef.current) return;

      // Only allow dragging downward
      const dragDistance = Math.max(0, event.translationY);

      dragYAnim.setValue(dragDistance);
    })
    .onEnd((event) => {
      if (closingRef.current) return;

      const shouldClose =
        event.translationY > 120 ||
        (event.translationY > 30 && event.velocityY > 1000);

      if (shouldClose) {
        runCloseAnimation();
      } else {
        // Return image to center
        Animated.spring(dragYAnim, {
          toValue: 0,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }).start();
      }
    })
    .onFinalize(() => {
      // Reset when gesture is cancelled
      if (closingRef.current) return;

      Animated.spring(dragYAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={runCloseAnimation}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          {/* Close button */}
          <View style={styles.closeButton}>
            <TouchableOpacity onPress={runCloseAnimation}>
              <Entypo name="cross" size={25} color="white" />
            </TouchableOpacity>
          </View>

          {/* Image with drag gesture */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.imageContainer,
                {
                  transform: [
                    { translateX: translateXAnim },
                    { translateY: translateYAnim },
                    { translateY: dragYAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              {path ? (
                <RemoteImage
                  path={path}
                  bucketName={bucketName}
                  style={styles.fullImage}
                />
              ) : source ? (
                <Image
                  source={{ uri: source }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.loaderContainer}>
                  <CustomLoading
                    imageSize={80}
                    text="Loading..."
                    showContainer={false}
                  />
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },

  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    borderRadius: 20,
    backgroundColor: "white",
  },

  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },

  closeButton: {
    position: "absolute",
    top: 60,
    right: 15,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
    zIndex: 50,
  },
});

export default FullScreenImage;
