import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { MetricTile } from "../../components/ui/MetricTile";

const formToday = () => new Date().toISOString().slice(0, 10);
function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return <View style={formStyles.field}><Text style={formStyles.label}>{label}</Text>{children}{error ? <Text style={formStyles.error}>{error}</Text> : null}</View>;
}
function FormInput(props: React.ComponentProps<typeof TextInput>) {
    return <TextInput {...props} placeholderTextColor="#64748b" style={[formStyles.input, props.style]} />;
}
function FormChoices({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
    return <View style={formStyles.choices}>{options.map((option) => <TouchableOpacity key={option} onPress={() => onChange(option)} style={[formStyles.choice, value === option && formStyles.choiceActive]}><Text style={[formStyles.choiceText, value === option && formStyles.choiceTextActive]}>{option}</Text></TouchableOpacity>)}</View>;
}
function FormActions({ submitLabel, onSubmit, onCancel, submitting = false }: { submitLabel: string; onSubmit: () => void; onCancel: () => void; submitting?: boolean }) {
    return <View style={formStyles.actions}><TouchableOpacity disabled={submitting} onPress={onCancel} style={formStyles.cancel}><Text style={formStyles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={submitting} onPress={onSubmit} style={[formStyles.submit, submitting && formStyles.disabled]}><Text style={formStyles.submitText}>{submitting ? "Saving…" : submitLabel}</Text></TouchableOpacity></View>;
}
function WorkEntryForm({ initialData, onSubmit, onCancel }: any) {
    const getInitialData = (entry: any) => ({ date: entry?.date?.slice(0, 10) || formToday(), client: entry?.client || "", amount: String(entry?.amount || ""), amountPaid: String(entry?.amountPaid || "0"), status: entry?.status || "Unpaid", datePaid: entry?.datePaid?.slice(0, 10) || "", description: entry?.description || "" });
    const [data, setData] = useState(() => getInitialData(initialData));
    const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false); const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));

    useEffect(() => {
        setData(getInitialData(initialData));
        setError("");
    }, [initialData]);

    const submit = async () => { if (!data.date || !data.client.trim() || Number(data.amount) <= 0 || Number(data.amountPaid) < 0 || Number(data.amountPaid) > Number(data.amount)) return setError("Enter a client, date, and valid payment amounts."); setSubmitting(true); try { await onSubmit({ ...data, client: data.client.trim(), amount: Number(data.amount), amountPaid: Number(data.amountPaid), datePaid: data.status === "Paid" ? data.datePaid || data.date : data.datePaid || undefined, description: data.description.trim() }); } finally { setSubmitting(false); } };
    return <><FormField label="Work date *" error={error}><FormInput value={data.date} onChangeText={(v) => set("date", v)} placeholder="YYYY-MM-DD" /></FormField><FormField label="Client / project *"><FormInput value={data.client} onChangeText={(v) => set("client", v)} placeholder="Client name" /></FormField><FormField label="Expected amount *"><FormInput keyboardType="decimal-pad" value={data.amount} onChangeText={(v) => set("amount", v)} placeholder="Expected amount" /></FormField><FormField label="Amount received"><FormInput keyboardType="decimal-pad" value={data.amountPaid} onChangeText={(v) => set("amountPaid", v)} placeholder="0" /></FormField><FormField label="Status"><FormChoices value={data.status} options={["Unpaid", "Partially Paid", "Paid"]} onChange={(v) => set("status", v)} /></FormField>{data.status === "Paid" ? <FormField label="Date paid"><FormInput value={data.datePaid} onChangeText={(v) => set("datePaid", v)} placeholder="YYYY-MM-DD" /></FormField> : null}<FormField label="Description"><FormInput multiline value={data.description} onChangeText={(v) => set("description", v)} placeholder="Work notes" style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }} /></FormField><FormActions submitLabel={initialData ? "Update entry" : "Add entry"} onSubmit={submit} onCancel={onCancel} submitting={submitting} /></>;
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
    } else if (status === "Pending" || status === "Partially Paid") {
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

export default function WorkLog() {
    const { user } = useAuth();
    const currency = user?.currency || "INR";

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedLogs, setExpandedLogs] = useState<{ [key: string]: boolean }>({});

    // Month Selector State
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().substring(0, 7) // "YYYY-MM"
    );

    // Modal Form State
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<any>(null);

    // Form inputs
    const [dateInput, setDateInput] = useState("");
    const [clientInput, setClientInput] = useState("");
    const [amountInput, setAmountInput] = useState("");
    const [amountPaidInput, setAmountPaidInput] = useState("");
    const [statusInput, setStatusInput] = useState("Unpaid");
    const [datePaidInput, setDatePaidInput] = useState("");
    const [descriptionInput, setDescriptionInput] = useState("");

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

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLogs();
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Filtered logs for selected month
    const filteredLogs = logs.filter((log) => {
        if (!log || !log.date) return false;
        const logMonth = new Date(log.date).toISOString().substring(0, 7);
        return logMonth === selectedMonth;
    });

    // Stats calculations
    const totalDays = filteredLogs.length;
    const totalEarnings = filteredLogs.reduce((sum, log) => sum + Number(log.amount || 0), 0);
    const totalEarned = filteredLogs.reduce((sum, log) => {
        if (log.status === "Paid") return sum + Number(log.amount || 0);
        return sum + Number(log.amountPaid || 0);
    }, 0);

    const formatCurrency = (amount: number) => {
        const value = Number(amount || 0);
        const locale = currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-US";
        const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "$";
        return symbol + value.toLocaleString(locale, { maximumFractionDigits: 0 });
    };

    const getSelectedMonthName = () => {
        const [year, month] = selectedMonth.split("-");
        const date = new Date(Number(year), Number(month) - 1);
        return date.toLocaleString("default", { month: "long", year: "numeric" });
    };

    const handlePrevMonth = () => {
        const [year, month] = selectedMonth.split("-").map(Number);
        let newMonth = month - 1;
        let newYear = year;
        if (newMonth < 1) {
            newMonth = 12;
            newYear = year - 1;
        }
        const newMonthStr = String(newMonth).padStart(2, "0");
        setSelectedMonth(`${newYear}-${newMonthStr}`);
    };

    const handleNextMonth = () => {
        const [year, month] = selectedMonth.split("-").map(Number);
        let newMonth = month + 1;
        let newYear = year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear = year + 1;
        }
        const newMonthStr = String(newMonth).padStart(2, "0");
        setSelectedMonth(`${newYear}-${newMonthStr}`);
    };

    // Group logs by month and week
    const groupLogsByMonthAndWeek = (logList: any[]) => {
        const sortedLogs = [...logList].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return sortedLogs.reduce((groups: any, log) => {
            const date = new Date(log.date);
            const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });

            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const weekNum = Math.ceil((date.getDate() + startOfMonth.getDay()) / 7);
            const weekLabel = `Week ${weekNum}`;

            if (!groups[monthYear]) groups[monthYear] = {};
            if (!groups[monthYear][weekLabel]) groups[monthYear][weekLabel] = [];

            groups[monthYear][weekLabel].push(log);
            return groups;
        }, {});
    };

    // CRUD actions
    const handleOpenAddModal = () => {
        setEditingEntry(null);
        setDateInput(new Date().toISOString().substring(0, 10));
        setClientInput("");
        setAmountInput("");
        setAmountPaidInput("0");
        setStatusInput("Unpaid");
        setDatePaidInput("");
        setDescriptionInput("");
        setShowModal(true);
    };

    const handleOpenEditModal = (entry: any) => {
        setEditingEntry(entry);
        setDateInput(entry.date ? entry.date.split("T")[0] : "");
        setClientInput(entry.client || "");
        setAmountInput(String(entry.amount || ""));
        setAmountPaidInput(String(entry.amountPaid || "0"));
        setStatusInput(entry.status || "Unpaid");
        setDatePaidInput(entry.datePaid ? entry.datePaid.split("T")[0] : "");
        setDescriptionInput(entry.description || "");
        setShowModal(true);
    };

    const handleSaveEntry = async () => {
        if (!clientInput.trim()) {
            Alert.alert("Error", "Please enter a client name.");
            return;
        }
        if (!amountInput.trim() || isNaN(Number(amountInput))) {
            Alert.alert("Error", "Please enter a valid expected amount.");
            return;
        }

        const payload = {
            date: dateInput || new Date().toISOString(),
            client: clientInput.trim(),
            amount: Number(amountInput),
            amountPaid: Number(amountPaidInput || 0),
            status: statusInput,
            datePaid: statusInput === "Paid" ? datePaidInput || new Date().toISOString() : datePaidInput || undefined,
            description: descriptionInput.trim(),
        };

        try {
            setLoading(true);
            if (editingEntry) {
                await api.updateWorkLog(editingEntry._id, payload);
            } else {
                await api.createWorkLog(payload);
            }
            setShowModal(false);
            fetchLogs();
        } catch (error) {
            console.error("Failed to save work log", error);
            Alert.alert("Error", "Failed to save work log entry.");
            setLoading(false);
        }
    };

    const submitWorkEntryForm = async (payload: any) => {
        try {
            setLoading(true);
            if (editingEntry) await api.updateWorkLog(editingEntry._id, payload);
            else await api.createWorkLog(payload);
            setShowModal(false);
            fetchLogs();
        } catch (error) {
            console.error("Failed to save work log", error);
            Alert.alert("Error", "Failed to save work log entry.");
            setLoading(false);
        }
    };

    const handleDeleteEntry = (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this work entry?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        await api.deleteWorkLog(id);
                        fetchLogs();
                    } catch (error) {
                        console.error("Failed to delete entry", error);
                        Alert.alert("Error", "Failed to delete entry.");
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    const handleQuickMarkPaid = async (log: any) => {
        try {
            setLoading(true);
            const payload = {
                ...log,
                status: "Paid",
                amountPaid: log.amount,
                datePaid: new Date().toISOString().substring(0, 10),
            };
            await api.updateWorkLog(log._id, payload);
            fetchLogs();
        } catch (error) {
            console.error("Failed to quick mark paid", error);
            Alert.alert("Error", "Failed to update status.");
            setLoading(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Work Log</Text>
                    <Text style={styles.headerSubtitle}>Monthly Productivity Logs</Text>
                </View>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                    <Ionicons name="refresh-outline" size={18} color="#10b981" />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
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
                    {/* Month Navigator Row */}
                    <View style={styles.monthSelectorRow}>
                        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                            <Ionicons name="chevron-back-outline" size={20} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.monthNameLabel}>{getSelectedMonthName()}</Text>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                            <Ionicons name="chevron-forward-outline" size={20} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    {/* Monthly Stats Grid */}
                    <View style={styles.metricsGrid}>
                        <MetricTile
                            title="Days Worked"
                            value={String(totalDays)}
                            subtext={getSelectedMonthName().split(" ")[0]}
                            subtextColor="primary"
                            icon="calendar-outline"
                            gradientFrom="#1e3a5f"
                            gradientTo="#3b82f6"
                        />
                        <MetricTile
                            title="Expected Earnings"
                            value={formatCurrency(totalEarnings)}
                            subtext="Total billed"
                            subtextColor="pending"
                            icon="cash-outline"
                            gradientFrom="#78350f"
                            gradientTo="#f59e0b"
                        />
                        <MetricTile
                            title="Collected Earnings"
                            value={formatCurrency(totalEarned)}
                            subtext="Already received"
                            subtextColor="success"
                            icon="checkmark-circle-outline"
                            gradientFrom="#134e4a"
                            gradientTo="#10b981"
                            isFullWidth={true}
                        />
                    </View>

                    {/* Section Header */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={16} color="#94a3b8" />
                        <Text style={styles.sectionTitle}>Activity Log</Text>
                    </View>

                    {/* Activity List */}
                    <View style={styles.listContainer}>
                        {filteredLogs.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    No work logs found for this month.
                                </Text>
                            </View>
                        ) : (
                            Object.entries(groupLogsByMonthAndWeek(filteredLogs)).map(
                                ([monthYear, weeks]: [string, any]) => (
                                    <View key={monthYear} style={styles.historyGroup}>
                                        {Object.entries(weeks)
                                            .sort((a, b) => b[0].localeCompare(a[0]))
                                            .map(([weekLabel, weekLogs]: [string, any]) => {
                                                const weeklyTotal = weekLogs.reduce(
                                                    (sum: number, l: any) => sum + Number(l.amount || 0),
                                                    0
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
                                                            const logDateObj = new Date(log.date);
                                                            const logDay = logDateObj.getDate();
                                                            const logMonthShort = logDateObj.toLocaleString(
                                                                "default",
                                                                { month: "short" }
                                                            );

                                                            return (
                                                                <View key={log._id} style={styles.logCard}>
                                                                    <TouchableOpacity
                                                                        style={styles.logCardMain}
                                                                        activeOpacity={0.9}
                                                                        onPress={() => toggleExpand(log._id)}
                                                                    >
                                                                        {/* Custom calendar date badge */}
                                                                        <LinearGradient
                                                                            colors={["#0072ff", "#00c6ff"]}
                                                                            style={styles.dateBadge}
                                                                        >
                                                                            <Text style={styles.dateBadgeMonth}>
                                                                                {logMonthShort}
                                                                            </Text>
                                                                            <Text style={styles.dateBadgeDay}>
                                                                                {logDay}
                                                                            </Text>
                                                                        </LinearGradient>

                                                                        <View style={styles.logCardLeft}>
                                                                            <Text
                                                                                style={styles.logClient}
                                                                                numberOfLines={1}
                                                                            >
                                                                                {log.client}
                                                                            </Text>
                                                                            <Text style={styles.logSubText}>
                                                                                Expected: {formatCurrency(log.amount)}
                                                                            </Text>
                                                                        </View>

                                                                        <View style={styles.logCardRight}>
                                                                            <View style={styles.badgeWrapper}>
                                                                                <Badge status={log.status} />
                                                                            </View>
                                                                            <View style={styles.cardActionsRow}>
                                                                                <TouchableOpacity
                                                                                    onPress={() => handleOpenEditModal(log)}
                                                                                    style={styles.actionBtnSecondary}
                                                                                >
                                                                                    <Ionicons
                                                                                        name="pencil-outline"
                                                                                        size={14}
                                                                                        color="#60a5fa"
                                                                                    />
                                                                                </TouchableOpacity>
                                                                                <TouchableOpacity
                                                                                    onPress={() => handleDeleteEntry(log._id)}
                                                                                    style={styles.actionBtnDanger}
                                                                                >
                                                                                    <Ionicons
                                                                                        name="trash-outline"
                                                                                        size={14}
                                                                                        color="#ef4444"
                                                                                    />
                                                                                </TouchableOpacity>
                                                                            </View>
                                                                        </View>

                                                                        <Ionicons
                                                                            name={
                                                                                isExpanded
                                                                                    ? "chevron-up-outline"
                                                                                    : "chevron-down-outline"
                                                                            }
                                                                            size={16}
                                                                            color="#94a3b8"
                                                                            style={{ marginLeft: 8 }}
                                                                        />
                                                                    </TouchableOpacity>

                                                                    {isExpanded && (
                                                                        <View style={styles.expandedPanel}>
                                                                            <Text style={styles.expandedTitle}>
                                                                                Log Details
                                                                            </Text>
                                                                            <Text style={styles.expandedDetail}>
                                                                                Date:{" "}
                                                                                {new Date(log.date).toLocaleDateString(
                                                                                    undefined,
                                                                                    {
                                                                                        weekday: "long",
                                                                                        year: "numeric",
                                                                                        month: "long",
                                                                                        day: "numeric",
                                                                                    }
                                                                                )}
                                                                            </Text>
                                                                            <Text style={styles.expandedDetail}>
                                                                                Expected Amount:{" "}
                                                                                {formatCurrency(log.amount)}
                                                                            </Text>
                                                                            <Text style={styles.expandedDetail}>
                                                                                Amount Paid:{" "}
                                                                                {formatCurrency(log.amountPaid || 0)}
                                                                            </Text>
                                                                            <Text style={styles.expandedDetail}>
                                                                                Remaining Balance:{" "}
                                                                                {formatCurrency(
                                                                                    Math.max(
                                                                                        0,
                                                                                        Number(log.amount || 0) -
                                                                                            Number(log.amountPaid || 0)
                                                                                    )
                                                                                )}
                                                                            </Text>
                                                                            {log.datePaid && (
                                                                                <Text style={styles.expandedDetail}>
                                                                                    Date Paid:{" "}
                                                                                    {new Date(
                                                                                        log.datePaid
                                                                                    ).toLocaleDateString()}
                                                                                </Text>
                                                                            )}

                                                                            {log.status !== "Paid" && (
                                                                                <TouchableOpacity
                                                                                    style={styles.quickMarkPaidBtn}
                                                                                    onPress={() => handleQuickMarkPaid(log)}
                                                                                >
                                                                                    <Ionicons
                                                                                        name="checkmark-done"
                                                                                        size={14}
                                                                                        color="#10b981"
                                                                                    />
                                                                                    <Text style={styles.quickMarkPaidBtnText}>
                                                                                        Quick Mark Paid
                                                                                    </Text>
                                                                                </TouchableOpacity>
                                                                            )}

                                                                            <View style={styles.descriptionBox}>
                                                                                <Text style={styles.descriptionLabel}>
                                                                                    Notes / Description
                                                                                </Text>
                                                                                <Text style={styles.descriptionContent}>
                                                                                    {log.description || "No description provided."}
                                                                                </Text>
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
                                )
                            )
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Modal: Log / Edit Work Entry */}
            <Modal visible={showModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingEntry ? "Edit Work Entry" : "Log a Work Day"}
                                </Text>
                                <TouchableOpacity onPress={() => setShowModal(false)}>
                                    <Ionicons name="close-circle" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            {showModal ? <WorkEntryForm
                                initialData={editingEntry}
                                onSubmit={submitWorkEntryForm}
                                onCancel={() => setShowModal(false)}
                            /> : null}

                            {false && <>
                            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={dateInput}
                                onChangeText={setDateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Client Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={clientInput}
                                onChangeText={setClientInput}
                                placeholder="Client name"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Total Amount Expected ({currency})</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={amountInput}
                                onChangeText={setAmountInput}
                                placeholder="Total expected"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Amount Received So Far ({currency})</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={amountPaidInput}
                                onChangeText={setAmountPaidInput}
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
                                            statusInput === st && styles.statusSelectorBtnActive,
                                        ]}
                                        onPress={() => {
                                            setStatusInput(st);
                                            if (st === "Paid" && amountInput) {
                                                setAmountPaidInput(amountInput);
                                            }
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.statusSelectorBtnText,
                                                statusInput === st && styles.statusSelectorBtnTextActive,
                                            ]}
                                        >
                                            {st}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {statusInput === "Paid" && (
                                <>
                                    <Text style={styles.inputLabel}>Date Paid (YYYY-MM-DD)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={datePaidInput}
                                        onChangeText={setDatePaidInput}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#64748b"
                                    />
                                </>
                            )}

                            <Text style={styles.inputLabel}>Notes / Description</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                                multiline={true}
                                value={descriptionInput}
                                onChangeText={setDescriptionInput}
                                placeholder="Log notes"
                                placeholderTextColor="#64748b"
                            />

                            <View style={[styles.modalButtonsRow, { marginTop: 16 }]}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowModal(false)}
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveEntry}>
                                    <Text style={styles.modalSubmitBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                            </>}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
                <Ionicons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}

const formStyles = StyleSheet.create({
    field: { marginBottom: 16 }, label: { color: "#cbd5e1", fontSize: 13, fontWeight: "600", marginBottom: 7 }, input: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: "#2b3a4e", color: "#f8fafc", backgroundColor: "#0f1d2d", paddingHorizontal: 13, fontSize: 15 }, error: { color: "#fca5a5", fontSize: 12, marginTop: 6 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#172233", borderWidth: 1, borderColor: "#2b3a4e" }, choiceActive: { backgroundColor: "#0c4a6e", borderColor: "#38bdf8" }, choiceText: { color: "#94a3b8", fontSize: 12 }, choiceTextActive: { color: "#e0f2fe", fontWeight: "700" }, actions: { flexDirection: "row", gap: 12, marginTop: 8 }, cancel: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "#334155" }, cancelText: { color: "#cbd5e1", fontWeight: "700" }, submit: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 10, backgroundColor: "#0ea5e9" }, submitText: { color: "white", fontWeight: "800" }, disabled: { opacity: 0.6 },
});

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
    monthSelectorRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#172233",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#2b3a4e",
        marginBottom: 20,
    },
    monthNavBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#2b3a4e",
        alignItems: "center",
        justifyContent: "center",
    },
    monthNameLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "#ffffff",
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
        fontSize: 20,
        fontWeight: "800",
        color: "#ffffff",
        marginTop: 8,
    },
    metricTileSubtext: {
        fontSize: 10,
        color: "#94a3b8",
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#ffffff",
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
    historyGroup: {
        marginBottom: 12,
    },
    weekGroup: {
        marginBottom: 12,
    },
    weekHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderLeftWidth: 3,
        borderColor: "#3b82f6",
        paddingLeft: 8,
        marginBottom: 8,
    },
    weekLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#3b82f6",
    },
    weekTotal: {
        fontSize: 11,
        color: "#94a3b8",
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
        padding: 12,
    },
    dateBadge: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    dateBadgeMonth: {
        fontSize: 9,
        fontWeight: "700",
        color: "#ffffff",
        textTransform: "uppercase",
        opacity: 0.85,
    },
    dateBadgeDay: {
        fontSize: 16,
        fontWeight: "800",
        color: "#ffffff",
    },
    logCardLeft: {
        flex: 1,
        marginRight: 8,
    },
    logClient: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ffffff",
    },
    logSubText: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 4,
    },
    logCardRight: {
        alignItems: "flex-end",
        gap: 6,
    },
    badgeWrapper: {
        alignSelf: "flex-end",
    },
    cardActionsRow: {
        flexDirection: "row",
        gap: 6,
    },
    actionBtnSecondary: {
        backgroundColor: "rgba(96, 165, 250, 0.1)",
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
    expandedPanel: {
        padding: 16,
        backgroundColor: "#1b283a",
        borderTopWidth: 1,
        borderColor: "#2b3a4e",
    },
    expandedTitle: {
        fontSize: 11,
        color: "#94a3b8",
        fontWeight: "700",
        textTransform: "uppercase",
        marginBottom: 8,
    },
    expandedDetail: {
        fontSize: 12,
        color: "#f8fafc",
        marginBottom: 4,
    },
    quickMarkPaidBtn: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 1,
        borderColor: "#10b981",
        marginTop: 8,
        marginBottom: 4,
        gap: 6,
    },
    quickMarkPaidBtnText: {
        fontSize: 11,
        color: "#10b981",
        fontWeight: "700",
    },
    descriptionBox: {
        marginTop: 8,
        padding: 10,
        backgroundColor: "#172233",
        borderRadius: 8,
        borderLeftWidth: 3,
        borderColor: "#10b981",
    },
    descriptionLabel: {
        fontSize: 10,
        color: "#94a3b8",
        fontWeight: "700",
        marginBottom: 4,
    },
    descriptionContent: {
        fontSize: 12,
        color: "#f8fafc",
        lineHeight: 16,
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
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(8, 20, 33, 0.6)",
    },
    modalContent: {
        backgroundColor: "#172233",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#2b3a4e",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#ffffff",
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
    fab: {
        position: "absolute",
        right: 24,
        bottom: 90,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#10b981",
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});
