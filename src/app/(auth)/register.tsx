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
    View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { toast } from "../../components/ui/Toast";

export default function Register() {
    const { register } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirm: "",
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
        setError("");

        // Check empty fields
        if (
            !form.name.trim() ||
            !form.email.trim() ||
            !form.password ||
            !form.confirm
        ) {
            setError("Please fill in all fields.");
            return;
        }

        // Check password length
        if (form.password.length < 6) {
            setError(
                "Password must be at least 6 characters."
            );
            return;
        }

        // Check passwords
        if (form.password !== form.confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await register(
                form.email,
                form.password,
                form.name
            );

            toast.success("Account created successfully.");
            console.log("Registration success");
            router.replace("/");
        } catch (err: any) {
            const message = err?.response?.data?.message || "Registration failed. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.page}
            behavior={
                Platform.OS === "ios"
                    ? "padding"
                    : "height"
            }
            keyboardVerticalOffset={
                Platform.OS === "ios" ? 20 : 0
            }
        >
            {/* Background Glow */}

            <View
                pointerEvents="none"
                style={styles.greenGlow}
            />

            <View
                pointerEvents="none"
                style={styles.blueGlow}
            />

            <View
                pointerEvents="none"
                style={styles.purpleGlow}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets
            >
                <View style={styles.card}>

                    {/* Logo */}

                    <View style={styles.logoSection}>
                        <View style={styles.logoBox}>
                            <Image
                                source={require(
                                    "../../../assets/images/logo.png"
                                )}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.logoText}>
                            GigFinance
                        </Text>
                    </View>

                    {/* Title */}

                    <Text style={styles.title}>
                        Create your account
                    </Text>

                    <Text style={styles.subtitle}>
                        Start tracking your gig income today
                    </Text>

                    {/* Error */}

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    {/* Full Name */}

                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Full Name
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={form.name}
                            onChangeText={(value) =>
                                handleChange("name", value)
                            }
                            placeholder="Your name"
                            placeholderTextColor="#64748b"
                            autoComplete="name"
                            autoCapitalize="words"
                            selectionColor="#10b981"
                            returnKeyType="next"
                        />
                    </View>

                    {/* Email */}

                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Email
                        </Text>

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
                            autoCorrect={false}
                            autoComplete="email"
                            selectionColor="#10b981"
                            returnKeyType="next"
                        />
                    </View>

                    {/* Password */}

                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={form.password}
                            onChangeText={(value) =>
                                handleChange(
                                    "password",
                                    value
                                )
                            }
                            placeholder="At least 6 characters"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="new-password"
                            selectionColor="#10b981"
                            returnKeyType="next"
                        />
                    </View>

                    {/* Confirm Password */}

                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Confirm Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={form.confirm}
                            onChangeText={(value) =>
                                handleChange(
                                    "confirm",
                                    value
                                )
                            }
                            placeholder="Repeat your password"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="new-password"
                            selectionColor="#10b981"
                            returnKeyType="done"
                            onSubmitEditing={handleSubmit}
                        />
                    </View>

                    {/* Create Account */}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            loading &&
                            styles.buttonDisabled,
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
                            {loading
                                ? "Creating account..."
                                : "Create account"}
                        </Text>
                    </TouchableOpacity>

                    {/* Login */}

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>
                            Already have an account?{" "}
                        </Text>

                        <TouchableOpacity
                            onPress={() =>
                                router.replace("/login")
                            }
                        >
                            <Text style={styles.loginLink}>
                                Sign in
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
        backgroundColor: "#081421",
        overflow: "hidden",
    },

    scrollView: {
        flex: 1,
        width: "100%",
    },

    container: {
        flexGrow: 1,
        width: "100%",

        justifyContent: "center",
        alignItems: "center",

        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 60,
    },

    // =========================
    // Background
    // =========================

    greenGlow: {
        position: "absolute",

        width: 280,
        height: 280,

        borderRadius: 140,

        backgroundColor: "#064e3b",

        opacity: 0.25,

        top: -100,
        left: -130,
    },

    blueGlow: {
        position: "absolute",

        width: 300,
        height: 300,

        borderRadius: 150,

        backgroundColor: "#172554",

        opacity: 0.35,

        top: 80,
        right: -150,
    },

    purpleGlow: {
        position: "absolute",

        width: 250,
        height: 250,

        borderRadius: 125,

        backgroundColor: "#312e81",

        opacity: 0.18,

        bottom: -100,
        right: -100,
    },

    // =========================
    // Card
    // =========================

    card: {
        width: "100%",
        maxWidth: 390,

        backgroundColor: "#172233",

        borderRadius: 20,

        paddingHorizontal: 24,
        paddingVertical: 30,

        borderWidth: 1,
        borderColor: "#2b3a4e",

        shadowColor: "#000",

        shadowOffset: {
            width: 0,
            height: 10,
        },

        shadowOpacity: 0.3,
        shadowRadius: 20,

        elevation: 10,
    },

    // =========================
    // Logo
    // =========================

    logoSection: {
        alignItems: "center",
        marginBottom: 22,
    },

    logoBox: {
        width: 52,
        height: 52,

        borderRadius: 12,

        backgroundColor: "#ffffff",

        justifyContent: "center",
        alignItems: "center",

        marginBottom: 12,
    },

    logo: {
        width: 44,
        height: 44,
    },

    logoText: {
        fontSize: 24,
        fontWeight: "700",

        color: "#f1f5f9",
    },

    // =========================
    // Heading
    // =========================

    title: {
        fontSize: 23,
        fontWeight: "700",

        textAlign: "center",

        color: "#f1f5f9",

        marginBottom: 8,
    },

    subtitle: {
        fontSize: 14,

        textAlign: "center",

        color: "#94a3b8",

        marginBottom: 26,
    },

    // =========================
    // Error
    // =========================

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

    // =========================
    // Form
    // =========================

    field: {
        marginBottom: 17,
    },

    label: {
        color: "#e2e8f0",

        fontSize: 14,
        fontWeight: "600",

        marginBottom: 8,
    },

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

    // =========================
    // Button
    // =========================

    button: {
        height: 50,

        backgroundColor: "#10b981",

        borderRadius: 9,

        justifyContent: "center",
        alignItems: "center",

        flexDirection: "row",

        marginTop: 5,

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

    // =========================
    // Login
    // =========================

    loginContainer: {
        flexDirection: "row",

        justifyContent: "center",
        alignItems: "center",

        flexWrap: "wrap",

        marginTop: 24,
    },

    loginText: {
        color: "#94a3b8",
        fontSize: 14,
    },

    loginLink: {
        color: "#10b981",

        fontSize: 14,
        fontWeight: "700",
    },
});
