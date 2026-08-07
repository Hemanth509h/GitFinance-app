import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import ServerHealth from "../components/ServerHealth";
import { AuthProvider, useAuth } from "../context/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch((err) => {
      console.warn("Failed to hide native splash screen:", err);
    });
  }, []);

  return (
    <AuthProvider>
      <ServerHealth />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
