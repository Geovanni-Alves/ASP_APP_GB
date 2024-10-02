import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { supabase } from "../lib/supabase";
import { Video, ResizeMode } from "expo-av";
import * as VideoThumbnails from "expo-video-thumbnails";
import CustomLoading from "../components/CustomLoading";

// In-memory cache
const videoCache: { [key: string]: { url: string; timestamp: number } } = {};
const thumbnailCache: { [key: string]: { url: string; timestamp: number } } =
  {};

type RemoteVideoProps = {
  path?: string;
  name: string;
  bucketName: string;
  style?: any;
  onlyThumbnail?: boolean;
  thumbnailTime?: number; // Time in milliseconds to capture thumbnail
  onLoading?: (loading: boolean) => void; // Optional loading state callback
};

const RemoteVideo = ({
  path,
  name,
  bucketName,
  style,
  onlyThumbnail = false,
  thumbnailTime = 1000,
  onLoading = () => {}, // Default to a no-op function
}: RemoteVideoProps) => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0); // Track loading progress
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!path) return;

    const cachedVideo = videoCache[path];
    const cachedThumbnail = thumbnailCache[path];
    const now = Date.now();
    const cacheExpiration = 60 * 60 * 1000; // 1 hour

    if (
      onlyThumbnail &&
      cachedThumbnail &&
      now - cachedThumbnail.timestamp < cacheExpiration
    ) {
      setThumbnailUrl(cachedThumbnail.url);
      setLoading(false);
      onLoading(false); // Notify parent component that loading is done
      return;
    }

    if (
      !onlyThumbnail &&
      cachedVideo &&
      now - cachedVideo.timestamp < cacheExpiration
    ) {
      setVideoUrl(cachedVideo.url);
      setLoading(false);
      onLoading(false); // Notify parent component that loading is done
      return;
    }

    const fetchVideoUrl = async () => {
      setLoading(true);
      onLoading(true); // Notify parent component about loading state
      setError("");

      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(path, 60 * 60); // URL valid for 1 hour

        if (error || !data) {
          throw error || new Error("Failed to get video URL");
        }

        setVideoUrl(data.signedUrl);

        if (onlyThumbnail) {
          await generateThumbnail(data.signedUrl);
        }

        // Cache video URL
        videoCache[path] = { url: data.signedUrl, timestamp: Date.now() };
      } catch (err: any) {
        console.error("Error fetching video:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
        onLoading(false); // Notify parent component that loading is done
      }
    };

    const generateThumbnail = async (url: string) => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(url, {
          time: thumbnailTime,
          quality: 0.7,
        });
        setThumbnailUrl(uri);

        // Cache thumbnail URL
        thumbnailCache[path] = { url: uri, timestamp: Date.now() };
      } catch (err: any) {
        console.error("Error generating thumbnail:", err.message);
        setError("Failed to generate thumbnail");
      }
    };

    fetchVideoUrl();
  }, [path, onlyThumbnail, thumbnailTime, onLoading]);

  if (loading && onlyThumbnail) {
    return (
      <View style={[styles.loaderContainer, style]}>
        <CustomLoading progress={progress} size={70} showContainer={false} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (onlyThumbnail && thumbnailUrl) {
    return <Image source={{ uri: thumbnailUrl }} style={style} />;
  }

  if (videoUrl) {
    return (
      <Video
        source={{ uri: videoUrl }}
        style={style}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
      />
    );
  }

  return (
    <View style={[styles.placeholderContainer, style]}>
      <Text style={styles.placeholderText}>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000010",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffcccc",
  },
  errorText: {
    color: "#ff0000",
    fontWeight: "bold",
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#cccccc",
  },
  placeholderText: {
    color: "#ffffff",
    fontSize: 18,
  },
});

export default RemoteVideo;
