import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, syncLocalData } from "../../api";
import {
  FormActions,
  FormChoices,
  FormField,
  FormInput,
} from "../../components/ui/FormControls";
import { FormModal } from "../../components/ui/FormModal";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { showAlertToast, toast } from "../../components/ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { useReloadOnSync } from "../../hooks/useReloadOnSync";

const Alert = { alert: showAlertToast };

function PaymentForm({ workEntry, onSubmit, onCancel }: any) {
  const remaining = Math.max(
    0,
    Number(workEntry?.amount || 0) - Number(workEntry?.amountPaid || 0),
  );
  const [amount, setAmount] = useState(String(remaining));
  const [status, setStatus] = useState("Paid");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const paid = Number(amount);
    if (paid <= 0 || paid > remaining)
      return setError(
        paid > remaining
          ? "Payment cannot exceed the outstanding balance."
          : "Enter a valid payment amount.",
      );
    setSubmitting(true);
    try {
      await onSubmit({ amountPaid: paid, status });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <FormField label="Amount received *" error={error}>
        <FormInput
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
        />
      </FormField>
      <FormField label="Payment status">
        <FormChoices
          value={status}
          options={["Paid", "Partially Paid"]}
          onChange={setStatus}
        />
      </FormField>
      <FormActions
        submitLabel="Record payment"
        onSubmit={submit}
        onCancel={onCancel}
        submitting={submitting}
      />
    </>
  );
}

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
  } else if (
    status === "Unpaid" ||
    status === "Failed" ||
    status === "expense"
  ) {
    bg = "rgba(239, 68, 68, 0.15)";
    fg = "#ef4444";
  }
  return (
    <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{status}</Text>
    </View>
  );
}

