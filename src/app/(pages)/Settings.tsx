import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { api, syncLocalData } from "../../api";
import { showAlertToast, toast } from "../../components/ui/Toast";
import { useAuth } from "../../context/AuthContext";

const Alert = { alert: showAlertToast };

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Error", "Failed to log out.");
          }
        },
      },
    ]);
  };

  // Form states
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || "INR");
  const [monthlyGoal, setMonthlyGoal] = useState(
    String(user?.monthlyGoal || 50000),
  );
  const [theme, setTheme] = useState(user?.theme || "dark");

  // Password form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Server health states
  const [serverStatus, setServerStatus] = useState<
    "checking" | "healthy" | "unhealthy"
  >("checking");
  const [checkingServer, setCheckingServer] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const checkServerHealth = async () => {
    setCheckingServer(true);
    setServerStatus("checking");
    const startTime = Date.now();
    try {
      const res = await api.healthCheck();
      const endTime = Date.now();
      if (res && res.status === 200) {
        setServerStatus("healthy");
        setLatency(endTime - startTime);
      } else {
        setServerStatus("unhealthy");
        setLatency(null);
      }
    } catch (error) {
      setServerStatus("unhealthy");
      setLatency(null);
    } finally {
      setCheckingServer(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkServerHealth();
      void refreshUser();
    }, [refreshUser]),
  );

  // Sync fields with user context changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setCurrency(user.currency || "INR");
      setMonthlyGoal(String(user.monthlyGoal || 50000));
      setTheme(user.theme || "dark");
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncLocalData();
      await refreshUser();
      toast.success("Settings refreshed from server.");
    } catch (error) {
      toast.error("Failed to refresh settings.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    if (isNaN(Number(monthlyGoal)) || Number(monthlyGoal) <= 0) {
      toast.error("Please enter a valid monthly goal amount.");
      return;
    }

    setSavingProfile(true);
    try {
      await api.updateProfile({
        name,
        currency,
        monthlyGoal: Number(monthlyGoal),
        theme,
      });
      await refreshUser();
      toast.success("Profile settings saved successfully.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save settings.";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.updateProfile({
        currentPassword,
        password,
      });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update password.";
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const currencySymbol =
    currency === "INR" ? "₹" : currency === "USD" ? "$" : "€";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your profile and app preferences
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#4f46e5", "#312e81"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderBanner}
          >
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="person" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.cardHeaderTitle}>Profile Settings</Text>
              <Text style={styles.cardHeaderSubtitle}>{user?.email}</Text>
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Currency</Text>
            <View style={styles.selectorGrid}>
              {[
                { code: "INR", label: "Indian Rupee (₹)" },
                { code: "USD", label: "US Dollar ($)" },
                { code: "EUR", label: "Euro (€)" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.selectorItem,
                    currency === item.code && styles.selectorItemActive,
                  ]}
                  onPress={() => setCurrency(item.code)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      currency === item.code && styles.selectorTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Goals Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#0d9488", "#115e59"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderBanner}
          >
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="ribbon" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.cardHeaderTitle}>Financial Goals</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Set your monthly earnings target
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <Text style={styles.inputLabel}>Monthly Earnings Target</Text>
            <View style={styles.inputWithAddonContainer}>
              <View style={styles.inputAddon}>
                <Text style={styles.inputAddonText}>{currencySymbol}</Text>
              </View>
              <TextInput
                style={styles.textInputWithAddon}
                value={monthlyGoal}
                onChangeText={setMonthlyGoal}
                keyboardType="numeric"
                placeholder="50000"
                placeholderTextColor="#64748b"
              />
            </View>
            <Text style={styles.helpText}>
              This target determines the visual progress indicator on your
              dashboard.
            </Text>
          </View>
        </View>

        {/* Preferences Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#334155", "#1e293b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderBanner}
          >
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="color-palette" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.cardHeaderTitle}>Preferences</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Appearance and application theme
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <Text style={styles.inputLabel}>App Theme</Text>
            <View style={styles.selectorGrid}>
              {[
                { code: "light", label: "Light Theme" },
                { code: "dark", label: "Dark Theme" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.selectorItem,
                    theme === item.code && styles.selectorItemActive,
                  ]}
                  onPress={() => setTheme(item.code)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      theme === item.code && styles.selectorTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Server Status Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#059669", "#064e3b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderBanner}
          >
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="server" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.cardHeaderTitle}>Server Status</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Check backend server health
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <View style={styles.serverStatusRow}>
              <View style={styles.statusLabelContainer}>
                <Text style={styles.statusLabel}>Connection Status</Text>
                <View style={styles.statusIndicatorRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          serverStatus === "healthy"
                            ? "#10b981"
                            : serverStatus === "checking"
                              ? "#eab308"
                              : "#ef4444",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusValueText,
                      {
                        color:
                          serverStatus === "healthy"
                            ? "#10b981"
                            : serverStatus === "checking"
                              ? "#eab308"
                              : "#ef4444",
                      },
                    ]}
                  >
                    {serverStatus === "healthy"
                      ? "Online & Healthy"
                      : serverStatus === "checking"
                        ? "Checking Status..."
                        : "Offline / Connecting..."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkBtn}
                onPress={checkServerHealth}
                disabled={checkingServer}
              >
                {checkingServer ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="pulse" size={16} color="#ffffff" />
                    <Text style={styles.checkBtnText}>Test</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {latency !== null && (
              <Text style={styles.latencyText}>
                Response time:{" "}
                <Text style={{ fontWeight: "700", color: "#f8fafc" }}>
                  {latency}ms
                </Text>
              </Text>
            )}
          </View>
        </View>

        {/* Save Profile Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="save" size={16} color="#ffffff" />
              <Text style={styles.submitBtnText}>Save Profile settings</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Password Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#dc2626", "#7f1d1d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderBanner}
          >
            <View style={styles.cardHeaderIconBox}>
              <Ionicons name="lock-closed" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.cardHeaderTitle}>Change Password</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Update your authentication credentials
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: "#dc2626", marginTop: 12 },
              ]}
              onPress={handleSavePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="key" size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={18} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081421",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#172233",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#111a2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2b3a4e",
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  cardHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  cardBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  inputWithAddonContainer: {
    flexDirection: "row",
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    borderRadius: 10,
    overflow: "hidden",
  },
  inputAddon: {
    backgroundColor: "#1f2e46",
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#2b3a4e",
  },
  inputAddonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  textInputWithAddon: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  selectorGrid: {
    flexDirection: "row",
    gap: 8,
  },
  selectorItem: {
    flex: 1,
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  selectorItemActive: {
    backgroundColor: "#0d9488",
    borderColor: "#0d9488",
  },
  selectorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  selectorTextActive: {
    color: "#ffffff",
  },
  helpText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  serverStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabelContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValueText: {
    fontSize: 14,
    fontWeight: "700",
  },
  checkBtn: {
    backgroundColor: "#0d9488",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  latencyText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 54,
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
});
