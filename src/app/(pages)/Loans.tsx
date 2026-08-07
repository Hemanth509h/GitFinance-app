import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { api } from "../../api";
import { MetricTile } from "../../components/ui/MetricTile";
import { useAuth } from "../../context/AuthContext";
import { ListSkeleton } from "../../components/ui/Skeleton";

const formToday = () => new Date().toISOString().slice(0, 10);
function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <View style={formStyles.field}><Text style={formStyles.label}>{label}</Text>{children}{error ? <Text style={formStyles.error}>{error}</Text> : null}</View>; }
function FormInput(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} placeholderTextColor="#64748b" style={[formStyles.input, props.style]} />; }
function FormChoices({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) { return <View style={formStyles.choices}>{options.map((option) => <TouchableOpacity key={option} onPress={() => onChange(option)} style={[formStyles.choice, value === option && formStyles.choiceActive]}><Text style={[formStyles.choiceText, value === option && formStyles.choiceTextActive]}>{option}</Text></TouchableOpacity>)}</View>; }
function FormActions({ submitLabel, onSubmit, onCancel, submitting = false }: { submitLabel: string; onSubmit: () => void; onCancel: () => void; submitting?: boolean }) { return <View style={formStyles.actions}><TouchableOpacity disabled={submitting} onPress={onCancel} style={formStyles.cancel}><Text style={formStyles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={submitting} onPress={onSubmit} style={[formStyles.submit, submitting && formStyles.disabled]}><Text style={formStyles.submitText}>{submitting ? "Saving…" : submitLabel}</Text></TouchableOpacity></View>; }
function LoanForm({ initialData, onSubmit, onCancel }: any) {
    const [data, setData] = useState(() => ({ lenderName: initialData?.lenderName || "", totalAmount: String(initialData?.principalAmount || initialData?.totalAmount || ""), monthlyInterest: String(initialData?.monthlyInterest || "0"), startDate: initialData?.startDate?.slice(0, 10) || formToday(), description: initialData?.description || "", status: initialData?.status || "Active" }));
    const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false); const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));
    const submit = async () => { if (!data.lenderName.trim() || Number(data.totalAmount) <= 0) return setError("Enter a lender and a valid loan amount."); setSubmitting(true); try { await onSubmit({ ...data, lenderName: data.lenderName.trim(), totalAmount: Number(data.totalAmount), monthlyInterest: Number(data.monthlyInterest || 0), description: data.description.trim() }); } finally { setSubmitting(false); } };
    return <><FormField label="Lender name *" error={error}><FormInput value={data.lenderName} onChangeText={(v) => set("lenderName", v)} placeholder="Bank, friend, or lender" /></FormField><FormField label="Loan principal amount *"><FormInput keyboardType="decimal-pad" value={data.totalAmount} onChangeText={(v) => set("totalAmount", v)} placeholder="Amount borrowed" /></FormField><FormField label="Monthly interest rate (%)"><FormInput keyboardType="decimal-pad" value={data.monthlyInterest} onChangeText={(v) => set("monthlyInterest", v)} placeholder="0" /></FormField><FormField label="Start date"><FormInput value={data.startDate} onChangeText={(v) => set("startDate", v)} placeholder="YYYY-MM-DD" /></FormField><FormField label="Status"><FormChoices value={data.status} options={["Active", "Repaid"]} onChange={(v) => set("status", v)} /></FormField><FormField label="Description"><FormInput multiline value={data.description} onChangeText={(v) => set("description", v)} placeholder="Loan notes" style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }} /></FormField><FormActions submitLabel={initialData ? "Update loan" : "Add loan"} onSubmit={submit} onCancel={onCancel} submitting={submitting} /></>;
}
function RepaymentForm({ loan, initialData, onSubmit, onCancel, formatCurrency }: any) {
    const [data, setData] = useState(() => ({ date: initialData?.date?.slice(0, 10) || formToday(), amount: String(initialData?.amount || ""), method: initialData?.method || "Cash", note: initialData?.note || initialData?.description || "" }));
    const [workEntries, setWorkEntries] = useState<any[]>([]);
    const [workEntryId, setWorkEntryId] = useState(() => typeof initialData?.workEntryId === "object" ? initialData.workEntryId?._id || "" : initialData?.workEntryId || "");
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [showWorkLogMenu, setShowWorkLogMenu] = useState(false);
    const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false); const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value })); const remaining = Math.max(0, Number(loan?.totalAmount || 0) - Number(loan?.amountPaid || 0) + Number(initialData?.amount || 0));
    useEffect(() => {
        let isMounted = true;
        api.getWorkLogs().then(({ data: entries }) => { if (isMounted) setWorkEntries(entries || []); }).catch((error) => console.error("Failed to load work logs", error)).finally(() => { if (isMounted) setLoadingEntries(false); });
        return () => { isMounted = false; };
    }, []);
    const submit = async () => { const amount = Number(data.amount); if (!data.date || amount <= 0 || amount > remaining) return setError(amount > remaining ? "The repayment cannot exceed the remaining balance." : "Enter a valid repayment date and amount."); setSubmitting(true); try { await onSubmit({ ...data, amount, note: data.note.trim(), workEntryId: workEntryId || undefined, type: "Repayment", status: "Success" }); } finally { setSubmitting(false); } };
    const selectedWorkEntry = workEntries.find((entry) => String(entry._id || entry.id) === String(workEntryId));
    const formatWorkLogDate = (date: string) => { const parsed = new Date(date); return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
    const workLogLabel = selectedWorkEntry ? `${formatWorkLogDate(selectedWorkEntry.date)} · ${selectedWorkEntry.client || "Work log"} · ${formatCurrency(Number(selectedWorkEntry.amount || 0))}` : "None";
    return <><View style={formStyles.summary}><Text style={formStyles.summaryText}>Remaining balance: {formatCurrency(remaining)}</Text></View><FormField label="Repayment date *" error={error}><FormInput value={data.date} onChangeText={(v) => set("date", v)} placeholder="YYYY-MM-DD" /></FormField><FormField label="Amount paid *"><FormInput keyboardType="decimal-pad" value={data.amount} onChangeText={(v) => set("amount", v)} placeholder="Amount repaid" /></FormField><FormField label="Payment method"><FormChoices value={data.method} options={["Cash", "Card", "Bank Transfer", "UPI"]} onChange={(v) => set("method", v)} /></FormField><FormField label="Link to work log (optional)">{loadingEntries ? <ActivityIndicator size="small" color="#10b981" /> : <View><TouchableOpacity onPress={() => setShowWorkLogMenu((visible) => !visible)} style={formStyles.dropdownTrigger}><Text numberOfLines={1} style={formStyles.dropdownTriggerText}>{workLogLabel}</Text><Ionicons name={showWorkLogMenu ? "chevron-up" : "chevron-down"} size={18} color="#94a3b8" /></TouchableOpacity>{showWorkLogMenu ? <View style={formStyles.dropdownMenu}><ScrollView nestedScrollEnabled style={formStyles.dropdownList}><TouchableOpacity onPress={() => { setWorkEntryId(""); setShowWorkLogMenu(false); }} style={formStyles.dropdownOption}><Text style={formStyles.dropdownOptionText}>None</Text></TouchableOpacity>{workEntries.map((entry) => { const id = entry._id || entry.id; return <TouchableOpacity key={id} onPress={() => { setWorkEntryId(id); setShowWorkLogMenu(false); }} style={[formStyles.dropdownOption, workEntryId === id && formStyles.dropdownOptionSelected]}><Text style={[formStyles.dropdownOptionText, workEntryId === id && formStyles.dropdownOptionTextSelected]}>{formatWorkLogDate(entry.date)} · {entry.client || "Work log"} · {formatCurrency(Number(entry.amount || 0))}</Text></TouchableOpacity>; })}</ScrollView></View> : null}</View>}</FormField><FormField label="Notes"><FormInput multiline value={data.note} onChangeText={(v) => set("note", v)} placeholder="Repayment notes" style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }} /></FormField><FormActions submitLabel={initialData ? "Update repayment" : "Record repayment"} onSubmit={submit} onCancel={onCancel} submitting={submitting} /></>;
}
function InterestForm({ onSubmit, onCancel }: any) {
    const [data, setData] = useState({ date: formToday(), amount: "", note: "" }); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
    const submit = async () => { if (!data.date || Number(data.amount) <= 0) return setError("Enter a valid date and interest amount."); setSubmitting(true); try { await onSubmit({ ...data, amount: Number(data.amount), note: data.note.trim() }); } finally { setSubmitting(false); } };
    return <><FormField label="Date *" error={error}><FormInput value={data.date} onChangeText={(date) => setData((d) => ({ ...d, date }))} placeholder="YYYY-MM-DD" /></FormField><FormField label="Interest amount *"><FormInput keyboardType="decimal-pad" value={data.amount} onChangeText={(amount) => setData((d) => ({ ...d, amount }))} placeholder="Interest amount to add" /></FormField><FormField label="Notes"><FormInput multiline value={data.note} onChangeText={(note) => setData((d) => ({ ...d, note }))} placeholder="Interest reason" style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }} /></FormField><FormActions submitLabel="Add interest" onSubmit={submit} onCancel={onCancel} submitting={submitting} /></>;
}

