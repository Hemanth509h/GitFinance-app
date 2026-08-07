import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Index() {
    const { loading, isAuthenticated } = useAuth();

    if (loading) return null;

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return <Redirect href="/Dashboard" />;
}
