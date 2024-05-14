import { createContext, useContext } from "react";
import * as ImagePicker from "expo-image-picker";
//import * as FileSystem from "expo-file-system";
import { Storage } from "aws-amplify";

const PicturesContext = createContext({});

const PicturesContextProvider = ({ children }) => {
  const uploadImage = async (uri, filename) => {
    try {
      // console.log("uri", uri);
      // console.log("filename", filename);
      if (!uri) {
        throw new Error("Image URI is undefined");
      }

      //console.log("Fetching image from:", uri);
      const response = await fetch(uri);
      const blob = await response.blob();
      if (!blob) {
        throw new Error("Failed to create blob.");
      }

      console.log("Uploading image to S3...");
      //const filename = `kid-photo-${kidID}-${Date.now()}`;

      // console.log(filename);
      await Storage.put(filename, blob, {
        contentType: "image/jpeg",
      });

      console.log("Image uploaded successfully.");
      /// setPhotoName(filename);

      const imageURL = await Storage.get(filename);
      console.log("Image URL:", imageURL);

      return imageURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // save photo in storage bucket just pass the filename and return the filename stored
  const savePhotoInBucket = async (filename) => {
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
          const imageURL = await uploadImage(result.assets[0].uri, filename);
          return { filename, result };
        } else {
          console.error("Image assets not found in the result.");
          return null;
        }
      } else {
        return result;
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const getPhotoInBucket = async (filename) => {
    try {
      const imageURL = await Storage.get(filename, { expires: 1800 });
      //console.log("Image URL:", imageURL);
      return imageURL;
    } catch (error) {
      console.error("Error getting image:", error);
      throw error;
    }
  };

  return (
    <PicturesContext.Provider value={{ savePhotoInBucket, getPhotoInBucket }}>
      {children}
    </PicturesContext.Provider>
  );
};

export default PicturesContextProvider;

export const usePicturesContext = () => useContext(PicturesContext);
