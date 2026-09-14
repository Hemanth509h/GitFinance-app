import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { toast } from "../../components/ui/Toast";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (
        name: keyof typeof form,
        value: string
    ) => {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        if (!form.email || !form.password) {
            setError("Please enter your email and password.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await login(form.email, form.password);
            toast.success("Signed in successfully.");
            console.log("Login success");
            router.replace("/");
        } catch (err: any) {
            const message = err?.response?.data?.message || "Login failed. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.page}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
            {/* Background */}
            <View style={[styles.greenGlow, { pointerEvents: 'none' }]} />
            <View style={[styles.blueGlow, { pointerEvents: 'none' }]} />
            <View style={[styles.purpleGlow, { pointerEvents: 'none' }]} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets={true}
            >
                <View style={styles.card}>
                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoBox}>
                            <Image
                                source={require("../../../assets/images/logo.png")}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.logoText}>
                            Gig Finances
                        </Text>
                    </View>

                    <Text style={styles.title}>
                        Welcome back
                    </Text>

                    <Text style={styles.subtitle}>
                        Sign in to your account to continue
                    </Text>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    {/* Email */}

                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>

                        <TextInput
                            style={styles.input}
                            value={form.email}
                            onChangeText={(value) =>
                                handleChange("email", value)
                            }
                            placeholder="you@example.com"
                            placeholderTextColor="#64748b"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            selectionColor="#10b981"
                            returnKeyType="next"
                        />
                    </View>

                    {/* Password */}

                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>
                                Password
                            </Text>

                            <TouchableOpacity
                                onPress={() =>
                                    router.push("/forgot-password")
                                }
                            >
                                <Text style={styles.forgotPassword}>
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            value={form.password}
                            onChangeText={(value) =>
                                handleChange("password", value)
                            }
                            placeholder="••••••••"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            selectionColor="#10b981"
                            returnKeyType="done"
                            onSubmitEditing={handleSubmit}
                        />
                    </View>

                    {/* Button */}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading && (
                            <ActivityIndicator
                                size="small"
                                color="#ffffff"
                                style={styles.spinner}
                            />
                        )}

                        <Text style={styles.buttonText}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Text>
                    </TouchableOpacity>

                    {/* Register */}

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>
                            Don't have an account?{" "}
                        </Text>

                        <TouchableOpacity
                            onPress={() =>
                                router.push("/register")
                            }
                        >
                            <Text style={styles.registerLink}>
                                Create one
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,

        // Main screenshot background
        backgroundColor: "#081421",
    },

    scrollView: {
        flex: 1,
        width: "100%",
    },

    container: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",

        paddingHorizontal: 20,
        paddingVertical: 40,
    },

    /*
     * Background glow effects
     */

    greenGlow: {
        position: "absolute",

        width: 400,
        height: 400,

        borderRadius: 200,

        backgroundColor: "#064e3b",

        opacity: 0.28,

        top: -150,
        left: -180,
    },

    blueGlow: {
        position: "absolute",

        width: 450,
        height: 450,

        borderRadius: 225,

        backgroundColor: "#172554",

        opacity: 0.45,

        right: -180,
        top: 50,
    },

    purpleGlow: {
        position: "absolute",

        width: 300,
        height: 300,

        borderRadius: 150,

        backgroundColor: "#312e81",

        opacity: 0.18,

        right: -100,
        bottom: -80,
    },

    /*
     * Card
     */

    card: {
        width: "90%",
        maxWidth: 390,
        backgroundColor: "#172233",

        borderRadius: 20,

        paddingHorizontal: 28,
        paddingVertical: 36,

        borderWidth: 1,
        borderColor: "#2b3a4e",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 15,
        },
        shadowOpacity: 0.35,
        shadowRadius: 25,

        elevation: 12,
        overflow: "hidden",
    },

    /*
     * Logo
     */

    logoSection: {
        alignItems: "center",
        marginBottom: 28,
    },

    logoBox: {
        width: 52,
        height: 52,

        borderRadius: 12,

        backgroundColor: "#ffffff",

        justifyContent: "center",
        alignItems: "center",

        marginBottom: 14,
    },

    logo: {
        width: 45,
        height: 45,
    },

    logoText: {
        fontSize: 25,

        fontWeight: "700",

        color: "#f1f5f9",
    },

    /*
     * Heading
     */

    title: {
        fontSize: 23,

        fontWeight: "700",

        textAlign: "center",

        color: "#f1f5f9",
        marginTop: -25,

        marginBottom: 8,
    },

    subtitle: {
        fontSize: 14,

        textAlign: "center",

        color: "#94a3b8",

        marginBottom: 32,
    },

    /*
     * Error
     */

    errorBox: {
        backgroundColor: "#451a1a",

        borderWidth: 1,
        borderColor: "#7f1d1d",

        padding: 12,

        borderRadius: 8,

        marginBottom: 18,
    },

    errorText: {
        color: "#fca5a5",

        fontSize: 13,
    },

    /*
     * Fields
     */

    field: {
        marginBottom: 20,
    },

    labelRow: {
        flexDirection: "row",

        justifyContent: "space-between",

        alignItems: "center",

        marginBottom: 8,
    },

    label: {
        color: "#e2e8f0",

        fontSize: 14,

        fontWeight: "600",

        marginBottom: 8,
    },

    forgotPassword: {
        color: "#10b981",

        fontSize: 13,

        fontWeight: "500",
    },

    /*
     * Inputs
     */

    input: {
        width: "100%",

        height: 48,

        backgroundColor: "#162333",

        borderWidth: 1,
        borderColor: "#334155",

        borderRadius: 9,

        paddingHorizontal: 14,

        color: "#f8fafc",

        fontSize: 15,
    },

    /*
     * Button
     */

    button: {
        height: 50,

        backgroundColor: "#10b981",

        borderRadius: 9,

        justifyContent: "center",
        alignItems: "center",

        flexDirection: "row",

        marginTop: 8,

        shadowColor: "#10b981",

        shadowOffset: {
            width: 0,
            height: 5,
        },

        shadowOpacity: 0.3,

        shadowRadius: 10,

        elevation: 6,
    },

    buttonDisabled: {
        opacity: 0.65,
    },

    buttonText: {
        color: "#ffffff",

        fontSize: 15,

        fontWeight: "700",
    },

    spinner: {
        marginRight: 8,
    },

    /*
     * Register
     */

    registerContainer: {
        flexDirection: "row",

        justifyContent: "center",

        alignItems: "center",

        marginTop: 26,
    },

    registerText: {
        color: "#94a3b8",

        fontSize: 14,
    },

    registerLink: {
        color: "#10b981",

        fontSize: 14,

        fontWeight: "700",
    },
});
