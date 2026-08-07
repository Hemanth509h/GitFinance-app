import React, { useState, useEffect } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    StyleSheet,
    Text,
    View,
    StatusBar,
} from "react-native";
import { api } from "../api";

export default function ServerHealth() {
    const [isOpen, setIsOpen] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [showSlowNote, setShowSlowNote] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let healthTimeout: ReturnType<typeof setTimeout>;
        let secondsInterval: ReturnType<typeof setInterval>;
        let slowNoteTimeout: ReturnType<typeof setTimeout>;

        const checkHealth = async () => {
            try {
                const res = await api.healthCheck();
                if (!isMounted) return;

                if (res && res.status === 200) {
                    setIsOpen(false);
                    setSeconds(0);
                    setShowSlowNote(false);
                    
                    if (secondsInterval) {
                        clearInterval(secondsInterval);
                        secondsInterval = undefined as any;
                    }
                    if (slowNoteTimeout) {
                        clearTimeout(slowNoteTimeout);
                        slowNoteTimeout = undefined as any;
                    }

                    // Recheck in 10 minutes
                    healthTimeout = setTimeout(checkHealth, 10 * 60 * 1000);
                } else {
                    handleUnhealthy();
                }
            } catch (error) {
                if (!isMounted) return;
                console.warn("Health check failed:", error);
                handleUnhealthy();
            }
        };

        const handleUnhealthy = () => {
            setIsOpen(true);

            // Start counter if not already active
            if (!secondsInterval) {
                secondsInterval = setInterval(() => {
                    if (isMounted) setSeconds((s) => s + 1);
                }, 1000);
            }

            // Start slow note timer if not already active
            if (!slowNoteTimeout) {
                slowNoteTimeout = setTimeout(() => {
                    if (isMounted) setShowSlowNote(true);
                }, 4000);
            }

            // Retry checking every 3 seconds
            healthTimeout = setTimeout(checkHealth, 3000);
        };

        checkHealth();

        return () => {
            isMounted = false;
            if (healthTimeout) clearTimeout(healthTimeout);
            if (secondsInterval) clearInterval(secondsInterval);
            if (slowNoteTimeout) clearTimeout(slowNoteTimeout);
        };
    }, []);

    return (
        <Modal
            visible={isOpen}
            animationType="fade"
            transparent={false}
            statusBarTranslucent
        >
            <StatusBar barStyle="light-content" backgroundColor="#081421" />
            <View style={styles.container}>
                {/* Background glows */}
                <View pointerEvents="none" style={styles.greenGlow} />
                <View pointerEvents="none" style={styles.blueGlow} />

                <View style={styles.card}>
                    {/* Logo */}
                    <View style={styles.logoBox}>
                        <Image
                            source={require("../../assets/images/logo.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>GitFinance</Text>

                    <ActivityIndicator size="large" color="#10b981" style={styles.spinner} />

                    <Text style={styles.status}>
                        {showSlowNote
                            ? `Starting up… ${seconds}s (first load can take up to 50 seconds)`
                            : "Connecting to server…"}
                    </Text>

                    {showSlowNote && (
                        <Text style={styles.note}>
                            The server wakes up on first visit. Please wait a moment.
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#081421",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    greenGlow: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: "#064e3b",
        opacity: 0.3,
        top: -50,
        left: -50,
    },
    blueGlow: {
        position: "absolute",
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: "#172554",
        opacity: 0.4,
        bottom: -100,
        right: -100,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#172233",
        borderRadius: 24,
        paddingHorizontal: 28,
        paddingVertical: 40,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#2b3a4e",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    logoBox: {
        width: 72,
        height: 72,
        borderRadius: 18,
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    logo: {
        width: 60,
        height: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#f1f5f9",
        marginBottom: 24,
    },
    spinner: {
        marginVertical: 16,
    },
    status: {
        fontSize: 14,
        fontWeight: "600",
        color: "#94a3b8",
        textAlign: "center",
        lineHeight: 20,
        marginTop: 8,
    },
    note: {
        fontSize: 12,
        color: "#64748b",
        textAlign: "center",
        marginTop: 12,
        lineHeight: 16,
    },
});