export default function Payments() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [expandedLogs, setExpandedLogs] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Modal Forms State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [paymentStatusInput, setPaymentStatusInput] = useState("Paid");

  const [showWorkEntryModal, setShowWorkEntryModal] = useState(false);
  const [editingWorkEntry, setEditingWorkEntry] = useState<any>(null);
  const [editClient, setEditClient] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editStatus, setEditStatus] = useState("Unpaid");
  const [editDescription, setEditDescription] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchLogs = async () => {
    try {
      const { data } = await api.getWorkLogs();
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch work logs", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncLocalData().catch(() => {});
    await fetchLogs();
  };

  useReloadOnSync(fetchLogs);

  useFocusEffect(
    React.useCallback(() => {
      fetchLogs();
    }, []),
  );

  const now = new Date();
  const currentMonthWorkLogs = logs.filter((log) => {
    if (!log || !log.date) return false;
    const d = new Date(log.date);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });

  const totalPending = currentMonthWorkLogs
    .filter((l) => l.status !== "Paid")
    .reduce(
      (sum, log) =>
        sum + (Number(log.amount || 0) - Number(log.amountPaid || 0)),
      0,
    );

  const totalReceived = currentMonthWorkLogs
    .filter((l) => l.status === "Paid" || l.status === "Partially Paid")
    .reduce((sum, log) => {
      const paid = Number(log.amountPaid || 0);
      return sum + (paid > 0 ? paid : Number(log.amount || 0));
    }, 0);

  const totalValue = totalReceived + totalPending;
  const collectionRate =
    totalValue > 0 ? (totalReceived / totalValue) * 100 : 0;

  const pendingLogs = logs.filter(
    (log) =>
      log && (log.status === "Unpaid" || log.status === "Partially Paid"),
  );
  const paidLogs = logs.filter((log) => log && log.status === "Paid");

  const formatCurrency = (amount: number) => {
    const value = Number(amount || 0);
    const locale =
      currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-US";
    const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "$";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch (e) {
      return `${symbol}${Math.round(value).toLocaleString()}`;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No Date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Record Payment
  const handleOpenPaymentModal = (entry: any) => {
    setSelectedEntry(entry);
    setAmountPaidInput(String(entry.amount - (entry.amountPaid || 0)));
    setPaymentStatusInput("Paid");
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedEntry) return;
    const newPaid = Number(amountPaidInput);
    if (isNaN(newPaid) || newPaid <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const totalPaidSoFar = (selectedEntry.amountPaid || 0) + newPaid;
    const status =
      totalPaidSoFar >= selectedEntry.amount ? "Paid" : "Partially Paid";

    try {
      await api.updateWorkLog(selectedEntry._id, {
        amountPaid: totalPaidSoFar,
        status: paymentStatusInput || status,
        datePaid: new Date().toISOString(),
      });
      toast.success("Payment recorded successfully.");
      setShowPaymentModal(false);
      fetchLogs();
    } catch (error) {
      console.error("Failed to record payment", error);
      Alert.alert("Error", "Failed to record payment.");
    }
  };

  const submitPaymentForm = async ({
    amountPaid,
    status,
  }: {
    amountPaid: number;
    status: string;
  }) => {
    if (!selectedEntry) return;
    const totalPaidSoFar = Number(selectedEntry.amountPaid || 0) + amountPaid;
    try {
      await api.updateWorkLog(selectedEntry._id, {
        amountPaid: totalPaidSoFar,
        status:
          status ||
          (totalPaidSoFar >= selectedEntry.amount ? "Paid" : "Partially Paid"),
        datePaid: new Date().toISOString(),
      });
      setShowPaymentModal(false);
      fetchLogs();
    } catch (error) {
      console.error("Failed to record payment", error);
      Alert.alert("Error", "Failed to record payment.");
    }
  };

  // Edit Entry
  const handleOpenEditModal = (entry: any) => {
    setEditingWorkEntry(entry);
    setEditClient(entry.client || "");
    setEditAmount(String(entry.amount || 0));
    setEditAmountPaid(String(entry.amountPaid || 0));
    setEditStatus(entry.status || "Unpaid");
    setEditDescription(entry.description || "");
    setShowWorkEntryModal(true);
  };

  const handleUpdateWorkEntry = async () => {
    if (!editingWorkEntry) return;
    const parsedAmount = Number(editAmount);
    const parsedPaid = Number(editAmountPaid);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid total amount.");
      return;
    }

    try {
      await api.updateWorkLog(editingWorkEntry._id, {
        client: editClient,
        amount: parsedAmount,
        amountPaid: parsedPaid,
        status: editStatus,
        description: editDescription,
      });
      toast.success("Work entry updated successfully.");
      setShowWorkEntryModal(false);
      fetchLogs();
    } catch (error) {
      console.error("Failed to update work entry", error);
      toast.error("Failed to save work entry.");
    }
  };

  // Delete Entry
  const handleDeleteWorkEntry = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this work entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteWorkLog(id);
              toast.success("Work entry deleted.");
              fetchLogs();
            } catch (error) {
              console.error("Failed to delete work entry", error);
              toast.error("Failed to delete work entry.");
            }
          },
        },
      ],
    );
  };

  // Grouping helper for History tab
  const groupLogsByMonthAndWeek = (logList: any[]) => {
    if (!logList || !Array.isArray(logList)) return {};
    const sortedLogs = [...logList].sort(
      (a, b) =>
        new Date(b.datePaid || b.date).getTime() -
        new Date(a.datePaid || a.date).getTime(),
    );

    return sortedLogs.reduce((groups: any, log) => {
      if (!log) return groups;
      try {
        const date = new Date(log.datePaid || log.date);
        if (isNaN(date.getTime())) return groups;
        const monthYear = date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });

        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const weekNum = Math.ceil((date.getDate() + startOfMonth.getDay()) / 7);
        const weekLabel = `Week ${weekNum}`;

        if (!groups[monthYear]) groups[monthYear] = {};
        if (!groups[monthYear][weekLabel]) groups[monthYear][weekLabel] = [];
        groups[monthYear][weekLabel].push(log);
      } catch {
        return groups;
      }
      return groups;
    }, {});
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Payments Ledger</Text>
          <Text style={styles.headerSubtitle}>
            Track your earnings and pending collections.
          </Text>
        </View>
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

      {loading ? (
        <ListSkeleton count={4} />
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
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            {/* Pending Card */}
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={["#78350f", "#f59e0b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCardHeader}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.summaryCardLabel}>Pending</Text>
              </LinearGradient>
              <View style={styles.summaryCardBody}>
                <Text style={[styles.summaryCardValue, { color: "#f59e0b" }]}>
                  {formatCurrency(totalPending)}
                </Text>
                <Text style={styles.summaryCardSubtext}>This month</Text>
              </View>
            </View>

            {/* Collected Card */}
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={["#134e4a", "#10b981"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCardHeader}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.summaryCardLabel}>Collected</Text>
              </LinearGradient>
              <View style={styles.summaryCardBody}>
                <Text style={[styles.summaryCardValue, { color: "#10b981" }]}>
                  {formatCurrency(totalReceived)}
                </Text>
                <Text style={styles.summaryCardSubtext}>This month</Text>
              </View>
            </View>

            {/* Success Rate Card */}
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={["#1e3a5f", "#3b82f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCardHeader}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.summaryCardLabel}>Success Rate</Text>
              </LinearGradient>
              <View style={styles.summaryCardBody}>
                <Text style={[styles.summaryCardValue, { color: "#3b82f6" }]}>
                  {Math.round(collectionRate)}%
                </Text>
                <Text style={styles.summaryCardSubtext}>Collection rate</Text>
              </View>
            </View>
          </View>

          {/* Segment Control / Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "pending" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("pending")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "pending" && styles.tabButtonTextActive,
                ]}
              >
                Pending ({pendingLogs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "history" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("history")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "history" && styles.tabButtonTextActive,
                ]}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs Content */}
          {activeTab === "pending" ? (
            /* Pending Tab List */
            <View style={styles.listContainer}>
              {pendingLogs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No pending payments. You're all caught up!
                  </Text>
                </View>
              ) : (
                pendingLogs.map((log) => {
                  const remaining = log.amount - log.amountPaid;
                  const isExpanded = !!expandedLogs[log._id];

                  return (
                    <View key={log._id} style={styles.logCard}>
                      <TouchableOpacity
                        style={styles.logCardMain}
                        activeOpacity={0.9}
                        onPress={() => toggleExpand(log._id)}
                      >
                        {/* Date Badge */}
                        <LinearGradient
                          colors={["#059669", "#10b981"]}
                          style={styles.dateBadge}
                        >
                          <Text style={styles.dateBadgeMonth}>
                            {new Date(log.date).toLocaleString("default", {
                              month: "short",
                            })}
                          </Text>
                          <Text style={styles.dateBadgeDay}>
                            {new Date(log.date).getDate()}
                          </Text>
                        </LinearGradient>

                        <View style={styles.logCardLeft}>
                          <Text style={styles.logClient} numberOfLines={1}>
                            {log.client}
                          </Text>
                          <Text style={styles.logDate}>
                            {formatDate(log.date)}
                          </Text>
                        </View>
                        <View style={styles.logCardRight}>
                          <View style={styles.logCardRow}>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentModal(log);
                              }}
                              style={styles.actionBtnPrimary}
                            >
                              <Ionicons name="card" size={14} color="#ffffff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(log);
                              }}
                              style={styles.actionBtnSecondary}
                            >
                              <Ionicons
                                name="pencil-sharp"
                                size={14}
                                color="#60a5fa"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkEntry(log._id);
                              }}
                              style={styles.actionBtnDanger}
                            >
                              <Ionicons
                                name="trash-sharp"
                                size={14}
                                color="#ef4444"
                              />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.badgeWrapper}>
                            <Badge status={log.status} />
                          </View>
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color="#94a3b8"
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>

                      {/* Quick metrics grid inside card */}
                      <View style={styles.statsCardGrid}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Expected</Text>
                          <Text style={styles.statVal}>
                            {formatCurrency(log.amount)}
                          </Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Received</Text>
                          <Text style={styles.statVal}>
                            {formatCurrency(log.amountPaid || 0)}
                          </Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Balance</Text>
                          <Text style={[styles.statVal, { color: "#ef4444" }]}>
                            {formatCurrency(remaining)}
                          </Text>
                        </View>
                      </View>

                      {/* Expandable Panel */}
                      {isExpanded && (
                        <View style={styles.expandedPanel}>
                          <Text style={styles.expandedTitle}>LOG DETAILS</Text>
                          <View style={styles.expandedDetailsGroup}>
                            <View style={styles.expandedDetailRow}>
                              <Text style={styles.expandedDetailLabel}>
                                Date:{" "}
                              </Text>
                              <Text style={styles.expandedDetailValue}>
                                {new Date(log.date).toLocaleDateString(
                                  undefined,
                                  {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )}
                              </Text>
                            </View>
                            <View style={styles.expandedDetailRow}>
                              <Text style={styles.expandedDetailLabel}>
                                Expected Amount:{" "}
                              </Text>
                              <Text style={styles.expandedDetailValue}>
                                {formatCurrency(log.amount)}
                              </Text>
                            </View>
                            <View style={styles.expandedDetailRow}>
                              <Text style={styles.expandedDetailLabel}>
                                Amount Received:{" "}
                              </Text>
                              <Text style={styles.expandedDetailValue}>
                                {formatCurrency(log.amountPaid || 0)}
                              </Text>
                            </View>
                            <View style={styles.expandedDetailRow}>
                              <Text style={styles.expandedDetailLabel}>
                                Remaining Balance:{" "}
                              </Text>
                              <Text style={styles.expandedDetailValue}>
                                {formatCurrency(remaining)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.descriptionBox}>
                            <View style={styles.descriptionAccentBar} />
                            <View style={styles.descriptionTextWrapper}>
                              <Text style={styles.descriptionLabel}>
                                Notes / Description
                              </Text>
                              <Text style={styles.descriptionContent}>
                                {log.description || "No description provided."}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            /* History Tab List Grouped by Month/Week */
            <View style={styles.listContainer}>
              {paidLogs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No payment history yet.</Text>
                </View>
              ) : (
                Object.entries(groupLogsByMonthAndWeek(paidLogs))
                  .sort(
                    (a, b) =>
                      new Date(b[0]).getTime() - new Date(a[0]).getTime(),
                  )
                  .map(([monthYear, weeks]: [string, any]) => (
                    <View key={monthYear} style={styles.historyGroup}>
                      <Text style={styles.historyGroupTitle}>{monthYear}</Text>

                      {Object.entries(weeks)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([weekLabel, weekLogs]: [string, any]) => {
                          const weeklyTotal = weekLogs.reduce(
                            (sum: number, l: any) =>
                              sum + (l.amountPaid || l.amount),
                            0,
                          );

                          return (
                            <View key={weekLabel} style={styles.weekGroup}>
                              <View style={styles.weekHeader}>
                                <Text style={styles.weekLabel}>
                                  {weekLabel}
                                </Text>
                                <Text style={styles.weekTotal}>
                                  Total: {formatCurrency(weeklyTotal)}
                                </Text>
                              </View>

                              {weekLogs.map((log: any) => {
                                const isExpanded = !!expandedLogs[log._id];

                                return (
                                  <View key={log._id} style={styles.logCard}>
                                    <TouchableOpacity
                                      style={styles.logCardMain}
                                      activeOpacity={0.9}
                                      onPress={() => toggleExpand(log._id)}
                                    >
                                      {/* Date Badge */}
                                      <LinearGradient
                                        colors={["#0072ff", "#00c6ff"]}
                                        style={styles.dateBadge}
                                      >
                                        <Text style={styles.dateBadgeMonth}>
                                          {new Date(
                                            log.datePaid || log.date,
                                          ).toLocaleString("default", {
                                            month: "short",
                                          })}
                                        </Text>
                                        <Text style={styles.dateBadgeDay}>
                                          {new Date(
                                            log.datePaid || log.date,
                                          ).getDate()}
                                        </Text>
                                      </LinearGradient>

                                      <View style={styles.logCardLeft}>
                                        <Text
                                          style={styles.logClient}
                                          numberOfLines={1}
                                        >
                                          {log.client}
                                        </Text>
                                        <Text style={styles.logDate}>
                                          Paid{" "}
                                          {log.datePaid
                                            ? formatDate(log.datePaid)
                                            : formatDate(log.date)}
                                        </Text>
                                      </View>
                                      <View style={styles.logCardRight}>
                                        <Text style={styles.historyAmountText}>
                                          {formatCurrency(
                                            log.amountPaid || log.amount,
                                          )}
                                        </Text>
                                        <View style={styles.cardActionsRow}>
                                          <TouchableOpacity
                                            onPress={(e) => {
                                              e.stopPropagation();
                                              handleOpenEditModal(log);
                                            }}
                                            style={styles.actionBtnSecondary}
                                          >
                                            <Ionicons
                                              name="pencil-sharp"
                                              size={14}
                                              color="#60a5fa"
                                            />
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            onPress={(e) => {
                                              e.stopPropagation();
                                              handleDeleteWorkEntry(log._id);
                                            }}
                                            style={styles.actionBtnDanger}
                                          >
                                            <Ionicons
                                              name="trash-sharp"
                                              size={14}
                                              color="#ef4444"
                                            />
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                      <Ionicons
                                        name={
                                          isExpanded
                                            ? "chevron-up"
                                            : "chevron-down"
                                        }
                                        size={18}
                                        color="#94a3b8"
                                        style={{ marginLeft: 6 }}
                                      />
                                    </TouchableOpacity>

                                    {isExpanded && (
                                      <View style={styles.expandedPanel}>
                                        <Text style={styles.expandedTitle}>
                                          LOG DETAILS
                                        </Text>
                                        <View
                                          style={styles.expandedDetailsGroup}
                                        >
                                          <View
                                            style={styles.expandedDetailRow}
                                          >
                                            <Text
                                              style={styles.expandedDetailLabel}
                                            >
                                              Work Date:{" "}
                                            </Text>
                                            <Text
                                              style={styles.expandedDetailValue}
                                            >
                                              {new Date(
                                                log.date,
                                              ).toLocaleDateString(undefined, {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                              })}
                                            </Text>
                                          </View>
                                          <View
                                            style={styles.expandedDetailRow}
                                          >
                                            <Text
                                              style={styles.expandedDetailLabel}
                                            >
                                              Paid On:{" "}
                                            </Text>
                                            <Text
                                              style={styles.expandedDetailValue}
                                            >
                                              {log.datePaid
                                                ? formatDate(log.datePaid)
                                                : formatDate(log.date)}
                                            </Text>
                                          </View>
                                          <View
                                            style={styles.expandedDetailRow}
                                          >
                                            <Text
                                              style={styles.expandedDetailLabel}
                                            >
                                              Amount Paid:{" "}
                                            </Text>
                                            <Text
                                              style={styles.expandedDetailValue}
                                            >
                                              {formatCurrency(
                                                log.amountPaid || log.amount,
                                              )}
                                            </Text>
                                          </View>
                                        </View>

                                        <View style={styles.descriptionBox}>
                                          <View
                                            style={styles.descriptionAccentBar}
                                          />
                                          <View
                                            style={
                                              styles.descriptionTextWrapper
                                            }
                                          >
                                            <Text
                                              style={styles.descriptionLabel}
                                            >
                                              Notes / Description
                                            </Text>
                                            <Text
                                              style={styles.descriptionContent}
                                            >
                                              {log.description ||
                                                "No description provided."}
                                            </Text>
                                          </View>
                                        </View>
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}
                    </View>
                  ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal: Record Payment */}
      <FormModal
        visible={showPaymentModal}
        title="Record a Payment"
        onClose={() => setShowPaymentModal(false)}
      >
            <PaymentForm
              workEntry={selectedEntry}
              onSubmit={submitPaymentForm}
              onCancel={() => setShowPaymentModal(false)}
            />
      </FormModal>

      {/* Modal: Edit Work Log */}
      <FormModal
        visible={showWorkEntryModal}
        title="Edit Work Entry"
        onClose={() => setShowWorkEntryModal(false)}
      >
            <Text style={styles.inputLabel}>Client Name</Text>
            <TextInput
              style={styles.textInput}
              value={editClient}
              onChangeText={setEditClient}
              placeholder="Client name"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>
              Total Amount Expected ({currency})
            </Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="Total expected"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>
              Amount Received So Far ({currency})
            </Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={editAmountPaid}
              onChangeText={setEditAmountPaid}
              placeholder="Total paid"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusButtonsRow}>
              {["Paid", "Partially Paid", "Unpaid"].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusSelectorBtn,
                    editStatus === st && styles.statusSelectorBtnActive,
                  ]}
                  onPress={() => setEditStatus(st)}
                >
                  <Text
                    style={[
                      styles.statusSelectorBtnText,
                      editStatus === st && styles.statusSelectorBtnTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[
                styles.textInput,
                { height: 80, textAlignVertical: "top" },
              ]}
              multiline={true}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Log notes"
              placeholderTextColor="#64748b"
            />

            <View style={[styles.modalButtonsRow, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowWorkEntryModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleUpdateWorkEntry}
              >
                <Text style={styles.modalSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
      </FormModal>
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
    paddingBottom: 110,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#172233",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  summaryCardLabel: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryCardBody: {
    padding: 12,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryCardSubtext: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#172233",
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "#2b3a4e",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#2b3a4e",
  },
  tabButtonText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#10b981",
    fontWeight: "700",
  },
  listContainer: {
    flexDirection: "column",
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
  },
  logCard: {
    backgroundColor: "#172233",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2b3a4e",
    overflow: "hidden",
    marginBottom: 12,
  },
  logCardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  dateBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateBadgeMonth: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dateBadgeDay: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: -2,
  },
  logCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  logClient: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  logDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  logCardRight: {
    alignItems: "flex-end",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: "#10b981",
    padding: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnSecondary: {
    backgroundColor: "#2b3a4e",
    padding: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeWrapper: {
    marginTop: 2,
  },
  statsCardGrid: {
    flexDirection: "row",
    backgroundColor: "#0d1724",
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2b3a4e",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  statVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 2,
  },
  expandedPanel: {
    padding: 16,
    backgroundColor: "#0d1726",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  expandedTitle: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  expandedDetailsGroup: {
    gap: 8,
    marginBottom: 14,
  },
  expandedDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  expandedDetailLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  expandedDetailValue: {
    fontSize: 12,
    color: "#f8fafc",
    fontWeight: "600",
  },
  descriptionBox: {
    flexDirection: "row",
    backgroundColor: "#162235",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  descriptionAccentBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#10b981",
    marginRight: 10,
  },
  descriptionTextWrapper: {
    flex: 1,
  },
  descriptionLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
    marginBottom: 4,
  },
  descriptionContent: {
    fontSize: 13,
    color: "#ffffff",
    lineHeight: 18,
  },
  noDescription: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#64748b",
    marginTop: 4,
  },
  historyGroup: {
    marginBottom: 20,
  },
  historyGroupTitle: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingLeft: 4,
  },
  weekGroup: {
    marginBottom: 12,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 3,
    borderColor: "#10b981",
    paddingLeft: 8,
    marginBottom: 8,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10b981",
  },
  weekTotal: {
    fontSize: 11,
    color: "#94a3b8",
  },
  historyAmountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
    marginBottom: 6,
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
  inputLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: "#0d1724",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: "#ffffff",
    fontSize: 14,
  },
  statusButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  statusSelectorBtn: {
    flex: 1,
    backgroundColor: "#0d1724",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  statusSelectorBtnActive: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  statusSelectorBtnText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  statusSelectorBtnTextActive: {
    color: "#10b981",
    fontWeight: "700",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
