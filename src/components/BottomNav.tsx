import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ROUTES = [
    { label: "Dashboard", icon: "grid-outline", path: "/Dashboard" },
    { label: "Work Log", icon: "calendar-outline", path: "/WorkLog" },
    { label: "Expenses", icon: "receipt-outline", path: "/Expenses" },
    { label: "Payments", icon: "wallet-outline", path: "/Payments" },
    { label: "Loans", icon: "cash-outline", path: "/Loans" },
    { label: "Profile", icon: "person-circle-outline", path: "/Settings" },
] as const;

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <View style={styles.bottomNav}>
            {ROUTES.map(({ label, icon, path }) => {
                const isActive = pathname === path;
                return (
                    <TouchableOpacity
                        key={path}
                        style={styles.bottomNavLink}
                        onPress={() => router.replace(path)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={icon as any}
                            size={23}
                            color={isActive ? "#10b981" : "#4a5e78"}
                        />
                        <Text style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNav: {
        position: "absolute",
        bottom: 20,
        left: 12,
        right: 12,
        height: 60,
        backgroundColor: "rgba(13, 20, 38, 0.97)",
        borderRadius: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 16,
    },
    bottomNavLink: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        height: "90%",
        gap: 6,
        borderRadius: 16,
    },
    bottomNavText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#4a5e78",
        letterSpacing: 0.2,
    },
    bottomNavTextActive: {
        color: "#10b981",
        fontWeight: "700",
    },
});
