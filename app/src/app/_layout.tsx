import { Stack } from "expo-router";
import { useEffect } from "react";
import { onDataSynced } from "../api";
import ServerHealth from "../components/ServerHealth";
import { ToastProvider, toast } from "../components/ui/Toast";
import { AuthProvider } from "../context/AuthContext";

function LocalSync() {
  useEffect(() => {
    return onDataSynced(({ synced, updated, pending }) => {
      if (pending > 0) {
        toast.error(
          pending === 1
            ? "1 change could not be synced. Check the server and try again."
            : `${pending} changes could not be synced. Check the server and try again.`,
        );
      } else if (synced > 0) {
        toast.success(
          synced === 1
            ? "1 offline change synced to server."
            : `${synced} offline changes synced to server.`,
        );
      } else if (updated) {
        toast.info("Data updated from server.");
      } else {
        toast.success("Everything is up to date.");
      }
    });
  }, []);

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
