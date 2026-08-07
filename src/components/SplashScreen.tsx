import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ImageBackground,
    StyleSheet,
    Text
} from "react-native";
import { api } from "../api";

export default function Splashscreen() {
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
                } else {
                    handleUnhealthy();
                }
            } catch (error) {
                if (!isMounted) return;
                console.warn("Health check failed in Splash:", error);
                handleUnhealthy();
            }
        };

        const handleUnhealthy = () => {
            setIsOpen(true);

            if (!secondsInterval) {
                secondsInterval = setInterval(() => {
                    if (isMounted) setSeconds((s) => s + 1);
                }, 1000);
            }

            if (!slowNoteTimeout) {
                slowNoteTimeout = setTimeout(() => {
                    if (isMounted) setShowSlowNote(true);
                }, 4000);
            }

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
        <ImageBackground
            source={require("../../assets/images/background.png")}
            style={styles.container}
            resizeMode="cover"
        >
            <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>GitFinance</Text>
            <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 24 }} />

        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: "#081421",
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        marginTop: '-45%',
        width: 200,
        height: 200,
        borderRadius: 50,
    },
    title: {
        marginTop: 43,
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.75,
        textShadowColor: 'rgba(16, 185, 129, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    }
});