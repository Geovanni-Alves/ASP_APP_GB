import "dotenv/config";

export default {
  name: "APP_ASP_USER",
  slug: "DropoffUser",
  scheme: "your-app-scheme",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    //resizeMode: "contain",
    backgroundGradient: "horizontal",
    backgroundGradientLeft: "#59dae4",
    backgroundGradientRight: "#2287f4",
    backgroundColor: "#59dae4",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    infoPlist: {
      GMSApiKey: process.env.GOOGLE_MAPS_APIKEY,
      NSCameraUsageDescription:
        "This app requires access to the camera for taking photos.",
      NSPhotoLibraryUsageDescription:
        "This app requires access to your photo library to select images.",
    },
    supportsTablet: false,
    bundleIdentifier: "com.geodarth.DropoffUser",
    device: ["iphone"],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.geodarth.DropoffUser",
    permissions: ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "7c8a0c2e-12a3-4b4c-b54b-6db24b05ed92",
    },
  },
  owner: "x3_web_services",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/7c8a0c2e-12a3-4b4c-b54b-6db24b05ed92",
  },
};
