import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { onDataSynced, syncLocalData } from "../api";
import ServerHealth from "../components/ServerHealth";
import { ToastProvider, toast } from "../components/ui/Toast";
import { AuthProvider, useAuth } from "../context/AuthContext";

function LocalSync() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    return onDataSynced(({ synced, updated }) => {
      if (synced > 0) {
        toast.success(
          synced === 1
            ? "1 offline change synced to server."
            : `${synced} offline changes synced to server.`,
        );
      } else if (updated) {
        toast.info("Data updated from server.");
      }
    });
  }, []);

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
