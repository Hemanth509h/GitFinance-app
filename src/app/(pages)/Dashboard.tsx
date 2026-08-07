import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { MetricTile } from "../../components/ui/MetricTile";
import { router } from "expo-router";

// ── Badge Component ──
function Badge({ status }: { status: string }) {
    let bg = "rgba(148, 163, 184, 0.1)";
    let fg = "#94a3b8";
    if (
        status === "Paid" ||
        status === "Success" ||
        status === "income" ||
        status === "work"
    ) {
        bg = "rgba(16, 185, 129, 0.15)";
        fg = "#10b981";
    } else if (status === "Pending") {
        bg = "rgba(245, 158, 11, 0.15)";
        fg = "#f59e0b";
    } else if (status === "Unpaid" || status === "Failed" || status === "expense") {
        bg = "rgba(239, 68, 68, 0.15)";
        fg = "#ef4444";
    }
    return (
        <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: fg }]}>{status}</Text>
        </View>
    );
}

// ── Custom Analytics Chart Component ──
function AnalyticsChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <View style={styles.noChartContainer}>
                <Text style={styles.noChartText}>No chart data available</Text>
            </View>
        );
    }

    const maxVal = Math.max(
        ...data.map((d) =>
            Math.max(
                Number(d.earnings || 0),
                Number(d.expenses || 0),
                Number(d.repayments || 0)
            )
        ),
        100
    );

    return (
        <View style={styles.chartWrapper}>
            {data.map((item, index) => {
                const earnPct = ((item.earnings || 0) / maxVal) * 100;
                const expPct = ((item.expenses || 0) / maxVal) * 100;
                const repPct = ((item.repayments || 0) / maxVal) * 100;

                const monthLabel =
                    item.label ||
                    (item.month && item.month.includes("-")
                        ? item.month.split("-")[1]
                        : item.month) ||
                    "";

                return (
                    <View key={index} style={styles.chartCol}>
                        <View style={styles.barsContainer}>
                            <View
                                style={[
                                    styles.chartBar,
                                    { height: `${Math.max(earnPct, 4)}%`, backgroundColor: "#34d399" },
                                ]}
                            />
                            <View
                                style={[
                                    styles.chartBar,
                                    { height: `${Math.max(expPct, 4)}%`, backgroundColor: "#f97316" },
                                ]}
                            />
                            <View
                                style={[
                                    styles.chartBar,
                                    { height: `${Math.max(repPct, 4)}%`, backgroundColor: "#f87171" },
                                ]}
                            />
                        </View>
                        <Text style={styles.chartLabel}>{monthLabel}</Text>
                    </View>
                );
            })}
        </View>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const monthlyGoal = Number(user?.monthlyGoal) || 50000;
    const currency = user?.currency || "INR";

    const [summary, setSummary] = useState({
        totalEarnedThisMonth: 0,
        totalExpensesThisMonth: 0,
        netIncomeThisMonth: 0,
        pendingPayments: 0,
        pendingCount: 0,
        totalLoanBalance: 0,
        totalLoanGoal: 0,
        totalLoanPaid: 0,
        totalRepaidThisMonth: 0,
        recentActivity: [] as any[],
    });

    const [analytics, setAnalytics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [summaryRes, analyticsRes, workLogsRes] = await Promise.all([
                api.getDashboardSummary(),
                api.getAnalytics(),
                api.getWorkLogs(),
            ]);
            const currentMonth = new Date().toISOString().split("T")[0].substring(0, 7);
            const totalEarnedThisMonth = (workLogsRes.data || [])
                .filter(
                    (log: any) =>
                        log.date &&
                        new Date(log.date).toISOString().split("T")[0].substring(0, 7) === currentMonth
                )
                .reduce((sum: number, log: any) => {
                    if (log.status === "Paid") return sum + Number(log.amount || 0);
                    return sum + Number(log.amountPaid || 0);
                }, 0);

            setSummary({
                totalEarnedThisMonth,
                totalExpensesThisMonth: Number(summaryRes.data?.totalExpensesThisMonth || 0),
                netIncomeThisMonth: totalEarnedThisMonth - Number(summaryRes.data?.totalExpensesThisMonth || 0),
                pendingPayments: Number(summaryRes.data?.pendingPayments || 0),
                pendingCount: Number(summaryRes.data?.pendingCount || 0),
                totalLoanBalance: Number(summaryRes.data?.totalLoanBalance || 0),
                totalLoanGoal: Number(summaryRes.data?.totalLoanGoal || 0),
                totalLoanPaid: Number(summaryRes.data?.totalLoanPaid || 0),
                totalRepaidThisMonth: Number(summaryRes.data?.totalRepaidThisMonth || 0),
                recentActivity: summaryRes.data?.recentActivity || [],
            });
            setAnalytics(analyticsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        const locale = currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-US";
        const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "$";
        try {
            return new Intl.NumberFormat(locale, {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
            }).format(amount);
        } catch (e) {
            return `${symbol}${Math.round(amount).toLocaleString()}`;
        }
    };

    const getMonthName = (date = new Date()) => {
        return date.toLocaleString("default", { month: "long" }).toUpperCase();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const goalProgress = Math.min((summary.totalEarnedThisMonth / monthlyGoal) * 100, 100);
    const loanProgress =
        summary.totalLoanGoal > 0 ? (summary.totalLoanPaid / summary.totalLoanGoal) * 100 : 0;

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Worker Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Welcome back — here's your snapshot.</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        style={styles.refreshButton}
                        disabled={refreshing}
                    >
                        {refreshing ? (
                            <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                            <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#10b981"
                        />
                    }
                >
                    {/* Log action quick buttons */}
                    <View style={styles.quickButtonsRow}>
                        <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: "#10b981" }]}
                            onPress={() => router.replace("/WorkLog")}
                        >
                            <Ionicons name="calendar-outline" size={16} color="#ffffff" />
                            <Text style={styles.quickBtnText}>Log Work</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: "#f97316" }]}
                            onPress={() => router.replace("/Expenses")}
                        >
                            <Ionicons name="receipt-outline" size={16} color="#ffffff" />
                            <Text style={styles.quickBtnText}>Add Expense</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Metrics Grid */}
                    <View style={styles.metricsGrid}>
                        <MetricTile
                            title={`Earned in ${getMonthName()}`}
                            value={formatCurrency(summary.totalEarnedThisMonth)}
                            subtext={`Goal: ${formatCurrency(monthlyGoal)}`}
                            subtextColor="primary"
                            icon="trending-up-outline"
                            gradientFrom="#134e4a"
                            gradientTo="#10b981"
                        />
                        <MetricTile
                            title="Expenses This Month"
                            value={formatCurrency(summary.totalExpensesThisMonth)}
                            subtext={`Net: ${formatCurrency(summary.netIncomeThisMonth)}`}
                            subtextColor={summary.netIncomeThisMonth >= 0 ? "success" : "error"}
                            icon="receipt-outline"
                            gradientFrom="#9a3412"
                            gradientTo="#f97316"
                        />
                        <MetricTile
                            title="Pending Payments"
                            value={formatCurrency(summary.pendingPayments)}
                            subtext={`${summary.pendingCount} await payment`}
                            subtextColor="pending"
                            icon="clipboard-outline"
                            gradientFrom="#78350f"
                            gradientTo="#f59e0b"
                        />
                        <MetricTile
                            title="Loan Balance"
                            value={formatCurrency(summary.totalLoanBalance)}
                            subtext={`Repaid ${Math.round(loanProgress)}%`}
                            subtextColor={summary.totalLoanBalance === 0 ? "success" : "error"}
                            icon="wallet-outline"
                            gradientFrom="#7f1d1d"
                            gradientTo="#ef4444"
                        />
                        <MetricTile
                            title="Repaid This Month"
                            value={formatCurrency(summary.totalRepaidThisMonth)}
                            subtext={summary.totalRepaidThisMonth > 0 ? "Great progress!" : "No repayments yet"}
                            subtextColor="primary"
                            icon="trending-down-outline"
                            gradientFrom="#4c1d95"
                            gradientTo="#8b5cf6"
                            isFullWidth={true}
                        />
                    </View>

                    {/* Analytics Graph Card */}
                    <View style={styles.sectionCard}>
                        <LinearGradient
                            colors={["#1e1b4b", "#4f46e5"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sectionHeaderGradient}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <Ionicons name="trending-up-outline" size={16} color="#ffffff" />
                                <Text style={styles.sectionHeaderTitle}>Earnings & Costs</Text>
                            </View>
                            <View style={styles.legendContainer}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#34d399" }]} />
                                    <Text style={styles.legendText}>Earn</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#f97316" }]} />
                                    <Text style={styles.legendText}>Exp</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#f87171" }]} />
                                    <Text style={styles.legendText}>Repay</Text>
                                </View>
                            </View>
                        </LinearGradient>
                        <View style={styles.sectionBody}>
                            <AnalyticsChart data={analytics} />
                        </View>
                    </View>

                    {/* Monthly Goal Card */}
                    <View style={styles.sectionCard}>
                        <LinearGradient
                            colors={["#134e4a", "#10b981"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sectionHeaderGradient}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <Ionicons name="disc-outline" size={16} color="#ffffff" />
                                <Text style={styles.sectionHeaderTitle}>Monthly Goal</Text>
                            </View>
                        </LinearGradient>
                        <View style={styles.sectionBody}>
                            <View style={styles.goalRow}>
                                <Text style={styles.goalPercent}>{Math.round(goalProgress)}%</Text>
                                <Text style={styles.goalDetail}>
                                    {formatCurrency(summary.totalEarnedThisMonth)} of{" "}
                                    {formatCurrency(monthlyGoal)}
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${goalProgress}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.goalSummary}>
                                {goalProgress >= 100
                                    ? "🎉 Goal reached this month!"
                                    : `${formatCurrency(monthlyGoal - summary.totalEarnedThisMonth)} remaining`}
                            </Text>
                        </View>
                    </View>

                    {/* Recent Activity Card */}
                    <View style={styles.sectionCard}>
                        <LinearGradient
                            colors={["#0c4a6e", "#0284c7"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sectionHeaderGradient}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <Ionicons name="time-outline" size={16} color="#ffffff" />
                                <Text style={styles.sectionHeaderTitle}>Recent Activity</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.replace("/WorkLog")}
                                style={styles.viewAllButton}
                            >
                                <Text style={styles.viewAllText}>View All</Text>
                                <Ionicons name="arrow-forward-outline" size={12} color="#ffffff" />
                            </TouchableOpacity>
                        </LinearGradient>
                        <View style={styles.activityList}>
                            {summary.recentActivity && summary.recentActivity.length > 0 ? (
                                summary.recentActivity.map((activity, index) => {
                                    const isWork = activity.type === "work";
                                    const isExpense = activity.type === "expense";
                                    const name = isWork
                                        ? activity.data.client
                                        : isExpense
                                        ? activity.data.merchant || activity.data.category
                                        : activity.data.loanId?.lenderName || "Loan";

                                    const typeLabel = isWork
                                        ? "Work entry"
                                        : isExpense
                                        ? "Expense"
                                        : "Repayment";

                                    return (
                                        <View key={index} style={styles.activityRow}>
                                            <View style={styles.activityLeft}>
                                                <LinearGradient
                                                    colors={
                                                        isWork
                                                            ? ["#134e4a", "#10b981"]
                                                            : isExpense
                                                            ? ["#9a3412", "#f97316"]
                                                            : ["#7f1d1d", "#ef4444"]
                                                    }
                                                    style={styles.activityIconBox}
                                                >
                                                    <Ionicons
                                                        name={
                                                            isWork
                                                                ? "checkmark-circle-outline"
                                                                : isExpense
                                                                ? "receipt-outline"
                                                                : "time-outline"
                                                        }
                                                        size={16}
                                                        color="#ffffff"
                                                    />
                                                </LinearGradient>
                                                <View>
                                                    <Text style={styles.activityName} numberOfLines={1}>
                                                        {name}
                                                    </Text>
                                                    <Text style={styles.activityDetail}>
                                                        {typeLabel} · {formatDate(activity.date)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.activityRight}>
                                                <Text
                                                    style={[
                                                        styles.activityAmount,
                                                        { color: isWork ? "#10b981" : "#ef4444" },
                                                    ]}
                                                >
                                                    {isWork ? "+" : "-"} {formatCurrency(activity.data.amount)}
                                                </Text>
                                                <Badge
                                                    status={
                                                        isWork
                                                            ? activity.data.status
                                                            : isExpense
                                                            ? activity.data.category
                                                            : activity.data.status || "Success"
                                                    }
                                                />
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.noActivityText}>No recent activity yet.</Text>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#081421",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#ffffff",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#94a3b8",
        marginTop: 2,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#172233",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#2b3a4e",
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    quickButtonsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    quickBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flex: 0.48,
        height: 44,
        borderRadius: 12,
        gap: 6,
    },
    quickBtnText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    metricTile: {
        width: "48%",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    metricTileHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    metricTileTitle: {
        fontSize: 11,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.7)",
        flex: 1,
        marginRight: 4,
    },
    metricTileValue: {
        fontSize: 22,
        fontWeight: "800",
        color: "#ffffff",
        marginVertical: 10,
    },
    metricTileSubtext: {
        fontSize: 10,
        fontWeight: "600",
    },
    sectionCard: {
        backgroundColor: "#172233",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#2b3a4e",
    },
    sectionHeaderGradient: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionHeaderTitle: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    viewAllText: {
        color: "#ffffff",
        fontSize: 11,
        fontWeight: "600",
    },
    sectionBody: {
        padding: 16,
    },
    legendContainer: {
        flexDirection: "row",
        gap: 8,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 9,
        fontWeight: "600",
    },
    noChartContainer: {
        height: 150,
        justifyContent: "center",
        alignItems: "center",
    },
    noChartText: {
        color: "#94a3b8",
        fontSize: 12,
    },
    chartWrapper: {
        height: 160,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "flex-end",
        paddingTop: 10,
    },
    chartCol: {
        alignItems: "center",
        width: 44,
    },
    barsContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 2,
        height: 120,
        width: "100%",
        justifyContent: "center",
    },
    chartBar: {
        width: 8,
        borderRadius: 4,
    },
    chartLabel: {
        fontSize: 9,
        color: "#94a3b8",
        marginTop: 6,
        fontWeight: "600",
    },
    goalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 10,
    },
    goalPercent: {
        fontSize: 26,
        fontWeight: "800",
        color: "#ffffff",
    },
    goalDetail: {
        fontSize: 12,
        color: "#94a3b8",
    },
    progressBarBg: {
        height: 8,
        backgroundColor: "#2b3a4e",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#10b981",
        borderRadius: 4,
    },
    goalSummary: {
        fontSize: 12,
        color: "#94a3b8",
        marginTop: 8,
    },
    activityList: {
        paddingTop: 4,
    },
    activityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#2b3a4e",
    },
    activityLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 0.7,
    },
    activityIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    activityName: {
        fontSize: 13,
        fontWeight: "600",
        color: "#ffffff",
    },
    activityDetail: {
        fontSize: 10,
        color: "#94a3b8",
        marginTop: 2,
    },
    activityRight: {
        alignItems: "flex-end",
    },
    activityAmount: {
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 4,
    },
    badgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: "700",
    },
    noActivityText: {
        color: "#94a3b8",
        fontSize: 12,
        padding: 16,
        textAlign: "center",
    },
});