// ── Badge Component ──
function Badge({ status }: { status: string }) {
    let bg = "rgba(148, 163, 184, 0.1)";
    let fg = "#94a3b8";
    if (status === "Repaid" || status === "Success" || status === "Paid") {
        bg = "rgba(16, 185, 129, 0.15)";
        fg = "#10b981";
    } else if (status === "Active" || status === "Pending") {
        bg = "rgba(245, 158, 11, 0.15)";
        fg = "#f59e0b";
    } else if (status === "Interest" || status === "Unpaid") {
        bg = "rgba(239, 68, 68, 0.15)";
        fg = "#ef4444";
    }
    return (
        <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color: fg }]}>{status}</Text>
        </View>
    );
}

export default function Loan() {
    const { user } = useAuth();
    const currency = user?.currency || "INR";

    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Expanded states
    const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
    const [repaymentsMap, setRepaymentsMap] = useState<{ [loanId: string]: any[] }>({});
    const [repaymentsLoading, setRepaymentsLoading] = useState<string | null>(null);

    // Modal Control Flags
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [showRepaymentModal, setShowRepaymentModal] = useState(false);
    const [showInterestModal, setShowInterestModal] = useState(false);

    // Selected items for context
    const [selectedLoan, setSelectedLoan] = useState<any>(null);
    const [editingRepayment, setEditingRepayment] = useState<any>(null);

    // Form inputs: Loan Form
    const [lenderInput, setLenderInput] = useState("");
    const [loanAmountInput, setLoanAmountInput] = useState("");
    const [loanDateInput, setLoanDateInput] = useState("");
    const [monthlyInterestInput, setMonthlyInterestInput] = useState("0");
    const [loanDescriptionInput, setLoanDescriptionInput] = useState("");

    // Form inputs: Repayment Form
    const [repaymentDateInput, setRepaymentDateInput] = useState("");
    const [repaymentAmountInput, setRepaymentAmountInput] = useState("");
    const [repaymentMethodInput, setRepaymentMethodInput] = useState("Cash");
    const [repaymentDescriptionInput, setRepaymentDescriptionInput] = useState("");

    // Form inputs: Interest Form
    const [interestDateInput, setInterestDateInput] = useState("");
    const [interestAmountInput, setInterestAmountInput] = useState("");
    const [interestDescriptionInput, setInterestDescriptionInput] = useState("");

    const formatCurrency = (amount: number) => {
        const value = Number(amount || 0);
        const locale = currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-US";
        const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "$";
        return symbol + value.toLocaleString(locale, { maximumFractionDigits: 0 });
    };

    const fetchLoans = async () => {
        try {
            const { data } = await api.getLoans();
            setLoans(data || []);
        } catch (error) {
            console.error("Failed to fetch loans", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLoans();
        if (expandedLoanId) {
            fetchRepayments(expandedLoanId);
        }
    };

    const fetchRepayments = async (loanId: string) => {
        try {
            setRepaymentsLoading(loanId);
            const { data } = await api.getLoanRepayments(loanId);
            setRepaymentsMap((prev) => ({
                ...prev,
                [loanId]: data || [],
            }));
        } catch (error) {
            console.error("Failed to fetch repayments", error);
        } finally {
            setRepaymentsLoading(null);
        }
    };

    const toggleExpandLoan = (loanId: string) => {
        if (expandedLoanId === loanId) {
            setExpandedLoanId(null);
        } else {
            setExpandedLoanId(loanId);
            fetchRepayments(loanId);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    // Summary calculations
    const totalBorrowed = loans.reduce((sum, loan) => sum + Number(loan.principalAmount || loan.totalAmount || 0), 0);
    const totalPaid = loans.reduce((sum, loan) => sum + Number(loan.amountPaid || 0), 0);
    
    const totalRemaining = loans.reduce((sum, loan) => {
        const remaining = Math.max(0, Number(loan.totalAmount || 0) - Number(loan.amountPaid || 0));
        return sum + remaining;
    }, 0);

    const totalCalculatedOwed = loans.reduce((sum, loan) => sum + Number(loan.totalAmount || 0), 0);
    const progressPercent = totalCalculatedOwed > 0 ? (totalPaid / totalCalculatedOwed) * 100 : 0;

    // Grouping helper for repayments list
    const groupRepayments = (repaymentList: any[]) => {
        const sorted = [...repaymentList].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return sorted.reduce((groups: any, item) => {
            const date = new Date(item.date);
            const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const weekNum = Math.ceil((date.getDate() + startOfMonth.getDay()) / 7);
            const weekLabel = `Week ${weekNum}`;

            if (!groups[monthYear]) groups[monthYear] = {};
            if (!groups[monthYear][weekLabel]) groups[monthYear][weekLabel] = [];

            groups[monthYear][weekLabel].push(item);
            return groups;
        }, {});
    };

    // --- CRUD Loans ---
    const handleOpenAddLoanModal = () => {
        setSelectedLoan(null);
        setLenderInput("");
        setLoanAmountInput("");
        setLoanDateInput(new Date().toISOString().substring(0, 10));
        setMonthlyInterestInput("0");
        setLoanDescriptionInput("");
        setShowLoanModal(true);
    };

    const handleOpenEditLoanModal = (loan: any) => {
        setSelectedLoan(loan);
        setLenderInput(loan.lenderName || "");
        setLoanAmountInput(String(loan.principalAmount || loan.totalAmount || ""));
        setLoanDateInput(loan.startDate ? loan.startDate.split("T")[0] : "");
        setMonthlyInterestInput(String(loan.monthlyInterest || "0"));
        setLoanDescriptionInput(loan.description || "");
        setShowLoanModal(true);
    };

    const handleSaveLoan = async () => {
        if (!lenderInput.trim()) {
            Alert.alert("Error", "Please enter a lender name.");
            return;
        }
        if (!loanAmountInput.trim() || isNaN(Number(loanAmountInput))) {
            Alert.alert("Error", "Please enter a valid loan amount.");
            return;
        }

        const payload = {
            lenderName: lenderInput.trim(),
            totalAmount: Number(loanAmountInput),
            startDate: loanDateInput || new Date().toISOString(),
            monthlyInterest: Number(monthlyInterestInput || 0),
            status: selectedLoan ? selectedLoan.status : "Active",
        };

        try {
            setLoading(true);
            if (selectedLoan) {
                await api.updateLoan(selectedLoan._id, payload);
            } else {
                await api.createLoan(payload);
            }
            setShowLoanModal(false);
            fetchLoans();
        } catch (error) {
            console.error("Failed to save loan", error);
            Alert.alert("Error", "Failed to save loan.");
            setLoading(false);
        }
    };

    const handleDeleteLoan = (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this loan? All repayments will be lost.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        await api.deleteLoan(id);
                        setExpandedLoanId(null);
                        fetchLoans();
                    } catch (error) {
                        console.error("Failed to delete loan", error);
                        Alert.alert("Error", "Failed to delete loan.");
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    // --- Repayment Actions ---
    const handleOpenRepaymentModal = (loan: any, repayment: any = null) => {
        setSelectedLoan(loan);
        setEditingRepayment(repayment);
        if (repayment) {
            setRepaymentDateInput(repayment.date ? repayment.date.split("T")[0] : "");
            setRepaymentAmountInput(String(repayment.amount || ""));
            setRepaymentMethodInput(repayment.method || "Cash");
            setRepaymentDescriptionInput(repayment.note || "");
        } else {
            setRepaymentDateInput(new Date().toISOString().substring(0, 10));
            setRepaymentAmountInput("");
            setRepaymentMethodInput("Cash");
            setRepaymentDescriptionInput("");
        }
        setShowRepaymentModal(true);
    };

    const handleSaveRepayment = async () => {
        if (!repaymentAmountInput.trim() || isNaN(Number(repaymentAmountInput))) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }

        const payload = {
            date: repaymentDateInput || new Date().toISOString(),
            amount: Number(repaymentAmountInput),
            method: repaymentMethodInput,
            note: repaymentDescriptionInput.trim(),
            type: "Repayment",
            status: "Success",
        };

        try {
            setLoading(true);
            if (editingRepayment) {
                await api.updateLoanRepayment(selectedLoan._id, editingRepayment._id, payload);
            } else {
                await api.addLoanRepayment(selectedLoan._id, payload);
            }
            setShowRepaymentModal(false);
            fetchLoans();
            fetchRepayments(selectedLoan._id);
        } catch (error) {
            console.error("Failed to save repayment", error);
            Alert.alert("Error", "Failed to save repayment.");
            setLoading(false);
        }
    };

    const handleDeleteRepayment = (loanId: string, repaymentId: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this repayment?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        await api.deleteLoanRepayment(loanId, repaymentId);
                        fetchLoans();
                        fetchRepayments(loanId);
                    } catch (error) {
                        console.error("Failed to delete repayment", error);
                        Alert.alert("Error", "Failed to delete repayment.");
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    // --- Interest Actions ---
    const handleOpenInterestModal = (loan: any) => {
        setSelectedLoan(loan);
        setInterestDateInput(new Date().toISOString().substring(0, 10));
        
        const suggested = Number(loan.monthlyInterest || 0);

        setInterestAmountInput(suggested > 0 ? String(suggested) : "");
        setInterestDescriptionInput(suggested > 0 ? "Monthly Interest Charge" : "");
        setShowInterestModal(true);
    };

    const handleSaveInterest = async () => {
        if (!interestAmountInput.trim() || isNaN(Number(interestAmountInput))) {
            Alert.alert("Error", "Please enter a valid interest amount.");
            return;
        }

        const payload = {
            date: interestDateInput || new Date().toISOString(),
            amount: Number(interestAmountInput),
            note: interestDescriptionInput.trim(),
        };

        try {
            setLoading(true);
            await api.addLoanInterest(selectedLoan._id, payload);
            setShowInterestModal(false);
            fetchLoans();
            fetchRepayments(selectedLoan._id);
        } catch (error) {
            console.error("Failed to save interest", error);
            Alert.alert("Error", "Failed to save interest charge.");
            setLoading(false);
        }
    };

    const submitLoanForm = async (payload: any) => {
        try { setLoading(true); if (selectedLoan) await api.updateLoan(selectedLoan._id, payload); else await api.createLoan(payload); setShowLoanModal(false); fetchLoans(); }
        catch (error) { console.error("Failed to save loan", error); Alert.alert("Error", "Failed to save loan."); setLoading(false); }
    };
    const submitRepaymentForm = async (payload: any) => {
        if (!selectedLoan) return;
        try { setLoading(true); if (editingRepayment) await api.updateLoanRepayment(selectedLoan._id, editingRepayment._id, payload); else await api.addLoanRepayment(selectedLoan._id, payload); setShowRepaymentModal(false); fetchLoans(); fetchRepayments(selectedLoan._id); }
        catch (error) { console.error("Failed to save repayment", error); Alert.alert("Error", "Failed to save repayment."); setLoading(false); }
    };
    const submitInterestForm = async (payload: any) => {
        if (!selectedLoan) return;
        try { setLoading(true); await api.addLoanInterest(selectedLoan._id, payload); setShowInterestModal(false); fetchLoans(); fetchRepayments(selectedLoan._id); }
        catch (error) { console.error("Failed to save interest", error); Alert.alert("Error", "Failed to save interest charge."); setLoading(false); }
    };

    const handleQuickAddInterest = async (loan: any) => {
        const interestAmount = Number(loan.monthlyInterest || 0);

        if (interestAmount <= 0) {
            Alert.alert("Info", "No monthly interest amount configured for this loan.");
            return;
        }

        Alert.alert(
            "Confirm Interest",
            `Add monthly interest charge of ${formatCurrency(interestAmount)}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Add Interest",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.addLoanInterest(loan._id, {
                                amount: interestAmount,
                                date: new Date().toISOString().substring(0, 10),
                                note: `Quick Monthly Interest`,
                            });
                            fetchLoans();
                            if (expandedLoanId === loan._id) {
                                fetchRepayments(loan._id);
                            }
                        } catch (error) {
                            console.error("Failed to quick add interest", error);
                            Alert.alert("Error", "Failed to add interest charge.");
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Loans</Text>
                    <Text style={styles.headerSubtitle}>Lenders & Repayment Ledger</Text>
                </View>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                    <Ionicons name="refresh-outline" size={18} color="#e11d48" />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ListSkeleton count={4} />
            ) : (
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#e11d48"
                        />
                    }
                >
                    {/* Stats Tiles */}
                    <View style={styles.metricsGrid}>
                        <MetricTile
                            title="Total Borrowed"
                            value={formatCurrency(totalBorrowed)}
                            subtext="Principal sum"
                            subtextColor="primary"
                            icon="cash-outline"
                            gradientFrom="#1e1b4b"
                            gradientTo="#4f46e5"
                        />
                        <MetricTile
                            title="Outstanding Balance"
                            value={formatCurrency(totalRemaining)}
                            subtext={`Incl. interest additions`}
                            subtextColor={totalRemaining === 0 ? "success" : "error"}
                            icon="wallet-outline"
                            gradientFrom="#4c0519"
                            gradientTo="#e11d48"
                        />
                        <MetricTile
                            title="Total Progress"
                            value={`${Math.round(progressPercent)}%`}
                            subtext={`Repaid ${formatCurrency(totalPaid)} in total`}
                            subtextColor="success"
                            icon="checkmark-done-circle-outline"
                            gradientFrom="#064e3b"
                            gradientTo="#059669"
                            isFullWidth={true}
                        />
                    </View>

                    {/* Section Header */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="business-outline" size={16} color="#94a3b8" />
                        <Text style={styles.sectionTitle}>Active Loan Accounts</Text>
                    </View>

                    {/* Loans Cards List */}
                    <View style={styles.listContainer}>
                        {loans.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    No loan entries configured. Add one below.
                                </Text>
                            </View>
                        ) : (
                            loans.map((loan) => {
                                const isExpanded = expandedLoanId === loan._id;
                                const remaining = Math.max(
                                    0,
                                    Number(loan.totalAmount || 0) -
                                        Number(loan.amountPaid || 0)
                                );
                                const loanProgress =
                                    Number(loan.totalAmount || 0) > 0
                                        ? (loan.amountPaid || 0) / Number(loan.totalAmount || 0)
                                        : 0;
                                const interestAdded = Number(loan.totalAmount || 0) - Number(loan.principalAmount || loan.totalAmount || 0);
                                const firstLetter = (loan.lenderName || "L").charAt(0).toUpperCase();
                                const currentMonthName = new Date().toLocaleString("default", { month: "long" });

                                const formatDateShort = (dateStr: string) => {
                                    if (!dateStr) return "N/A";
                                    const d = new Date(dateStr);
                                    const day = d.getDate();
                                    const month = d.toLocaleString("default", { month: "short" });
                                    const year = d.getFullYear();
                                    return `${day} ${month} ${year}`;
                                };

                                return (
                                    <View key={loan._id} style={styles.newLoanCard}>
                                        {/* Gradient Header Banner */}
                                        <LinearGradient
                                            colors={remaining === 0 ? ["#334155", "#1e293b"] : ["#0d9488", "#115e59"]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.newCardHeaderBanner}
                                        >
                                            {/* Decorative circles */}
                                            <View style={[styles.cardCircle, { right: -20, top: -20, width: 90, height: 90, borderRadius: 45 }]} />
                                            <View style={[styles.cardCircle, { right: 30, top: 40, width: 50, height: 50, borderRadius: 25 }]} />

                                            <View style={styles.headerRow}>
                                                {/* Left part: Avatar and Lender details */}
                                                <View style={styles.headerLeft}>
                                                    <View style={styles.lenderAvatar}>
                                                        <Text style={styles.lenderAvatarText}>{firstLetter}</Text>
                                                    </View>
                                                    <View style={styles.lenderInfo}>
                                                        <Text style={styles.lenderLabel}>LENDER</Text>
                                                        <Text style={styles.lenderTitle} numberOfLines={1}>{loan.lenderName}</Text>
                                                    </View>
                                                </View>

                                                {/* Right part: status and actions */}
                                                <View style={styles.headerRight}>
                                                    <View style={[styles.statusBadgePill, remaining === 0 ? styles.statusBadgeRepaid : styles.statusBadgeActive]}>
                                                        <Text style={styles.statusBadgeText}>{remaining === 0 ? "Repaid" : "Active"}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.headerActionCircleBtn}
                                                        onPress={() => handleOpenEditLoanModal(loan)}
                                                    >
                                                        <Ionicons name="pencil" size={12} color="#e2e8f0" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.headerActionCircleBtn}
                                                        onPress={() => handleDeleteLoan(loan._id)}
                                                    >
                                                        <Ionicons name="trash-outline" size={12} color="#e2e8f0" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </LinearGradient>

                                        {/* Floating Stats Panel */}
                                        <View style={styles.floatingStatsPanel}>
                                            <View style={styles.floatingStatCol}>
                                                <Text style={styles.floatingStatLabel}>REMAINING</Text>
                                                <Text style={styles.floatingStatValCyan}>{formatCurrency(remaining)}</Text>
                                                <Text style={styles.floatingStatSubtext}>
                                                    excl. interest: <Text style={{ color: '#ffffff', fontWeight: '600' }}>{formatCurrency(loan.principalAmount || loan.totalAmount)}</Text>
                                                </Text>
                                            </View>
                                            
                                            {/* Divider */}
                                            <View style={styles.floatingDivider} />

                                            <View style={styles.floatingStatCol}>
                                                <Text style={styles.floatingStatLabel}>PAID</Text>
                                                <Text style={styles.floatingStatValGreen}>{formatCurrency(loan.amountPaid)}</Text>
                                                <Text style={styles.floatingStatSubtext}>
                                                    {Math.round(loanProgress * 100)}% complete
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Card Body */}
                                        <View style={styles.newCardBody}>
                                            {/* Three-column stats grid */}
                                            <View style={styles.threeColGrid}>
                                                <View style={styles.threeColItem}>
                                                    <Text style={styles.threeColLabel}>PRINCIPAL</Text>
                                                    <Text style={styles.threeColVal}>{formatCurrency(loan.principalAmount || loan.totalAmount)}</Text>
                                                </View>
                                                <View style={[styles.threeColItem, styles.interestAddedBox]}>
                                                    <Text style={styles.interestBoxLabel}>INTEREST ADDED</Text>
                                                    <Text style={styles.interestBoxVal}>+{formatCurrency(interestAdded)}</Text>
                                                </View>
                                                <View style={styles.threeColItem}>
                                                    <Text style={styles.threeColLabel}>SINCE</Text>
                                                    <Text style={styles.threeColVal}>{formatDateShort(loan.startDate)}</Text>
                                                </View>
                                            </View>

                                            {/* Dynamic Interest Quick Button */}
                                            {loan.monthlyInterest > 0 && remaining > 0 && (
                                                <TouchableOpacity
                                                    style={styles.quickInterestBtn}
                                                    onPress={() => handleQuickAddInterest(loan)}
                                                >
                                                    <Ionicons name="trending-up" size={14} color="#f87171" />
                                                    <Text style={styles.quickInterestBtnText}>
                                                        Add {currentMonthName} Interest — {formatCurrency(loan.monthlyInterest)}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                            {/* Action Buttons row */}
                                            <View style={styles.bodyActionsRow}>
                                                {remaining > 0 && (
                                                    <>
                                                        <TouchableOpacity
                                                            style={styles.btnRecordRepayment}
                                                            onPress={() => handleOpenRepaymentModal(loan)}
                                                        >
                                                            <Ionicons name="add" size={16} color="#ffffff" />
                                                            <Text style={styles.btnRecordRepaymentText}>Record Repayment</Text>
                                                        </TouchableOpacity>
                                                        
                                                        <TouchableOpacity
                                                            style={styles.btnRecordInterest}
                                                            onPress={() => handleOpenInterestModal(loan)}
                                                        >
                                                            <Ionicons name="trending-up" size={14} color="#f87171" />
                                                            <Text style={styles.btnRecordInterestText}>Interest</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </View>

                                            {/* Expand/Hide History Button */}
                                            <TouchableOpacity
                                                style={styles.btnToggleHistory}
                                                onPress={() => toggleExpandLoan(loan._id)}
                                            >
                                                <Ionicons
                                                    name={isExpanded ? "caret-up" : "caret-down"}
                                                    size={12}
                                                    color="#94a3b8"
                                                />
                                                <Text style={styles.btnToggleHistoryText}>
                                                    {isExpanded ? "Hide History" : "Show History"}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Expanded Ledger Section */}
                                            {isExpanded && (
                                                <View style={styles.newLedgerContainer}>
                                                    <Text style={styles.ledgerHeaderTitle}>History</Text>
                                                    
                                                    {repaymentsLoading === loan._id ? (
                                                        <ActivityIndicator size="small" color="#0d9488" style={{ marginVertical: 12 }} />
                                                    ) : !repaymentsMap[loan._id] || repaymentsMap[loan._id].length === 0 ? (
                                                        <Text style={styles.noHistoryText}>No transactions recorded.</Text>
                                                    ) : (
                                                        Object.entries(groupRepayments(repaymentsMap[loan._id])).map(
                                                            ([monthYear, weeks]: [string, any]) => (
                                                                <View key={monthYear} style={styles.ledgerMonthGroup}>
                                                                    <Text style={styles.ledgerMonthTitle}>{monthYear.toUpperCase()}</Text>
                                                                    {Object.entries(weeks).map(([weekLabel, txs]: [string, any]) => (
                                                                        <View key={weekLabel} style={styles.ledgerWeekGroup}>
                                                                            {/* Green vertical bar indicator alongside week name */}
                                                                            <View style={styles.weekHeaderContainer}>
                                                                                <View style={styles.weekIndicatorBar} />
                                                                                <Text style={styles.ledgerWeekTitle}>{weekLabel.toUpperCase()}</Text>
                                                                            </View>
                                                                            
                                                                            {/* Transaction Box containing rows */}
                                                                            <View style={styles.ledgerTxsBox}>
                                                                                {txs.map((tx: any, idx: number) => {
                                                                                    const isInterest = tx.type === "Interest";
                                                                                    return (
                                                                                        <React.Fragment key={tx._id}>
                                                                                        <View style={[styles.ledgerTxRow, idx > 0 && styles.ledgerTxRowBorder]}>
                                                                                            <View style={styles.ledgerTxLeft}>
                                                                                                <Ionicons
                                                                                                    name={isInterest ? "trending-up" : "card-outline"}
                                                                                                    size={14}
                                                                                                    color={isInterest ? "#f87171" : "#34d399"}
                                                                                                />
                                                                                                <Text style={isInterest ? styles.ledgerTxAmountInterest : styles.ledgerTxAmountRepay}>
                                                                                                    {isInterest ? "+" : "-"}{formatCurrency(tx.amount)}
                                                                                                </Text>
                                                                                            </View>
                                                                                            <Text style={styles.ledgerTxDate}>
                                                                                                {formatDateShort(tx.date)}
                                                                                            </Text>
                                                                                            <View style={styles.ledgerTxRightActions}>
                                                                                                {!isInterest && (
                                                                                                    <TouchableOpacity
                                                                                                        onPress={() => handleOpenRepaymentModal(loan, tx)}
                                                                                                        style={styles.ledgerActionIconBtn}
                                                                                                    >
                                                                                                        <Ionicons name="pencil" size={12} color="#94a3b8" />
                                                                                                    </TouchableOpacity>
                                                                                                )}
                                                                                                <TouchableOpacity
                                                                                                    onPress={() => handleDeleteRepayment(loan._id, tx._id)}
                                                                                                    style={styles.ledgerActionIconBtn}
                                                                                                >
                                                                                                    <Ionicons name="trash-outline" size={12} color="#ef4444" />
                                                                                                </TouchableOpacity>
                                                                                            </View>
                                                                                        </View>
                                                                                        {!isInterest && tx.workEntryId && (
                                                                                            <View style={styles.ledgerWorkLogLink}>
                                                                                                <Ionicons name="document-text-outline" size={14} color="#10b981" />
                                                                                                <Text style={styles.ledgerWorkLogLinkText}>
                                                                                                    Work log: {tx.workEntryId.client || "Linked work log"}{tx.workEntryId.date ? ` · ${formatDateShort(tx.workEntryId.date)}` : ""}
                                                                                                </Text>
                                                                                            </View>
                                                                                        )}
                                                                                        </React.Fragment>
                                                                                    );
                                                                                })}
                                                                            </View>
                                                                        </View>
                                                                    ))}
                                                                </View>
                                                            )
                                                        )
                                                    )}

                      
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Modal: Add / Edit Loan */}
            <Modal visible={showLoanModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {selectedLoan ? "Edit Loan Account" : "Add Loan Account"}
                                </Text>
                                <TouchableOpacity onPress={() => setShowLoanModal(false)}>
                                    <Ionicons name="close-circle" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <LoanForm initialData={selectedLoan} onSubmit={submitLoanForm} onCancel={() => setShowLoanModal(false)} />

                            {false && <>
                            <Text style={styles.inputLabel}>Lender Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={lenderInput}
                                onChangeText={setLenderInput}
                                placeholder="Lender name (e.g. Bank, Friend)"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Loan Principal Amount ({currency})</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={loanAmountInput}
                                onChangeText={setLoanAmountInput}
                                placeholder="Amount borrowed"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Monthly Interest Rate (%)</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={monthlyInterestInput}
                                onChangeText={setMonthlyInterestInput}
                                placeholder="Rate per month (e.g. 1.5)"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={loanDateInput}
                                onChangeText={setLoanDateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Description / Notes</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                                multiline={true}
                                value={loanDescriptionInput}
                                onChangeText={setLoanDescriptionInput}
                                placeholder="Loan notes"
                                placeholderTextColor="#64748b"
                            />

                            <View style={styles.modalButtonsRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowLoanModal(false)}
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: "#e11d48" }]} onPress={handleSaveLoan}>
                                    <Text style={styles.modalSubmitBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                            </>}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Modal: Record Repayment */}
            <Modal visible={showRepaymentModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingRepayment ? "Edit Repayment" : "Record Repayment"}
                                </Text>
                                <Text style={styles.modalHeaderSubtitle}>to {selectedLoan?.lenderName}</Text>
                                <TouchableOpacity onPress={() => setShowRepaymentModal(false)}>
                                    <Ionicons name="close-circle" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            {showRepaymentModal ? <RepaymentForm loan={selectedLoan} initialData={editingRepayment} formatCurrency={formatCurrency} onSubmit={submitRepaymentForm} onCancel={() => setShowRepaymentModal(false)} /> : null}

                            {false && <>
                            <Text style={styles.inputLabel}>Repayment Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={repaymentDateInput}
                                onChangeText={setRepaymentDateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Amount Paid ({currency})</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={repaymentAmountInput}
                                onChangeText={setRepaymentAmountInput}
                                placeholder="Amount repaid"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Payment Method</Text>
                            <View style={styles.statusButtonsRow}>
                                {["Cash", "Card", "Bank Transfer", "UPI"].map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.statusSelectorBtn,
                                            repaymentMethodInput === m && styles.statusSelectorBtnActive,
                                        ]}
                                        onPress={() => setRepaymentMethodInput(m)}
                                    >
                                        <Text
                                            style={[
                                                styles.statusSelectorBtnText,
                                                repaymentMethodInput === m && styles.statusSelectorBtnTextActive,
                                            ]}
                                        >
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Description / Notes</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                                multiline={true}
                                value={repaymentDescriptionInput}
                                onChangeText={setRepaymentDescriptionInput}
                                placeholder="Repayment notes"
                                placeholderTextColor="#64748b"
                            />

                            <View style={styles.modalButtonsRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowRepaymentModal(false)}
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: "#e11d48" }]} onPress={handleSaveRepayment}>
                                    <Text style={styles.modalSubmitBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                            </>}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Modal: Add Interest Charge */}
            <Modal visible={showInterestModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Interest Charge</Text>
                                <Text style={styles.modalHeaderSubtitle}>for {selectedLoan?.lenderName}</Text>
                                <TouchableOpacity onPress={() => setShowInterestModal(false)}>
                                    <Ionicons name="close-circle" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <InterestForm onSubmit={submitInterestForm} onCancel={() => setShowInterestModal(false)} />

                            {false && <>
                            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={interestDateInput}
                                onChangeText={setInterestDateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Interest Amount ({currency})</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={interestAmountInput}
                                onChangeText={setInterestAmountInput}
                                placeholder="Interest amount to add"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.inputLabel}>Notes / Description</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                                multiline={true}
                                value={interestDescriptionInput}
                                onChangeText={setInterestDescriptionInput}
                                placeholder="Interest reason"
                                placeholderTextColor="#64748b"
                            />

                            <View style={styles.modalButtonsRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowInterestModal(false)}
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: "#e11d48" }]} onPress={handleSaveInterest}>
                                    <Text style={styles.modalSubmitBtnText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                            </>}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity style={styles.fab} onPress={handleOpenAddLoanModal}>
                <Ionicons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}

const formStyles = StyleSheet.create({
    field: { marginBottom: 16 }, label: { color: "#cbd5e1", fontSize: 13, fontWeight: "600", marginBottom: 7 }, input: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: "#2b3a4e", color: "#f8fafc", backgroundColor: "#0f1d2d", paddingHorizontal: 13, fontSize: 15 }, error: { color: "#fca5a5", fontSize: 12, marginTop: 6 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#172233", borderWidth: 1, borderColor: "#2b3a4e" }, choiceActive: { backgroundColor: "#0c4a6e", borderColor: "#38bdf8" }, choiceText: { color: "#94a3b8", fontSize: 12 }, choiceTextActive: { color: "#e0f2fe", fontWeight: "700" }, dropdownTrigger: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: "#2b3a4e", backgroundColor: "#0f1d2d", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dropdownTriggerText: { color: "#f8fafc", flex: 1, marginRight: 8, fontSize: 15 }, dropdownMenu: { marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: "#2b3a4e", backgroundColor: "#0f1d2d", overflow: "hidden" }, dropdownList: { maxHeight: 180 }, dropdownOption: { minHeight: 44, paddingHorizontal: 13, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#1e293b" }, dropdownOptionSelected: { backgroundColor: "#0c4a6e" }, dropdownOptionText: { color: "#cbd5e1", fontSize: 14 }, dropdownOptionTextSelected: { color: "#e0f2fe", fontWeight: "700" }, actions: { flexDirection: "row", gap: 12, marginTop: 8 }, cancel: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "#334155" }, cancelText: { color: "#cbd5e1", fontWeight: "700" }, submit: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 10, backgroundColor: "#e11d48" }, submitText: { color: "white", fontWeight: "800" }, disabled: { opacity: 0.6 }, summary: { backgroundColor: "#172233", borderRadius: 10, padding: 12, marginBottom: 16 }, summaryText: { color: "#cbd5e1", fontWeight: "700" },
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
        gap: 16,
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
    loanCard: {
        backgroundColor: "#172233",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#2b3a4e",
        padding: 16,
    },
    loanCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    lenderName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ffffff",
    },
    loanDateText: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 2,
    },
    loanStatsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#0d1724",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#2b3a4e",
        marginBottom: 10,
    },
    loanStatCol: {
        flex: 1,
        alignItems: "center",
    },
    loanStatLabel: {
        fontSize: 10,
        color: "#94a3b8",
        fontWeight: "600",
    },
    loanStatValText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#ffffff",
        marginTop: 4,
    },
    loanStatValSuccess: {
        fontSize: 13,
        fontWeight: "700",
        color: "#10b981",
        marginTop: 4,
    },
    loanStatValMuted: {
        fontSize: 13,
        fontWeight: "700",
        color: "#60a5fa",
        marginTop: 4,
    },
    loanInterestRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    interestLabel: {
        fontSize: 10,
        color: "#94a3b8",
    },
    progressContainer: {
        height: 6,
        backgroundColor: "#0d1724",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 14,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#10b981",
    },
    loanActionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    btnActionPrimary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e11d48",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4,
    },
    btnActionWarning: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f59e0b",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 4,
    },
    btnActionSecondary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2b3a4e",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 4,
    },
    btnActionSecondaryActive: {
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 1,
        borderColor: "#10b981",
    },
    btnActionText: {
        color: "#ffffff",
        fontSize: 11,
        fontWeight: "700",
    },
    btnIconEdit: {
        width: 32,
        height: 32,
        backgroundColor: "rgba(96, 165, 250, 0.1)",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: "auto",
    },
    btnIconDelete: {
        width: 32,
        height: 32,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    transactionsPanel: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#2b3a4e",
        paddingTop: 14,
    },
    panelTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#94a3b8",
        textTransform: "uppercase",
        marginBottom: 10,
    },
    noHistoryText: {
        fontSize: 12,
        color: "#94a3b8",
        textAlign: "center",
        marginVertical: 12,
    },
    historyMonthGroup: {
        marginBottom: 12,
    },
    monthGroupTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: 6,
    },
    historyWeekGroup: {
        marginBottom: 8,
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: "#2b3a4e",
    },
    weekLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "#94a3b8",
        marginBottom: 4,
    },
    txRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        backgroundColor: "#1b283a",
        padding: 8,
        borderRadius: 8,
        marginBottom: 6,
    },
    txRowLeft: {
        flex: 1,
        marginRight: 8,
    },
    txTypeLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#ffffff",
    },
    txDateText: {
        fontSize: 9,
        color: "#94a3b8",
        marginTop: 2,
    },
    txNote: {
        fontSize: 10,
        color: "#cbd5e1",
        marginTop: 4,
        fontStyle: "italic",
    },
    txRowRight: {
        alignItems: "flex-end",
        gap: 6,
    },
    txAmountRepayment: {
        fontSize: 12,
        fontWeight: "700",
        color: "#10b981",
    },
    txAmountInterest: {
        fontSize: 12,
        fontWeight: "700",
        color: "#ef4444",
    },
    txActionsRow: {
        flexDirection: "row",
        gap: 4,
    },
    txActionBtn: {
        padding: 4,
        borderRadius: 4,
        backgroundColor: "#0d1724",
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
    modalHeaderSubtitle: {
        fontSize: 12,
        color: "#94a3b8",
        marginLeft: 8,
        marginTop: 2,
        flex: 1,
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
        gap: 6,
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
        borderColor: "#e11d48",
        backgroundColor: "rgba(225, 29, 72, 0.1)",
    },
    statusSelectorBtnText: {
        fontSize: 12,
        color: "#94a3b8",
        fontWeight: "600",
    },
    statusSelectorBtnTextActive: {
        color: "#e11d48",
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
        backgroundColor: "#e11d48",
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    newLoanCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#2b3a4e",
        backgroundColor: "#111a2e",
        overflow: "hidden",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    newCardHeaderBanner: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 40,
        position: "relative",
        overflow: "hidden",
    },
    cardCircle: {
        position: "absolute",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    lenderAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
        justifyContent: "center",
        alignItems: "center",
    },
    lenderAvatarText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#ffffff",
    },
    lenderInfo: {
        flexDirection: "column",
    },
    lenderLabel: {
        fontSize: 10,
        color: "rgba(255, 255, 255, 0.6)",
        fontWeight: "700",
        letterSpacing: 0.8,
    },
    lenderTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#ffffff",
        marginTop: 2,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusBadgePill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    statusBadgeActive: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    statusBadgeRepaid: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#ffffff",
    },
    headerActionCircleBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    floatingStatsPanel: {
        marginHorizontal: 12,
        marginTop: -26,
        borderRadius: 14,
        backgroundColor: "#172233",
        borderWidth: 1,
        borderColor: "#2b3a4e",
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 3,
    },
    floatingStatCol: {
        flex: 1,
        alignItems: "center",
    },
    floatingStatLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: "#64748b",
        letterSpacing: 0.8,
    },
    floatingStatValCyan: {
        fontSize: 18,
        fontWeight: "900",
        color: "#06b6d4",
        marginTop: 4,
    },
    floatingStatValGreen: {
        fontSize: 18,
        fontWeight: "900",
        color: "#10b981",
        marginTop: 4,
    },
    floatingStatSubtext: {
        fontSize: 10,
        color: "#64748b",
        marginTop: 4,
    },
    floatingDivider: {
        width: 1,
        height: 38,
        backgroundColor: "#2b3a4e",
    },
    newCardBody: {
        padding: 16,
        paddingTop: 20,
    },
    threeColGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    threeColItem: {
        flex: 1,
        alignItems: "center",
    },
    threeColLabel: {
        fontSize: 9,
        fontWeight: "700",
        color: "#64748b",
        letterSpacing: 0.6,
    },
    threeColVal: {
        fontSize: 13,
        fontWeight: "800",
        color: "#ffffff",
        marginTop: 4,
    },
    interestAddedBox: {
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.25)",
        backgroundColor: "rgba(239, 68, 68, 0.04)",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginHorizontal: 8,
    },
    interestBoxLabel: {
        fontSize: 9,
        fontWeight: "700",
        color: "#f87171",
        letterSpacing: 0.6,
    },
    interestBoxVal: {
        fontSize: 13,
        fontWeight: "800",
        color: "#f87171",
        marginTop: 4,
    },
    quickInterestBtn: {
        borderWidth: 1.5,
        borderColor: "#f87171",
        borderStyle: "dashed",
        backgroundColor: "rgba(239, 68, 68, 0.02)",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
    },
    quickInterestBtnText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#f87171",
    },
    bodyActionsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    btnRecordRepayment: {
        flex: 1.5,
        backgroundColor: "#10b981",
        borderRadius: 8,
        paddingVertical: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    btnRecordRepaymentText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#ffffff",
    },
    btnRecordInterest: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#f87171",
        backgroundColor: "rgba(239, 68, 68, 0.03)",
        borderRadius: 8,
        paddingVertical: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    btnRecordInterestText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#f87171",
    },
    ledgerWorkLogLink: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#1e2d40",
    },
    ledgerWorkLogLinkText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#10b981",
    },
    btnToggleHistory: {
        borderWidth: 1,
        borderColor: "#2b3a4e",
        backgroundColor: "#172233",
        borderRadius: 8,
        paddingVertical: 8,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
    },
    btnToggleHistoryText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#94a3b8",
    },
    newLedgerContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#2b3a4e",
        paddingTop: 16,
    },
    ledgerHeaderTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#ffffff",
        marginBottom: 12,
    },
    ledgerMonthGroup: {
        marginBottom: 16,
    },
    ledgerMonthTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748b",
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    ledgerWeekGroup: {
        marginBottom: 10,
    },
    weekHeaderContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    weekIndicatorBar: {
        width: 3,
        height: 12,
        backgroundColor: "#34d399",
        borderRadius: 1.5,
    },
    ledgerWeekTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#34d399",
    },
    ledgerTxsBox: {
        backgroundColor: "#132237",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#2b3a4e",
        overflow: "hidden",
    },
    ledgerTxRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    ledgerTxRowBorder: {
        borderTopWidth: 1,
        borderTopColor: "#2b3a4e",
    },
    ledgerTxLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    ledgerTxAmountInterest: {
        fontSize: 12,
        fontWeight: "700",
        color: "#f87171",
    },
    ledgerTxAmountRepay: {
        fontSize: 12,
        fontWeight: "700",
        color: "#34d399",
    },
    ledgerTxDate: {
        fontSize: 11,
        color: "#64748b",
    },
    ledgerTxRightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    ledgerActionIconBtn: {
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
    },
});
