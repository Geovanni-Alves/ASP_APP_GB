import "dotenv/config";

export default {
  name: "ASP_APP_Staff",
  slug: "drop-off-gb",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundGradient: "horizontal",
    backgroundGradientLeft: "#59dae4",
    backgroundGradientRight: "#2287f4",
    backgroundColor: "#59dae4",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "this is a app for drive kids to home (drop off) and i need to get the location of the driver to inform the parents",
      NSLocationAlwaysUsageDescription:
        "this is a app for drive kids to home (drop off) and i need to get the location of the driver to inform the parents",
      UIBackgroundModes: ["location", "fetch"],
      GMSApiKey: process.env.GOOGLE_MAPS_APIKEY,
    },
    supportsTablet: false,
    bundleIdentifier: "com.geodarth.dropoffgb",
    device: ["iphone"],
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
    package: "com.geodarth.dropoffgb",
    googleServicesFile: "./google-services.json",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    GOOGLE_MAPS_APIKEY: process.env.GOOGLE_MAPS_APIKEY,
    eas: {
      projectId: "86aaefd7-300b-4ba0-9f96-ede028a516c4",
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
