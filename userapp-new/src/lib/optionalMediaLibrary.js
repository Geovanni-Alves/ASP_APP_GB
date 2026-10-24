// src/lib/optionalMediaLibrary.js
// expo-media-library does not exist inside Expo Go on Android (it exists in the real builds). Loading it
// directly would make the app fail to start there. This file loads it with care: when it is missing, the app
// opens anyway and only "save to the photo library" says that it is not available.
let real = null;
try {
  real = require("expo-media-library/legacy");
} catch (error) {
  real = null;
}

export const mediaLibraryAvailable = !!real;

export const MediaLibrary = real || {
  requestPermissionsAsync: async () => ({ granted: false }),
  createAssetAsync: async () => {
    throw new Error(
      "Saving to the photo library is not available in Expo Go on Android",
    );
  },
};
