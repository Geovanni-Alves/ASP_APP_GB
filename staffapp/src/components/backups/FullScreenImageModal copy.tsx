import React from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Entypo from "react-native-vector-icons/Entypo";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import CustomLoading from "./CustomLoading";

const { width, height } = Dimensions.get("window");

interface FullScreenImageProps {
  isVisible: boolean;
  source: string | null;
  onClose: () => void;
  targetX: number; // X coordinate of the small container
  targetY: number; // Y coordinate of the small container
}

const FullScreenImage: React.FC<FullScreenImageProps> = ({
  isVisible,
  source,
  onClose,
  targetX = width / 2,
  targetY = height / 2,
}) => {
  const fadeAnim = new Animated.Value(1); // For fade-out animation
  const scaleAnim = new Animated.Value(1); // For scaling (shrinking) animation
  const translateXAnim = new Animated.Value(0); // For horizontal movement
  const translateYAnim = new Animated.Value(0); // For vertical movement

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
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.1, // Shrink to 10% of the size
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(translateXAnim, {
            toValue: targetX - width / 2, // Move towards the target X
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: targetY - height / 2, // Move towards the target Y
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
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

  if (!isVisible) return null; // If not visible, don't render the overlay

  return (
    <Modal visible={isVisible} transparent={true} onRequestClose={onClose}>
      {/* Close button */}
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]} // Overlay with background
      >
        <View style={styles.closeButton}>
          <TouchableOpacity onPress={onClose}>
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
                  { scale: scaleAnim }, // Shrink the image
                ],
              },
            ]}
          >
            {source ? (
              <Image source={{ uri: source }} style={styles.fullImage} />
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
    //backgroundColor: "blue",
    backgroundColor: "rgba(0, 0, 0, 0.9)", // Dark overlay background
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "90%",
    height: "85%",
    justifyContent: "center",
    alignItems: "center",
    //backgroundColor: "green",
  },
  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    borderRadius: 20,
    backgroundColor: "white",
  },
  fullImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    //backgroundColor: "red",
  },
  closeButton: {
    //position: "absolute",
    top: 28,
    left: 170,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
    zIndex: 1, // Ensure close button stays on top
  },
});

export default FullScreenImage;
