import type { CapacitorConfig } from "@capacitor/cli";

// CAP_DEV=1 builds a shell for emulators that talks to a local API over plain HTTP.
// Release builds never set it: the bundle is local and the API is HTTPS only.
const dev = process.env.CAP_DEV === "1";

const config: CapacitorConfig = {
  appId: "ch.gymtrack.app",
  appName: "GymTrack",
  webDir: "out",
  backgroundColor: "#0b0d10",
  plugins: {
    SystemBars: { insetsHandling: "native" },
    Keyboard: { resizeOnFullScreen: true }
  },
  android: { allowMixedContent: dev },
  ios: { contentInset: "never" }
};

export default config;
