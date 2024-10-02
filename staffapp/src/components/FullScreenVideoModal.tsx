import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, Animated, Modal } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Entypo from "react-native-vector-icons/Entypo";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import CustomLoading from "./CustomLoading";
import RemoteVideo from "./RemoteVideo";

const { width, height } = Dimensions.get("window");

interface FullScreenVideoProps {
  isVisible: boolean;
  source: string | null;
  onClose: () => void;
  targetX?: number; // X coordinate of the small container
  targetY?: number; // Y coordinate of the small container
  bucketName: string | null;
}

const FullScreenVideo: React.FC<FullScreenVideoProps> = ({
  isVisible,
  source,
  onClose,
  targetX = width / 2,
  targetY = height / 2,
  bucketName = "photos",
}) => {
  const fadeAnim = new Animated.Value(0); // Start with 0 opacity for reverse open effect
  const scaleAnim = new Animated.Value(0.1); // Start small for reverse open effect
  const translateXAnim = new Animated.Value(targetX - width / 2); // Start from targetX
  const translateYAnim = new Animated.Value(targetY - height / 2); // Start from targetY

  // Run opening animation (reverse sucking effect) when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, // Fade in
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, // Scale up to full size
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: 0, // Move to center
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0, // Move to center
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateXAnim,
          translationY: translateYAnim,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: any) => {
    const { state, translationY, translationX } = event.nativeEvent;

    if (state === State.END) {
      if (translationY > 150 || translationX < -150) {
        // Close on a big enough swipe (down or left)
        runCloseAnimation();
      } else {
        // If not enough swipe, bring the image back to center
        Animated.spring(translateXAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();

        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const runCloseAnimation = () => {
    // Close button "sucking" animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0, // Fade out
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.1, // Shrink to 10% of the size
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateXAnim, {
        toValue: targetX - width / 2, // Move towards the target X
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: targetY - height / 2, // Move towards the target Y
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(); // Close modal after animation
    });
  };

  if (!isVisible) return null; // If not visible, don't render the overlay

  return (
    <Modal visible={isVisible} transparent={true} onRequestClose={onClose}>
      {/* Close button */}
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]} // Overlay with background
      >
        <View style={styles.closeButton}>
          <TouchableOpacity onPress={runCloseAnimation}>
            <Entypo name="cross" size={25} color="white" />
          </TouchableOpacity>
        </View>
        {/* Gesture handler for the image */}
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleStateChange}
        >
          <Animated.View
            style={[
              styles.imageContainer,
              {
                transform: [
                  { translateX: translateXAnim }, // Move image horizontally
                  { translateY: translateYAnim }, // Move image vertically
                  { scale: scaleAnim }, // Shrink or expand the image
                ],
              },
            ]}
          >
            {source ? (
              <RemoteVideo
                path={source}
                bucketName={bucketName}
                style={styles.fullVideo}
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
        </PanGestureHandler>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: "rgba(0, 0, 0, 0.9)", // Dark overlay background
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "90%",
    height: "85%",
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
  fullVideo: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
  closeButton: {
    top: 28,
    left: 170,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
    zIndex: 1, // Ensure close button stays on top
  },
});

export default FullScreenVideo;
