
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, Text } from 'react-native';

export default function Splashscreen() {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace("/login");
        }, 3000);

        return () => clearTimeout(timer);
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
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
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