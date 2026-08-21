import { router } from "expo-router";
import { useEffect } from "react";
import SplashScreen from "../components/SplashScreen";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    router.replace(isAuthenticated ? "/Dashboard" : "/login");
  }, [loading, isAuthenticated]);

  return loading ? <SplashScreen /> : null;
}
