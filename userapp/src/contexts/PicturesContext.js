import React, { createContext, useContext } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../backend/lib/supabase";
import * as FileSystem from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { decode } from "base64-arraybuffer";

const PicturesContext = createContext({});

const PicturesContextProvider = ({ children }) => {
  // const uploadImage = async (uri, filename) => {
  //   try {
  //     if (!uri) {
  //       throw new Error("Image URI is undefined");
  //     }

  //     const response = await fetch(uri);
  //     const blob = await response.blob();
  //     if (!blob) {
  //       throw new Error("Failed to create blob.");
  //     }

  //     console.log("Uploading image to Supabase Storage...");
  //     const { data, error } = await supabase.storage
  //       .from("photos")
  //       .upload(filename, blob, {
  //         contentType: "image/jpeg",
  //       });

  //     if (error) {
  //       throw error;
  //     }

  //     console.log("Image uploaded successfully.");

  //     const { publicURL, error: urlError } = supabase.storage
  //       .from("photos")
  //       .getPublicUrl(filename);

  //     if (urlError) {
  //       throw urlError;
  //     }

  //     console.log("Image URL:", publicURL);

  //     return publicURL;
  //   } catch (error) {
  //     console.error("Error uploading image:", error);
  //     throw error;
  //   }
  // };

  const uploadImage = async (image) => {
    if (!image?.startsWith("file://")) {
      return;
    }

    const base64 = await FileSystem.readAsStringAsync(image, {
      encoding: "base64",
    });

    const filePath = `${randomUUID()}.png`;
    const contentType = "image/png";

    const { data, error } = await supabase.storage
      .from("photos")
      .upload(filePath, decode(base64), { contentType });

    if (error) {
      throw error;
    }
    //console.log("data", data);

    if (data) {
      return data.path;
    }
  };

  const savePhotoInBucket = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        console.log("Permission to access camera roll is required!");
        return null; // Return null for permission denied
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          const image = result.assets[0].uri;
          const imagePath = await uploadImage(image);
          return imagePath;
        } else {
          console.error("Image assets not found in the result.");
          return null;
        }
      } else {
        return result;
      }
    } catch (error) {
      console.error("Error Saving  image:", error);
    }
  };

  // const getPhotoInBucket = async (filename) => {
  //   try {
  //     const { publicURL, error } = supabase.storage
  //       .from("photos")
  //       .getPublicUrl(filename);

  //     if (error) {
  //       throw error;
  //     }

  //     //console.log("Image URL:", publicURL);
  //     return publicURL;
  //   } catch (error) {
  //     console.error("Error getting image:", error);
  //     throw error;
  //   }
  // };

  return (
    <PicturesContext.Provider value={{ savePhotoInBucket }}>
      {children}
    </PicturesContext.Provider>
  );
};

export default PicturesContextProvider;

export const usePicturesContext = () => useContext(PicturesContext);
