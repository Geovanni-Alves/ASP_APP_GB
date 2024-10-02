import { Image, View, Text, StyleSheet } from "react-native";
import React, { ComponentProps, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CustomLoader from "../components/CustomLoading"; // Adjust the path to your CustomLoader

// In-memory cache
const imageCache: { [key: string]: { url: string; timestamp: number } } = {};

type RemoteImageProps = {
  path?: string;
  fallback?: string;
  name: string;
  bucketName: string;
  onImageLoaded?: (url: string) => void;
  onlyReturnUrl?: boolean;
} & Omit<ComponentProps<typeof Image>, "source">;

const RemoteImage = ({
  path,
  fallback,
  name,
  style,
  bucketName,
  onImageLoaded,
  onlyReturnUrl = false,
  ...imageProps
}: RemoteImageProps) => {
  const [image, setImage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const getInitials = (name: string) => {
    if (name) {
      const nameArray = name.split(" ");
      return nameArray
        .map((word) => word[0])
        .join("")
        .toUpperCase();
    }
    return "";
  };

  const initials = getInitials(name);

  useEffect(() => {
    if (!path) {
      setImage(null);
      setLoading(false); // Stop loading if there's no path
      return;
    }

    const cachedImage = imageCache[path];
    const now = Date.now();
    const cacheExpiration = 60 * 60 * 1000; // 1 hour

    if (cachedImage && now - cachedImage.timestamp < cacheExpiration) {
      // console.log("use the cachedImage", cachedImage);

      // Use cached URL if valid
      setImage(cachedImage.url);
      setLoading(false);
      if (onImageLoaded) onImageLoaded(cachedImage.url);
    } else {
      (async () => {
        setLoading(true);
        setImage("");

        try {
          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(path, 60 * 60); // URL valid for 1 hour

          if (error) {
            throw new Error("Error fetching image");
          }
          //console.log("render the image", data);
          if (data?.signedUrl) {
            const url = data.signedUrl;
            setImage(url);
            // Cache the signed URL
            imageCache[path] = { url, timestamp: Date.now() };

            if (onImageLoaded) onImageLoaded(url); // Return the URL
          } else {
            throw new Error("Image not found");
          }
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false); // Stop loading in all cases
        }
      })();
    }
  }, [path, bucketName, onImageLoaded]);

  // If onlyReturnUrl is true, do not render the image
  if (onlyReturnUrl) return null;

  const fontSize =
    style?.height && !isNaN(style.height) ? style.height / 2 : 20;

  return (
    <View style={[styles.loaderContainer, style]}>
      {loading ? (
        <CustomLoader
          imageSize={45}
          showContainer={false} // Use the image size for the rotating image
        />
      ) : image ? (
        <Image source={{ uri: image }} style={style} {...imageProps} />
      ) : fallback ? (
        <Image source={{ uri: fallback }} style={style} {...imageProps} />
      ) : (
        <View style={[style, styles.initialsContainer]}>
          <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000010",
  },
  initialsContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ccc",
  },
  initialsText: {
    color: "#fff",
  },
});

export default RemoteImage;
