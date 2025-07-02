export default {
  expo: {
    name: "WordShift",
    slug: "wordshift",
    version: "1.4.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "wordshift", // UNCOMMENTED FOR PRODUCTION BUILD
    userInterfaceStyle: "automatic",
    owner: "armyrunne9916",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#3498db"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.steveomatic.wordshift",
      buildNumber: "9",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false
        },
        ITSAppUsesNonExemptEncryption: false,
        SKAdNetworkItems: [
          {
            SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork"
          },
          {
            SKAdNetworkIdentifier: "4pfyvq9l8r.skadnetwork"
          },
          {
            SKAdNetworkIdentifier: "2fnua5tdw4.skadnetwork"
          },
          {
            SKAdNetworkIdentifier: "ydx93a7ass.skadnetwork"
          },
          {
            SKAdNetworkIdentifier: "5a6flpkh64.skadnetwork"
          }
        ],
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you."
      },
      config: {
        googleMobileAdsAppId: "ca-app-pub-7368779159802085~7370758902"
      }
    },
    android: {
      package: "com.steveomatic.wordshift",
      versionCode: 4,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#3498db"
      },
      permissions: ["VIBRATE", "com.android.vending.BILLING"],
      config: {
        googleMobileAdsAppId: "ca-app-pub-7368779159802085~7370758902"
      }
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#3498db",
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain"
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          iosAppId: "ca-app-pub-7368779159802085~7370758902",
          androidAppId: "ca-app-pub-7368779159802085~7370758902"
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "64e89a77-73ce-47f6-8212-c25a6541d960"
      }
    }
  }
};