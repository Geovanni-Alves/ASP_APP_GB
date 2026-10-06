import React, { createContext, useContext } from "react";
import { uploadFile, deleteFile } from "../lib/files";

const PicturesContext = createContext({});

const PicturesContextProvider = ({ children }) => {
  // The functions keep the same names and arguments as before, so the screens that
  // call them do not change. The server now chooses the file name and returns it as "path".

  const savePhotoInBucket = async (file, bucketName = "photos") => {
    if (!file) {
      console.error("Invalid file input");
      return null;
    }
    try {
      return await uploadFile(bucketName, file); // the stored file name, or throws
    } catch (error) {
      console.error("Error saving image to storage:", error);
      return null;
    }
  };

  const saveVideoInBucket = async (file, bucketName = "videos") => {
    if (!file) {
      console.error("Invalid file input");
      return null;
    }
    try {
      return await uploadFile(bucketName, file);
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
      await deleteFile(bucketName, filePath);
      return true;
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
