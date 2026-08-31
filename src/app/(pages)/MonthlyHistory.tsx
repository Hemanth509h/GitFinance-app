import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, syncLocalData } from "../../api";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { showAlertToast, toast } from "../../components/ui/Toast";
import { useAuth } from "../../context/AuthContext";

const Alert = { alert: showAlertToast };

interface MonthHistoryItem {
  month: string;
  label: string;
  workCount: number;
  earned: number;
  expenseTotal: number;
  expenseCount: number;
  expectedEarnings: number;
  pending: number;
  repaymentTotal: number;
  repaymentCount: number;
}

export default function MonthlyHistory() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [months, setMonths] = useState<MonthHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data } = await api.getMonthlyHistory();
      setMonths(data || []);
    } catch (error) {
      console.error("Failed to fetch monthly history", error);
      toast.error("Failed to retrieve monthly history data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const hasLoadedRef = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      fetchHistory();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncLocalData().catch(() => {});
    await fetchHistory();
  };

  const formatCurrency = (amount: number) => {
    const locale =
      currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-IE";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Monthly History</Text>
          <Text style={styles.headerSubtitle}>
            Snapshot of earnings, expenses & repayments
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={refreshing || loading}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ListSkeleton count={4} />
      ) : months.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="archive-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>No previous monthly logs found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {months.map((month) => {
            const netAfterExpenses = month.earned - month.expenseTotal;
            return (
              <View key={month.month} style={styles.historyCard}>
                {/* Mint green gradient Month Header */}
                <LinearGradient
                  colors={["#0f766e", "#10b981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardHeaderStrip}
                >
                  <View style={styles.headerLeft}>
                    <View style={styles.calendarIconBox}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#ffffff"
                      />
                    </View>
                    <View>
                      <Text style={styles.monthLabel}>{month.label}</Text>
                      <Text style={styles.workCountSubText}>
                        {month.workCount} work{" "}
                        {month.workCount === 1 ? "entry" : "entries"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    <Text style={styles.netLabel}>NET AFTER EXPENSES</Text>
                    <Text style={styles.netVal}>
                      {formatCurrency(netAfterExpenses)}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Four-column stats grid */}
                <View style={styles.statsGrid}>
                  {/* Expected */}
                  <View style={styles.statCell}>
                    <View style={styles.labelRow}>
                      <Ionicons name="trending-up" size={12} color="#64748b" />
                      <Text style={styles.statLabel}>Expected</Text>
                    </View>
                    <Text style={styles.statVal}>
                      {formatCurrency(month.expectedEarnings)}
                    </Text>
                    <Text style={styles.statSubText}>Total billed</Text>
                  </View>

                  {/* Pending */}
                  <View style={styles.statCell}>
                    <View style={styles.labelRow}>
                      <Ionicons
                        name="wallet-outline"
                        size={12}
                        color="#64748b"
                      />
                      <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <Text style={[styles.statVal, { color: "#10b981" }]}>
                      {formatCurrency(month.pending)}
                    </Text>
                    <Text style={styles.statSubText}>Uncollected</Text>
                  </View>

                  {/* Expenses */}
                  <View style={styles.statCell}>
                    <View style={styles.labelRow}>
                      <Ionicons
                        name="receipt-outline"
                        size={12}
                        color="#64748b"
                      />
                      <Text style={styles.statLabel}>Expenses</Text>
                    </View>
                    <Text style={[styles.statVal, { color: "#f87171" }]}>
                      {formatCurrency(month.expenseTotal)}
                    </Text>
                    <Text style={styles.statSubText}>
                      {month.expenseCount} record
                      {month.expenseCount !== 1 ? "s" : ""}
                    </Text>
                  </View>

                  {/* Repaid */}
                  <View style={styles.statCell}>
                    <View style={styles.labelRow}>
                      <Ionicons
                        name="trending-down-outline"
                        size={12}
                        color="#64748b"
                      />
                      <Text style={styles.statLabel}>Repaid</Text>
                    </View>
                    <Text style={[styles.statVal, { color: "#f87171" }]}>
                      {formatCurrency(month.repaymentTotal)}
                    </Text>
                    <Text style={styles.statSubText}>
                      {month.repaymentCount} payment
                      {month.repaymentCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: "#111a2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2b3a4e",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  calendarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  workCountSubText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  netLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.6,
  },
  netVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  statCell: {
    flex: 1,
    paddingRight: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statVal: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
  },
  statSubText: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
});
