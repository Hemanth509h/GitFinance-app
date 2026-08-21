import { Slot } from "expo-router";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { useAuth } from "../../context/AuthContext";

export default function PagesLayout() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <View style={{ flex: 1, backgroundColor: "#081421" }} />;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
            <StatusBar barStyle="light-content" backgroundColor="#081421" />

            <View style={styles.contentInner}>
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
    contentInner: {
        flex: 1,
    },
});
