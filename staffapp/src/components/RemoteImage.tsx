import { Image, View, Text, StyleSheet } from "react-native";
import React, { ComponentProps, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CustomLoader from "../components/CustomLoading"; // Adjust the path to your CustomLoader

type RemoteImageProps = {
  path?: string;
  fallback?: string;
  name: string;
  bucketName: string;
} & Omit<ComponentProps<typeof Image>, "source">;

const RemoteImage = ({
  path,
  fallback,
  name,
  style,
  bucketName,
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
      setLoading(false); // Stop loading if there's no path
      return;
    }

    (async () => {
      setLoading(true);
      setImage("");
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(path);

      if (error) {
        console.log(error);
        setLoading(false); // Stop loading if there's an error
      }
      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setImage(fr.result as string);
          setLoading(false); // Stop loading once the image is loaded
        };
      }
    })();
  }, [path, bucketName]);

  return (
    <View style={style}>
      {loading ? (
        <CustomLoader
          size={style?.width || 60}
          imageSize={style?.width || 30}
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
