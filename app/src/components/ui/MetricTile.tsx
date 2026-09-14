import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

interface MetricTileProps {
    title: string;
    value: string;
    subtext?: string;
    subtextColor?: 'primary' | 'error' | 'success' | 'pending' | 'muted' | string;
    icon?: keyof typeof Ionicons.glyphMap;
    gradientFrom?: string;
    gradientTo?: string;
    isFullWidth?: boolean;
}

export function MetricTile({
    title,
    value,
    subtext,
    subtextColor = 'primary',
    icon,
    gradientFrom = '#134e4a',
    gradientTo = '#059669',
    isFullWidth = false,
}: MetricTileProps) {
    let subtextCol = '#94a3b8';
    if (subtextColor === 'success' || subtextColor === 'primary') subtextCol = '#34d399';
    if (subtextColor === 'error') subtextCol = '#ef4444';
    if (subtextColor === 'pending') subtextCol = '#f59e0b';

    return (
        <View style={[styles.tileWrapper, isFullWidth ? { width: '100%' } : { width: '48%' }]}>
            {/* Gradient Banner */}
            <LinearGradient
                colors={[gradientFrom, gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.banner}
            >
                {/* Decorative circles */}
                <View style={[styles.circle, { right: -22, top: -22, width: 100, height: 100, borderRadius: 50 }]} />
                <View style={[styles.circle, { right: 28, top: 45, width: 55, height: 55, borderRadius: 27.5 }]} />

                <View style={styles.header}>
                    {icon && (
                        <View style={styles.iconBox}>
                            <Ionicons name={icon} size={16} color="#ffffff" />
                        </View>
                    )}
                    <Text style={styles.title} numberOfLines={2}>
                        {title}
                    </Text>
                </View>
            </LinearGradient>

            {/* Floating Value Panel */}
            <View style={styles.valuePanelWrapper}>
                <View style={styles.valuePanel}>
                    <Text style={styles.value} numberOfLines={1}>
                        {value}
                    </Text>
                    {subtext ? (
                        <Text style={[styles.subtext, { color: subtextCol }]} numberOfLines={1}>
                            {subtext}
                        </Text>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tileWrapper: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2b3a4e',
        backgroundColor: '#172233',
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    banner: {
        paddingTop: 14,
        paddingHorizontal: 16,
        paddingBottom: 38,
        position: 'relative',
        overflow: 'hidden',
    },
    circle: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.85)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flex: 1,
        lineHeight: 13,
    },
    valuePanelWrapper: {
        paddingHorizontal: 12,
        marginTop: -26,
        marginBottom: 10,
        zIndex: 1,
    },
    valuePanel: {
        backgroundColor: '#172233',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2b3a4e',
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    value: {
        fontSize: 22,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    subtext: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
});
