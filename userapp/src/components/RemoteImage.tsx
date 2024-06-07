import { Image, View, Text, StyleSheet } from "react-native";
import React, { ComponentProps, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RemoteImageProps = {
  path?: string;
  fallback: string;
  name: string;
} & Omit<ComponentProps<typeof Image>, "source">;

const RemoteImage = ({
  path,
  fallback,
  name,
  style,
  ...imageProps
}: RemoteImageProps) => {
  const [image, setImage] = useState("");

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
    if (!path) return;
    (async () => {
      setImage("");
      const { data, error } = await supabase.storage
        .from("photos")
        .download(path);

      if (error) {
        console.log(error);
      }

      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setImage(fr.result as string);
        };
      }
    })();
  }, [path]);

  return (
    <View style={style}>
      {image ? (
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
