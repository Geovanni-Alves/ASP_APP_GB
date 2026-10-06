import React, { createContext, useContext } from "react";
import supabase from "../lib/supabase"; // Ensure supabase is properly configured
import { v4 as uuidv4 } from "uuid"; // UUID package for unique filenames

const PicturesContext = createContext({});

const PicturesContextProvider = ({ children }) => {
  const getFileExtension = (mimeType) => {
    switch (mimeType) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "video/mp4":
        return "mp4";
      default:
        return "";
    }
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // Split off the base64 header
      reader.onerror = (error) => reject(error);
    });
  };

  const savePhotoInBucket = async (file, bucketName = "photos") => {
    const mimeType = file.type || "image/png"; // Default to png if type is missing
    if (!file) {
      console.error("Invalid file input");
      return null;
    }

    try {
      //const base64 = await readFileAsBase64(file);

      const filePath = `${uuidv4()}.${getFileExtension(mimeType)}`;
      const contentType = mimeType;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType,
          upsert: false, // Do not overwrite existing files
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

  const saveVideoInBucket = async (file, bucketName = "videos") => {
    const mimeType = file.type || "video/mp4"; // Default to mp4 if type is missing
    if (!file) {
      console.error("Invalid file input");
      return null;
    }

    try {
      const base64 = await readFileAsBase64(file);

      const filePath = `${uuidv4()}.${getFileExtension(mimeType)}`;
      const contentType = mimeType;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, base64, {
          contentType,
          upsert: false, // Do not overwrite existing files
        });

      if (error) {
        throw error;
      }

      if (data) {
        return data.path;
      }
    } catch (error) {
      console.error("Error saving video to storage:", error);
      return null;
    }
  };

  const deleteMediaFromBucket = async (filePath, bucketName = "photos") => {
    try {
      if (!filePath) {
        throw new Error("File path is required to delete media.");
      }
      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }
      if (data) {
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
