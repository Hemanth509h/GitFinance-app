import { Stack } from "expo-router";
import ServerHealth from "../components/ServerHealth";
import { ToastProvider } from "../components/ui/Toast";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
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
