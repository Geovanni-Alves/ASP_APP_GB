// The app of the parents. (The name and the identifiers are the ones of the first version of this app.)
export default {
  name: "APP_ASP_USER",
  slug: "asp-app-user",
  scheme: "asp-parent",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon-v2.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    backgroundColor: "#5337E0",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.geodarth.app_asp_user",
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: "This app needs the camera to take photos.",
      NSPhotoLibraryUsageDescription:
        "This app needs your photo library to choose photos.",
    },
  },
  android: {
    package: "com.geodarth.app_asp_user",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#5337E0",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-secure-store",
    "expo-notifications",
    [
      "expo-media-library",
      {
        savePhotosPermission:
          "Allow the app to save the photos and videos of your child to your photo library.",
        isAccessMediaLocationEnabled: false,
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "682ba0bc-01bc-4e1b-99b4-b1e285d545c0",
    },
  },

  owner: "AfterHeaven",
};
