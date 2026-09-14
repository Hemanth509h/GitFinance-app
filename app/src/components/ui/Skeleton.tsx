import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from "react-native";

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle | ViewStyle[];
}

export function Skeleton({ width = "100%", height = 20, borderRadius = 8, style }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.25)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.65,
                    duration: 750,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.25,
                    duration: 750,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeletonBase,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function CardSkeleton() {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <Skeleton width={36} height={36} borderRadius={10} />
                <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="50%" height={14} />
                    <Skeleton width="30%" height={10} />
                </View>
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
                <Skeleton width="100%" height={16} />
                <Skeleton width="80%" height={16} />
            </View>
        </View>
    );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View style={{ gap: 14, padding: 16 }}>
            {Array.from({ length: count }).map((_, idx) => (
                <CardSkeleton key={idx} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    skeletonBase: {
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        borderWidth: 1,
    },
    cardContainer: {
        backgroundColor: "#111a2e",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2b3a4e",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
});
