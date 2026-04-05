import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gameprogress.app",
  appName: "GameProgress",
  webDir: "out",
  server: {
    // Mode live server : l'app charge directement ton site Vercel
    // Change cette URL si ton domaine custom est différent
    url: "https://game-progress-nine.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0a0a",
  },
  ios: {
    backgroundColor: "#0a0a0a",
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "GameProgress",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
      launchFadeOutDuration: 500,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
