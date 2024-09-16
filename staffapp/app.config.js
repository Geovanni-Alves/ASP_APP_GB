export default {
  name: "ASP_APP_Staff",
  slug: "asp-app-staff",
  scheme: "your-app-scheme",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    //resizeMode: "contain",
    backgroundGradient: "horizontal",
    backgroundGradientLeft: "#59dae4",
    backgroundGradientRight: "#2287f4",
    backgroundColor: "#59dae4",
  },
  assetBundlePatterns: ["**/*"],
  plugins: [
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to use your location.",
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-av",
      {
        microphonePermission:
          "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
        savePhotosPermission: "Allow $(PRODUCT_NAME) to save photos.",
        isAccessMediaLocationEnabled: true,
      },
    ],
  ],

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.geodarth.appaspstaff",
    device: ["iphone"],
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_APIKEY,
    },
    infoPlist: {
      GMSApiKey: process.env.GOOGLE_MAPS_APIKEY,
      NSLocationWhenInUseUsageDescription:
        "this is a app for drive kids to home (drop off) and i need to get the location of the driver to inform the parents",
      NSLocationAlwaysUsageDescription:
        "this is a app for drive kids to home (drop off) and i need to get the location of the driver to inform the parents",
      UIBackgroundModes: ["location", "fetch"],
    },
  },
  android: {
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_APIKEY,
      },
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.geodarth.app_asp_staff",
    googleServicesFile: "./google-services.json",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "1f3049ff-13c7-4ab4-8683-52676c43333f",
    },
  },
  owner: "x3_web_services",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/86aaefd7-300b-4ba0-9f96-ede028a516c4",
  },
};
