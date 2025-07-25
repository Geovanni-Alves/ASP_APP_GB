import React, { createContext, useContext } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { decode } from "base64-arraybuffer";

const PicturesContext = createContext({});

const PicturesContextProvider = ({ children }) => {
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

    if (data) {
      return data.path;
    }
  };

  const savePhotoInBucket = async (useCamera) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.granted === false) {
        console.log(
          `Permission to access ${
            useCamera ? "camera" : "camera roll"
          } is required!`
        );
        return null; // Return null for permission denied
      }

      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      }

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
      console.error("Error saving image:", error);
    }
  };

  return (
    <PicturesContext.Provider value={{ savePhotoInBucket }}>
      {children}
    </PicturesContext.Provider>
  );
};

export default PicturesContextProvider;

export const usePicturesContext = () => useContext(PicturesContext);
