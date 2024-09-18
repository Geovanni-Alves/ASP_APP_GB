import { Image, View, Text, StyleSheet } from "react-native";
import React, { ComponentProps, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CustomLoader from "../components/CustomLoading"; // Adjust the path to your CustomLoader

type RemoteImageProps = {
  path?: string;
  fallback?: string;
  name: string;
  bucketName: string;
  onImageLoaded?: (url: string) => void;
} & Omit<ComponentProps<typeof Image>, "source">;

const RemoteImage = ({
  path,
  fallback,
  name,
  style,
  bucketName,
  onImageLoaded,
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

        if (data?.signedUrl) {
          setImage(data.signedUrl);
          onImageLoaded?.(data.signedUrl); //trigger the callback if available
        } else {
          throw new Error("Image not found");
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false); // Stop loading in all cases
      }
    })();
  }, [path, bucketName]);

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
          <Text style={[styles.initialsText, { fontSize: style?.height / 2 }]}>
            {initials}
          </Text>
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
