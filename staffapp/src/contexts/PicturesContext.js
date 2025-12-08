import React, { createContext, useContext } from "react";
import { supabase } from "../lib/supabase";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { decode } from "base64-arraybuffer";

const PicturesContext = createContext({});

const PicturesContextProvider = ({ children }) => {
  const savePhotoInBucket = async (image, bucketName = "photos") => {
    // const imageUri = image.uri;
    try {
      if (!image?.uri?.startsWith("file://")) {
        console.error("Invalid image URI");
        return null;
      }

      const file = new File(image.uri);

      const base64 = await file.base64();

      // const base64 = await FileSystem.readAsStringAsync(imageUri, {
      //   encoding: "base64",
      // });

      const filePath = `${randomUUID()}.png`;
      // const buffer = await file.readAsync();

      // const contentType = "image/png";

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, decode(base64), {
          contentType: "image/png",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      if (data) {
        return data.path;
      }
    } catch (error) {
      console.error("Error saving image to storage:", error);
      return null;
    }
  };

  const saveVideoInBucket = async (video, bucketName = "videos") => {
    try {
      if (!video?.startsWith("file://")) {
        console.error("Invalid video URI");
        return null;
      }

      const file = new File(video);
      // const base64 = await FileSystem.readAsStringAsync(video, {
      //   encoding: "base64",
      // });

      const base64 = await file.base64();

      const filePath = `${randomUUID()}.mp4`;
      const contentType = "video/mp4";

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, decode(base64), { contentType });

      if (error) {
        throw error;
      }

      if (data) {
        return data.path;
      }
    } catch (error) {
      console.error("Error saving image to storage:", error);
      return null;
    }
  };

  const deleteMediaFromBucket = async (filePath, bucketName = "photos") => {
    try {
      if (!filePath) {
        throw new Error("Files path is required to delete media.");
      }
      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }
      if (data) {
        //console.log(`Successfully deleted file: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error("Error deleting media from storage:", error);
      return false;
    }
  };

  return (
    <PicturesContext.Provider
      value={{ savePhotoInBucket, saveVideoInBucket, deleteMediaFromBucket }}
    >
      {children}
    </PicturesContext.Provider>
  );
};

export default PicturesContextProvider;

export const usePicturesContext = () => useContext(PicturesContext);
