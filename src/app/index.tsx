import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import Splashscreen from "../components/SplashScreen";

export default function Index() {
    const { loading, isAuthenticated } = useAuth();
    const [minimumDelayPassed, setMinimumDelayPassed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMinimumDelayPassed(true);
        }, 2000); // 2 seconds minimum delay
        return () => clearTimeout(timer);
    }, []);

    if (loading || !minimumDelayPassed) {
        return <Splashscreen />;
    }

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return <Redirect href="/Dashboard" />;
}
