// src/contexts/PicturesContext.js
import React, { createContext, useContext } from "react";
import api from "../lib/api";

const PicturesContext = createContext({});

// Sends one file to the API and returns the "path" (the file name) that the database keeps.
// The file goes as a normal form upload: the API checks the type and the size.
async function uploadFile(uri, bucketName, mimeType, extension) {
  const form = new FormData();
  form.append("file", { uri, name: `upload.${extension}`, type: mimeType });

  const { data } = await api.post(`/files/${bucketName}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (body) => body, // send the form as it is
    timeout: 120000, // a video can take a while on a weak connection
  });
  return data.path;
}

const PicturesContextProvider = ({ children }) => {
  const savePhotoInBucket = async (image, bucketName = "photos") => {
    try {
      const uri = image?.uri;
      if (!uri || !(uri.startsWith("file://") || uri.startsWith("content://"))) {
        console.error("Invalid image URI");
        return null;
      }

      // The real type of the photo (the camera and the gallery tell it); JPEG when unknown
      const isPng = (image.mimeType || "").includes("png") || /\.png$/i.test(uri);
      return await uploadFile(
        uri,
        bucketName,
        isPng ? "image/png" : "image/jpeg",
        isPng ? "png" : "jpg",
      );
    } catch (error) {
      console.error(
        "Error saving image to storage:",
        error?.response?.data || error.message,
      );
      return null;
    }
  };

  const saveVideoInBucket = async (video, bucketName = "videos") => {
    try {
      if (!video?.startsWith("file://") && !video?.startsWith("content://")) {
        console.error("Invalid video URI");
        return null;
      }

      const isMov = /\.mov$/i.test(video);
      return await uploadFile(
        video,
        bucketName,
        isMov ? "video/quicktime" : "video/mp4",
        isMov ? "mov" : "mp4",
      );
    } catch (error) {
      console.error(
        "Error saving video to storage:",
        error?.response?.data || error.message,
      );
      return null;
    }
  };

  const deleteMediaFromBucket = async (filePath, bucketName = "photos") => {
    try {
      if (!filePath) {
        throw new Error("Files path is required to delete media.");
      }
      await api.delete(`/files/${bucketName}/${filePath}`);
      return true;
    } catch (error) {
      console.error(
        "Error deleting media from storage:",
        error?.response?.data || error.message,
      );
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
