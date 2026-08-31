import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { syncLocalData } from "../api";
import ServerHealth from "../components/ServerHealth";
import { ToastProvider } from "../components/ui/Toast";
import { AuthProvider, useAuth } from "../context/AuthContext";

function LocalSync() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    const sync = () => void syncLocalData().catch(() => {});
    sync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  return null;
}

export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LocalSync />
        <ServerHealth />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#081421" },
          }}
        />
      </AuthProvider>
    </ToastProvider>
  );
}
