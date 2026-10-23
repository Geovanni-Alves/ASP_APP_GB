// src/components/VideoThumb.js
// A video in a list: the first image of it with a play button (the same as in the staff app). While the
// image is being made, a dark tile with the button shows.
import React, { useEffect, useState } from "react";
import { Image, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getSignedUrl } from "../lib/api";

const cache = new Map(); // video name -> the image that was made

const VideoThumb = ({ name, style, iconSize = 56 }) => {
  const [uri, setUri] = useState(cache.get(name) || null);

  useEffect(() => {
    if (uri) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const link = await getSignedUrl("feedVideos", name, 3600);
        const { uri: image } = await VideoThumbnails.getThumbnailAsync(link, {
          time: 1000,
          quality: 0.6,
        });
        cache.set(name, image);
        if (!cancelled) setUri(image);
      } catch (error) {
        // no image: the dark tile stays, and the video still plays when it is opened
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [name, uri]);

  return (
    <View style={[style, local.tile]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <View
        style={[
          local.circle,
          { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
        ]}
      >
        <MaterialCommunityIcons
          name="play"
          size={iconSize * 0.6}
          color="#ffffff"
        />
      </View>
    </View>
  );
};

const local = StyleSheet.create({
  tile: {
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circle: {
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default VideoThumb;
