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
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import CustomLoading from "./CustomLoading";
import RemoteImage from "./RemoteImage";

const { width, height } = Dimensions.get("window");

interface FullScreenImageProps {
  isVisible: boolean;
  source: string | null;
  path: string | null;
  onClose: () => void;
  targetX?: number; // X coordinate of the small container
  targetY?: number; // Y coordinate of the small container
  bucketName: string | null;
}

const FullScreenImage: React.FC<FullScreenImageProps> = ({
  isVisible,
  source,
  path,
  onClose,
  targetX = width / 2,
  targetY = height / 2,
  bucketName = "photos",
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.1)).current;
  const translateXAnim = useRef(
    new Animated.Value(targetX - width / 2)
  ).current;
  const translateYAnim = useRef(
    new Animated.Value(targetY - height / 2)
  ).current;

  // Open animation
  useEffect(() => {
    if (isVisible) {
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
    }
  }, [isVisible]);

  // Close animation
  const runCloseAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateXAnim, {
        toValue: targetX - width / 2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: targetY - height / 2,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  // // Pan gesture
  // const panGesture = Gesture.Pan()
  //   .onChange((event) => {
  //     translateXAnim.setValue(event.translationX);
  //     translateYAnim.setValue(event.translationY);
  //   })
  //   .onEnd((event) => {
  //     if (event.translationY > 150 || event.translationX < -150) {
  //       runCloseAnimation();
  //     } else {
  //       Animated.spring(translateXAnim, {
  //         toValue: 0,
  //         useNativeDriver: true,
  //       }).start();
  //       Animated.spring(translateYAnim, {
  //         toValue: 0,
  //         useNativeDriver: true,
  //       }).start();
  //     }
  //   })
  //   .activeOffsetX([-5, 5])
  //   .activeOffsetY([-5, 5]);
  // // .activeOffsetY([30, 9999]);

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Botão para fechar */}
        <View style={styles.closeButton}>
          <TouchableOpacity onPress={runCloseAnimation}>
            <Entypo name="cross" size={25} color="white" />
          </TouchableOpacity>
        </View>

        {/* Imagem com animação de entrada */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              transform: [
                { translateX: translateXAnim },
                { translateY: translateYAnim },
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
    width,
    height,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    // width: "90%",
    // height: "85%",
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
    top: 80,
    right: 15,
    // left: 170,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
    zIndex: 50,
  },
});

export default FullScreenImage;
