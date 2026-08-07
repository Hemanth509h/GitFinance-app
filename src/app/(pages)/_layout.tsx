import React from "react";
import { View, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/BottomNav";

export default function PagesLayout() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return null;

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
            <StatusBar barStyle="light-content" backgroundColor="#081421" />

            <View style={styles.content}>
                <Slot />
            </View>

            <BottomNav />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#081421",
    },
    content: {
        flex: 1,
    },
});
