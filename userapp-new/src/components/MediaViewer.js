// src/components/MediaViewer.js
// Pictures and videos in full screen. VIEW ONLY: there is nothing to change, delete or send here.
// It is built the same way as the full-screen picture of the staff app:
//   - the same gesture (drag DOWN to close; a sideways move goes to the list of pictures);
//   - the picture is shown almost on the whole screen ("contain"), over a dark background;
//   - it opens and closes with a small animation.
// And one more thing: swipe sideways for the next picture or video of the same post.
// media: [{ name, kind: "photo" | "video" }]
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import RemoteImage from "./RemoteImage";
import { getSignedUrl } from "../lib/api";

const VideoPlayerView = ({ url, style }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={style}
      nativeControls
      contentFit="contain"
    />
  );
};

// Only the video that is in front is loaded (the others would play behind it)
const VideoPage = ({ name, width, height, active }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    getSignedUrl("feedVideos", name, 3600)
      .then((link) => {
        if (!cancelled) setUrl(link);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active, name]);

  if (!active || !url) {
    return (
      <View style={[local.center, { width, height }]}>
        {active && <ActivityIndicator color="#ffffff" />}
      </View>
    );
  }
  return <VideoPlayerView url={url} style={{ width, height }} />;
};

const MediaViewer = ({ visible, media, startIndex = 0, onClose }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Opens
  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
    closing.current = false;
    fade.setValue(0);
    scale.setValue(0.9);
    dragY.setValue(0);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, startIndex]);

  // Closes: the picture keeps going down while it fades
  const animateClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.85,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: height * 0.35,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onCloseRef.current());
  };
  const closeRef = useRef(animateClose);
  closeRef.current = animateClose;

  // Drag down to close: the same gesture of the staff app (it runs on the JavaScript side)
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY([-10, 10])
        .failOffsetX([-30, 30])
        .onUpdate((event) => {
          if (closing.current) return;
          // Only downward
          dragY.setValue(Math.max(0, event.translationY));
        })
        .onEnd((event) => {
          if (closing.current) return;
          const shouldClose =
            event.translationY > 120 ||
            (event.translationY > 30 && event.velocityY > 1000);
          if (shouldClose) {
            closeRef.current();
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              friction: 7,
              tension: 70,
              useNativeDriver: true,
            }).start();
          }
        })
        .onFinalize(() => {
          if (closing.current) return;
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        }),
    [dragY],
  );

  if (!visible || !media?.length) return null;

  // The dark background fades a little while the picture is dragged down
  const dragFade = dragY.interpolate({
    inputRange: [0, height / 2],
    outputRange: [1, 0.35],
    extrapolate: "clamp",
  });
  const shade = Animated.multiply(fade, dragFade);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeRef.current()}
    >
      {/* (inside a Modal the gestures need their own root view on Android) */}
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#000000", opacity: shade },
          ]}
        />

        <GestureDetector gesture={pan}>
          <Animated.View
            style={{
              flex: 1,
              opacity: fade,
              transform: [{ translateY: dragY }, { scale }],
            }}
          >
            <FlatList
              data={media}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(startIndex, media.length - 1)}
              getItemLayout={(_, i) => ({
                length: width,
                offset: width * i,
                index: i,
              })}
              keyExtractor={(m, i) => `${m.name}-${i}`}
              extraData={index}
              onMomentumScrollEnd={(e) =>
                setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item, index: i }) =>
                item.kind === "video" ? (
                  <VideoPage
                    name={item.name}
                    width={width}
                    height={height}
                    active={i === index}
                  />
                ) : (
                  <View style={[local.center, { width, height }]}>
                    <RemoteImage
                      path={item.name}
                      bucketName="feedPhotos"
                      resizeMode="contain"
                      style={{ width: width - 20, height: height - 20 }}
                    />
                  </View>
                )
              }
            />
          </Animated.View>
        </GestureDetector>

        {/* The close button, the counter and the dots (they fade with the background) */}
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { opacity: shade }]}
        >
          <View
            style={[local.top, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <View style={local.pill}>
              <Text style={local.pillText}>
                {index + 1} / {media.length}
              </Text>
            </View>
            <TouchableOpacity
              style={local.closeButton}
              onPress={() => closeRef.current()}
              hitSlop={10}
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {media.length > 1 && media.length <= 12 && (
            <View
              style={[local.dots, { bottom: insets.bottom + 18 }]}
              pointerEvents="none"
            >
              {media.map((m, i) => (
                <View
                  key={`${m.name}-${i}`}
                  style={[local.dot, i === index && local.dotActive]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const local = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { backgroundColor: "#ffffff" },
});

export default MediaViewer;
