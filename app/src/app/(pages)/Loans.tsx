import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../api";
import {
  FormActions,
  FormChoices,
  FormField,
  FormInput,
} from "../../components/ui/FormControls";
import { FormModal } from "../../components/ui/FormModal";
import { getCached, setCached } from "../../api/localData";
import { MetricTile } from "../../components/ui/MetricTile";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { showAlertToast, toast } from "../../components/ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { useReloadOnSync } from "../../hooks/useReloadOnSync";

const Alert = { alert: showAlertToast };

const formToday = () => new Date().toISOString().slice(0, 10);
export type CustomLoanGroup = {
  id: string;
  name: string;
  description?: string;
  loanIds: string[];
  createdAt: string;
};


function LoanForm({ initialData, onSubmit, onCancel }: any) {
  const [data, setData] = useState(() => ({
    lenderName: initialData?.lenderName || "",
    totalAmount: String(
      initialData?.principalAmount || initialData?.totalAmount || "",
    ),
    monthlyInterest: String(initialData?.monthlyInterest || "0"),
    startDate: initialData?.startDate?.slice(0, 10) || formToday(),
    description: initialData?.description || "",
    status: initialData?.status || "Active",
  }));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const set = (key: string, value: string) =>
    setData((d) => ({ ...d, [key]: value }));
  const submit = async () => {
    if (!data.lenderName.trim() || Number(data.totalAmount) <= 0)
      return setError("Enter a lender and a valid loan amount.");
    setSubmitting(true);
    try {
      await onSubmit({
        ...data,
        lenderName: data.lenderName.trim(),
        totalAmount: Number(data.totalAmount),
        monthlyInterest: Number(data.monthlyInterest || 0),
        description: data.description.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <FormField label="Lender name *" error={error}>
        <FormInput
          value={data.lenderName}
          onChangeText={(v) => set("lenderName", v)}
          placeholder="Bank, friend, or lender"
        />
      </FormField>
      <FormField label="Loan principal amount *">
        <FormInput
          keyboardType="decimal-pad"
          value={data.totalAmount}
          onChangeText={(v) => set("totalAmount", v)}
          placeholder="Amount borrowed"
        />
      </FormField>
      <FormField label="Monthly interest rate (%)">
        <FormInput
          keyboardType="decimal-pad"
          value={data.monthlyInterest}
          onChangeText={(v) => set("monthlyInterest", v)}
          placeholder="0"
        />
      </FormField>
      <FormField label="Start date">
        <FormInput
          value={data.startDate}
          onChangeText={(v) => set("startDate", v)}
          placeholder="YYYY-MM-DD"
        />
      </FormField>
      <FormField label="Status">
        <FormChoices
          value={data.status}
          options={["Active", "Repaid"]}
          onChange={(v) => set("status", v)}
        />
      </FormField>
      <FormField label="Description">
        <FormInput
          multiline
          value={data.description}
          onChangeText={(v) => set("description", v)}
          placeholder="Loan notes"
          style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }}
        />
      </FormField>
      <FormActions
        submitLabel={initialData ? "Update loan" : "Add loan"}
        onSubmit={submit}
        onCancel={onCancel}
        submitting={submitting}
      />
    </>
  );
}
function RepaymentForm({
  loan,
  initialData,
  onSubmit,
  onCancel,
  formatCurrency,
}: any) {
  const [data, setData] = useState(() => ({
    date: initialData?.date?.slice(0, 10) || formToday(),
    amount: String(initialData?.amount || ""),
    method: initialData?.method || "Cash",
    note: initialData?.note || initialData?.description || "",
  }));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const set = (key: string, value: string) =>
    setData((d) => ({ ...d, [key]: value }));
  const remaining = Math.max(
    0,
    Number(loan?.totalAmount || 0) -
      Number(loan?.amountPaid || 0) +
      Number(initialData?.amount || 0),
  );
  const submit = async () => {
    const amount = Number(data.amount);
    if (!data.date || amount <= 0 || amount > remaining)
      return setError(
        amount > remaining
          ? "The repayment cannot exceed the remaining balance."
          : "Enter a valid repayment date and amount.",
      );
    setSubmitting(true);
    try {
      await onSubmit({
        ...data,
        amount,
        note: data.note.trim(),
        type: "Repayment",
        status: "Success",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Remaining balance: {formatCurrency(remaining)}
        </Text>
      </View>
      <FormField label="Repayment date *" error={error}>
        <FormInput
          value={data.date}
          onChangeText={(v) => set("date", v)}
          placeholder="YYYY-MM-DD"
        />
      </FormField>
      <FormField label="Amount paid *">
        <FormInput
          keyboardType="decimal-pad"
          value={data.amount}
          onChangeText={(v) => set("amount", v)}
          placeholder="Amount repaid"
        />
      </FormField>
      <FormField label="Payment method">
        <FormChoices
          value={data.method}
          options={["Cash", "Card", "Bank Transfer", "UPI"]}
          onChange={(v) => set("method", v)}
        />
      </FormField>
      <FormField label="Notes">
        <FormInput
          multiline
          value={data.note}
          onChangeText={(v) => set("note", v)}
          placeholder="Repayment notes"
          style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }}
        />
      </FormField>
      <FormActions
        submitLabel={initialData ? "Update repayment" : "Record repayment"}
        onSubmit={submit}
        onCancel={onCancel}
        submitting={submitting}
      />
    </>
  );
}
function InterestForm({ onSubmit, onCancel }: any) {
  const [data, setData] = useState({ date: formToday(), amount: "", note: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!data.date || Number(data.amount) <= 0)
      return setError("Enter a valid date and interest amount.");
    setSubmitting(true);
    try {
      await onSubmit({
        ...data,
        amount: Number(data.amount),
        note: data.note.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <FormField label="Date *" error={error}>
        <FormInput
          value={data.date}
          onChangeText={(date) => setData((d) => ({ ...d, date }))}
          placeholder="YYYY-MM-DD"
        />
      </FormField>
      <FormField label="Interest amount *">
        <FormInput
          keyboardType="decimal-pad"
          value={data.amount}
          onChangeText={(amount) => setData((d) => ({ ...d, amount }))}
          placeholder="Interest amount to add"
        />
      </FormField>
      <FormField label="Notes">
        <FormInput
          multiline
          value={data.note}
          onChangeText={(note) => setData((d) => ({ ...d, note }))}
          placeholder="Interest reason"
          style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }}
        />
      </FormField>
      <FormActions
        submitLabel="Add interest"
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
  const [repaymentsMap, setRepaymentsMap] = useState<{
    [loanId: string]: any[];
  }>({});
  const [repaymentsLoading, setRepaymentsLoading] = useState<string | null>(
    null,
  );

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
  const [repaymentDescriptionInput, setRepaymentDescriptionInput] =
    useState("");

  // Form inputs: Interest Form
  const [interestDateInput, setInterestDateInput] = useState("");
  const [interestAmountInput, setInterestAmountInput] = useState("");
  const [interestDescriptionInput, setInterestDescriptionInput] = useState("");

  const formatCurrency = (amount: number) => {
    const value = Number(amount || 0);
    const locale =
      currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-US";
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLoans();
    if (expandedLoanId) {
      fetchRepayments(expandedLoanId);
    }
  };

  useReloadOnSync(fetchLoans);

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

  // Custom Groups State
  const [customGroups, setCustomGroups] = useState<CustomLoanGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [showCustomGroupModal, setShowCustomGroupModal] = useState(false);
  const [editingCustomGroup, setEditingCustomGroup] =
    useState<CustomLoanGroup | null>(null);
  const [customGroupNameInput, setCustomGroupNameInput] = useState("");
  const [customGroupDescInput, setCustomGroupDescInput] = useState("");
  const [customGroupLoanIdsInput, setCustomGroupLoanIdsInput] = useState<
    string[]
  >([]);

  const fetchCustomGroups = async () => {
    try {
      const cached = await getCached<CustomLoanGroup[]>("custom-loan-groups");
      if (cached && Array.isArray(cached)) {
        setCustomGroups(cached);
      }
    } catch (e) {
      console.error("Failed to load custom loan groups", e);
    }
  };

  const handleOpenCreateCustomGroup = () => {
    setEditingCustomGroup(null);
    setCustomGroupNameInput("");
    setCustomGroupDescInput("");
    setCustomGroupLoanIdsInput([]);
    setShowCustomGroupModal(true);
  };

  const handleOpenEditCustomGroup = (group: CustomLoanGroup) => {
    setEditingCustomGroup(group);
    setCustomGroupNameInput(group.name);
    setCustomGroupDescInput(group.description || "");
    setCustomGroupLoanIdsInput(group.loanIds || []);
    setShowCustomGroupModal(true);
  };

  const handleToggleLoanInGroup = (loanId: string) => {
    setCustomGroupLoanIdsInput((prev) =>
      prev.includes(loanId)
        ? prev.filter((id) => id !== loanId)
        : [...prev, loanId],
    );
  };

  const handleSaveCustomGroup = async () => {
    if (!customGroupNameInput.trim()) {
      toast.error("Please enter a group name.");
      return;
    }
    const groupId = editingCustomGroup?.id || `grp-${Date.now()}`;
    const newGroup: CustomLoanGroup = {
      id: groupId,
      name: customGroupNameInput.trim(),
      description: customGroupDescInput.trim(),
      loanIds: customGroupLoanIdsInput,
      createdAt: editingCustomGroup?.createdAt || new Date().toISOString(),
    };

    let updated: CustomLoanGroup[];
    if (editingCustomGroup) {
      updated = customGroups.map((g) =>
        g.id === editingCustomGroup.id ? newGroup : g,
      );
    } else {
      updated = [...customGroups, newGroup];
    }
    setCustomGroups(updated);
    setSelectedGroupId(groupId);
    await setCached("custom-loan-groups", updated);
    setShowCustomGroupModal(false);
    toast.success(
      editingCustomGroup ? "Group updated." : "Group created successfully.",
    );
  };

  const handleDeleteCustomGroup = (groupId: string) => {
    Alert.alert(
      "Delete Custom Group",
      "Are you sure you want to delete this custom group? The loans will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = customGroups.filter((g) => g.id !== groupId);
            setCustomGroups(updated);
            if (selectedGroupId === groupId) {
              setSelectedGroupId("all");
            }
            await setCached("custom-loan-groups", updated);
            toast.success("Group deleted.");
          },
        },
      ],
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchLoans();
      fetchCustomGroups();
    }, []),
  );

  // Summary calculations
  const totalBorrowed = loans.reduce(
    (sum, loan) => sum + Number(loan.principalAmount || loan.totalAmount || 0),
    0,
  );
  const totalPaid = loans.reduce(
    (sum, loan) => sum + Number(loan.amountPaid || 0),
    0,
  );

  const totalRemaining = loans.reduce((sum, loan) => {
    const remaining = Math.max(
      0,
      Number(loan.totalAmount || 0) - Number(loan.amountPaid || 0),
    );
    return sum + remaining;
  }, 0);

  const totalCalculatedOwed = loans.reduce(
    (sum, loan) => sum + Number(loan.totalAmount || 0),
    0,
  );
  const progressPercent =
    totalCalculatedOwed > 0 ? (totalPaid / totalCalculatedOwed) * 100 : 0;

  const getLoanStatus = (loan: any) =>
    loan.status === "Repaid" ||
    Math.max(
      0,
      Number(loan.totalAmount || 0) - Number(loan.amountPaid || 0),
    ) === 0
      ? "Repaid"
      : "Active";

  const getGroupedLoans = () => {
    if (selectedGroupId === "all") {
      return [{ label: "All Loans", items: loans }];
    }

    if (selectedGroupId === "others") {
      const allGroupedIds = new Set(
        customGroups.flatMap((g) => g.loanIds || []),
      );
      const ungroupedLoans = loans.filter((l) => !allGroupedIds.has(l._id));
      return [{ label: "Other Loans", items: ungroupedLoans }];
    }

    const activeGroup = customGroups.find((g) => g.id === selectedGroupId);
    if (!activeGroup) {
      return [{ label: "All Loans", items: loans }];
    }

    const groupLoans = loans.filter((l) =>
      activeGroup.loanIds?.includes(l._id),
    );
    return [{ label: activeGroup.name, items: groupLoans }];
  };

  // Grouping helper for repayments list
  const groupRepayments = (repaymentList: any[]) => {
    const sorted = [...repaymentList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return sorted.reduce((groups: any, item) => {
      const date = new Date(item.date);
      const monthYear = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
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
      toast.error("Please enter a lender name.");
      return;
    }
    if (!loanAmountInput.trim() || isNaN(Number(loanAmountInput))) {
      toast.error("Please enter a valid loan amount.");
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
      toast.success(selectedLoan ? "Loan updated successfully." : "Loan created successfully.");
      setShowLoanModal(false);
      fetchLoans();
    } catch (error) {
      console.error("Failed to save loan", error);
      toast.error("Failed to save loan.");
      setLoading(false);
    }
  };

  const handleDeleteLoan = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this loan? All repayments will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteLoan(id);
              setExpandedLoanId(null);
              toast.success("Loan deleted.");
              fetchLoans();
            } catch (error) {
              console.error("Failed to delete loan", error);
              toast.error("Failed to delete loan.");
              setLoading(false);
            }
          },
        },
      ],
    );
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
      toast.error("Please enter a valid amount.");
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
        await api.updateLoanRepayment(
          selectedLoan._id,
          editingRepayment._id,
          payload,
        );
      } else {
        await api.addLoanRepayment(selectedLoan._id, payload);
      }
      toast.success(editingRepayment ? "Repayment updated." : "Repayment recorded.");
      setShowRepaymentModal(false);
      fetchLoans();
      fetchRepayments(selectedLoan._id);
    } catch (error) {
      console.error("Failed to save repayment", error);
      toast.error("Failed to save repayment.");
      setLoading(false);
    }
  };

  const handleDeleteRepayment = (loanId: string, repaymentId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this repayment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteLoanRepayment(loanId, repaymentId);
              toast.success("Repayment deleted.");
              fetchLoans();
              fetchRepayments(loanId);
            } catch (error) {
              console.error("Failed to delete repayment", error);
              toast.error("Failed to delete repayment.");
              setLoading(false);
            }
          },
        },
      ],
    );
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
      toast.error("Please enter a valid interest amount.");
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
      toast.success("Interest charge added.");
      setShowInterestModal(false);
      fetchLoans();
      fetchRepayments(selectedLoan._id);
    } catch (error) {
      console.error("Failed to save interest", error);
      toast.error("Failed to save interest charge.");
      setLoading(false);
    }
  };

  const submitLoanForm = async (payload: any) => {
    try {
      setLoading(true);
      if (selectedLoan) await api.updateLoan(selectedLoan._id, payload);
      else await api.createLoan(payload);
      toast.success(
        selectedLoan ? "Loan updated successfully." : "Loan created successfully.",
      );
      setShowLoanModal(false);
      fetchLoans();
    } catch (error) {
      console.error("Failed to save loan", error);
      Alert.alert("Error", "Failed to save loan.");
      setLoading(false);
    }
  };
  const submitRepaymentForm = async (payload: any) => {
    if (!selectedLoan) return;
    try {
      setLoading(true);
      if (editingRepayment)
        await api.updateLoanRepayment(
          selectedLoan._id,
          editingRepayment._id,
          payload,
        );
      else await api.addLoanRepayment(selectedLoan._id, payload);
      toast.success(
        editingRepayment ? "Repayment updated successfully." : "Repayment recorded successfully.",
      );
      setShowRepaymentModal(false);
      fetchLoans();
      fetchRepayments(selectedLoan._id);
    } catch (error) {
      console.error("Failed to save repayment", error);
      Alert.alert("Error", "Failed to save repayment.");
      setLoading(false);
    }
  };
  const submitInterestForm = async (payload: any) => {
    if (!selectedLoan) return;
    try {
      setLoading(true);
      await api.addLoanInterest(selectedLoan._id, payload);
      Alert.alert("Success", "Interest charge added successfully.");
      setShowInterestModal(false);
      fetchLoans();
      fetchRepayments(selectedLoan._id);
    } catch (error) {
      console.error("Failed to save interest", error);
      Alert.alert("Error", "Failed to save interest charge.");
      setLoading(false);
    }
  };

  const handleQuickAddInterest = async (loan: any) => {
    const interestAmount = Number(loan.monthlyInterest || 0);

    if (interestAmount <= 0) {
      Alert.alert(
        "Info",
        "No monthly interest amount configured for this loan.",
      );
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
              toast.success("Interest charge added.");
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
      ],
    );
  };

  // Ungrouped / Other loans (loans not assigned to any custom group)
  const allGroupedLoanIds = useMemo(
    () => new Set(customGroups.flatMap((g) => g.loanIds || [])),
    [customGroups],
  );
  const otherLoans = useMemo(
    () => loans.filter((l) => !allGroupedLoanIds.has(l._id)),
    [loans, allGroupedLoanIds],
  );

  // Selected custom group and derived KPIs
  const isOthersSelected = selectedGroupId === "others";
  const activeCustomGroup =
    selectedGroupId !== "all" && selectedGroupId !== "others"
      ? customGroups.find((g) => g.id === selectedGroupId) || null
      : null;
  const activeCustomGroupId = activeCustomGroup?.id;
  const activeGroupLoans = isOthersSelected
    ? otherLoans
    : activeCustomGroup
      ? loans.filter((l) => activeCustomGroup.loanIds?.includes(l._id))
      : [];

  const groupTotalBorrowed = activeGroupLoans.reduce(
    (sum: number, l: any) => sum + Number(l.principalAmount || l.totalAmount || 0),
    0,
  );
  const groupTotalPaid = activeGroupLoans.reduce(
    (sum: number, l: any) => sum + Number(l.amountPaid || 0),
    0,
  );
  const groupTotalRemaining = activeGroupLoans.reduce((sum: number, l: any) => {
    const rem = Math.max(
      0,
      Number(l.totalAmount || 0) - Number(l.amountPaid || 0),
    );
    return sum + rem;
  }, 0);
  const groupTotalOwed = activeGroupLoans.reduce(
    (sum: number, l: any) => sum + Number(l.totalAmount || 0),
    0,
  );
  const groupProgress =
    groupTotalOwed > 0 ? (groupTotalPaid / groupTotalOwed) * 100 : 0;

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
          {/* Loan Groups Navigation Bar */}
          <View style={styles.customGroupSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="folder-outline" size={16} color="#94a3b8" />
              <Text style={styles.sectionTitle}>Loan Groups</Text>
            </View>

            <View style={styles.groupChipsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupChipsScroll}
              >
                {/* All Loans Chip */}
                <TouchableOpacity
                  onPress={() => setSelectedGroupId("all")}
                  style={[
                    styles.groupChip,
                    selectedGroupId === "all" && styles.groupChipActive,
                  ]}
                >
                  <Ionicons
                    name="layers-outline"
                    size={14}
                    color={selectedGroupId === "all" ? "#38bdf8" : "#94a3b8"}
                  />
                  <Text
                    style={[
                      styles.groupChipText,
                      selectedGroupId === "all" && styles.groupChipTextActive,
                    ]}
                  >
                    All Loans
                  </Text>
                  <View
                    style={[
                      styles.groupChipBadge,
                      selectedGroupId === "all" && styles.groupChipBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupChipBadgeText,
                        selectedGroupId === "all" &&
                          styles.groupChipBadgeTextActive,
                      ]}
                    >
                      {loans.length}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Custom Groups Chips */}
                {customGroups.map((grp) => {
                  const isSelected = selectedGroupId === grp.id;
                  const count = loans.filter((l) =>
                    grp.loanIds?.includes(l._id),
                  ).length;
                  return (
                    <TouchableOpacity
                      key={grp.id}
                      onPress={() => setSelectedGroupId(grp.id)}
                      style={[
                        styles.groupChip,
                        isSelected && styles.groupChipActive,
                      ]}
                    >
                      <Ionicons
                        name="folder-outline"
                        size={13}
                        color={isSelected ? "#38bdf8" : "#94a3b8"}
                      />
                      <Text
                        style={[
                          styles.groupChipText,
                          isSelected && styles.groupChipTextActive,
                        ]}
                      >
                        {grp.name}
                      </Text>
                      <View
                        style={[
                          styles.groupChipBadge,
                          isSelected && styles.groupChipBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.groupChipBadgeText,
                            isSelected && styles.groupChipBadgeTextActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Other / Ungrouped Loans Chip (if any loans are not assigned to a group) */}
                {otherLoans.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSelectedGroupId("others")}
                    style={[
                      styles.groupChip,
                      selectedGroupId === "others" && styles.groupChipActive,
                    ]}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={13}
                      color={selectedGroupId === "others" ? "#38bdf8" : "#94a3b8"}
                    />
                    <Text
                      style={[
                        styles.groupChipText,
                        selectedGroupId === "others" && styles.groupChipTextActive,
                      ]}
                    >
                      Other Loans
                    </Text>
                    <View
                      style={[
                        styles.groupChipBadge,
                        selectedGroupId === "others" && styles.groupChipBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.groupChipBadgeText,
                          selectedGroupId === "others" &&
                            styles.groupChipBadgeTextActive,
                        ]}
                      >
                        {otherLoans.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* + New Group Button */}
                <TouchableOpacity
                  onPress={handleOpenCreateCustomGroup}
                  style={styles.newGroupBtn}
                >
                  <Ionicons name="add" size={15} color="#10b981" />
                  <Text style={styles.newGroupBtnText}>New Group</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* If All Loans is selected: show Global KPI Tiles */}
            {selectedGroupId === "all" ? (
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
                  subtext="Incl. interest additions"
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
            ) : isOthersSelected ? (
              /* If "Other Loans" is selected: show Other Loans Header & Group-specific KPIs */
              <View style={styles.activeGroupContainer}>
                <View style={styles.activeGroupHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={styles.activeGroupName}>Other Loans</Text>
                      <View style={styles.activeGroupCountPill}>
                        <Text style={styles.activeGroupCountText}>
                          {otherLoans.length}{" "}
                          {otherLoans.length === 1 ? "loan" : "loans"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.activeGroupDesc}>
                      Loans not yet assigned to any custom group
                    </Text>
                  </View>

                  <View style={styles.activeGroupActions}>
                    <TouchableOpacity
                      onPress={handleOpenCreateCustomGroup}
                      style={styles.groupActionBtn}
                    >
                      <Ionicons name="add" size={15} color="#38bdf8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* TOTAL KPIS FOR OTHER LOANS */}
                <View style={styles.groupKpiGrid}>
                  <LinearGradient
                    colors={["#1e1b4b", "#312e81"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.groupKpiCard}
                  >
                    <View style={styles.groupKpiTop}>
                      <Text style={styles.groupKpiLabel}>GROUP BORROWED</Text>
                      <Ionicons
                        name="cash-outline"
                        size={15}
                        color="#a5b4fc"
                      />
                    </View>
                    <Text style={styles.groupKpiValue}>
                      {formatCurrency(groupTotalBorrowed)}
                    </Text>
                    <Text style={styles.groupKpiSub}>
                      {otherLoans.length} loans unassigned
                    </Text>
                  </LinearGradient>

                  <LinearGradient
                    colors={["#4c0519", "#881337"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.groupKpiCard}
                  >
                    <View style={styles.groupKpiTop}>
                      <Text style={styles.groupKpiLabel}>OUTSTANDING</Text>
                      <Ionicons
                        name="wallet-outline"
                        size={15}
                        color="#fda4af"
                      />
                    </View>
                    <Text
                      style={[
                        styles.groupKpiValue,
                        {
                          color:
                            groupTotalRemaining === 0 ? "#34d399" : "#fda4af",
                        },
                      ]}
                    >
                      {formatCurrency(groupTotalRemaining)}
                    </Text>
                    <Text style={styles.groupKpiSub}>
                      {groupTotalRemaining === 0
                        ? "Fully cleared 🎉"
                        : "Pending balance"}
                    </Text>
                  </LinearGradient>

                  <LinearGradient
                    colors={["#064e3b", "#065f46"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.groupKpiCard, styles.groupKpiCardFull]}
                  >
                    <View style={styles.groupKpiTop}>
                      <Text style={styles.groupKpiLabel}>GROUP PROGRESS</Text>
                      <Ionicons
                        name="checkmark-done-circle-outline"
                        size={15}
                        color="#6ee7b7"
                      />
                    </View>
                    <View style={styles.groupProgressRow}>
                      <Text style={styles.groupKpiValue}>
                        {Math.round(groupProgress)}%
                      </Text>
                      <Text style={styles.groupRepaidText}>
                        Repaid {formatCurrency(groupTotalPaid)} of{" "}
                        {formatCurrency(groupTotalOwed)}
                      </Text>
                    </View>
                    <View style={styles.groupProgressBarTrack}>
                      <View
                        style={[
                          styles.groupProgressBarFill,
                          {
                            width: `${Math.min(100, Math.max(0, groupProgress))}%`,
                          },
                        ]}
                      />
                    </View>
                  </LinearGradient>
                </View>
              </View>
            ) : activeCustomGroup ? (
              /* If a Custom Group is selected: show Active Group Header & Group-specific KPIs */
              <View style={styles.activeGroupContainer}>
                {/* Active Group Header */}
                <View style={styles.activeGroupHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={styles.activeGroupName}>
                        {activeCustomGroup.name}
                      </Text>
                      <View style={styles.activeGroupCountPill}>
                        <Text style={styles.activeGroupCountText}>
                          {activeGroupLoans.length}{" "}
                          {activeGroupLoans.length === 1 ? "loan" : "loans"}
                        </Text>
                      </View>
                    </View>
                    {activeCustomGroup.description ? (
                      <Text style={styles.activeGroupDesc}>
                        {activeCustomGroup.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.activeGroupActions}>
                    <TouchableOpacity
                      onPress={() =>
                        handleOpenEditCustomGroup(activeCustomGroup)
                      }
                      style={styles.groupActionBtn}
                    >
                      <Ionicons name="pencil" size={13} color="#cbd5e1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteCustomGroup(activeCustomGroup.id)
                      }
                      style={[
                        styles.groupActionBtn,
                        styles.groupActionBtnDelete,
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={13}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* TOTAL KPIS FOR THAT GROUP */}
                <View style={styles.groupKpiGrid}>
                  <LinearGradient
                    colors={["#1e1b4b", "#312e81"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.groupKpiCard}
                  >
                    <View style={styles.groupKpiTop}>
                      <Text style={styles.groupKpiLabel}>GROUP BORROWED</Text>
                      <Ionicons
                        name="cash-outline"
                        size={15}
                        color="#a5b4fc"
                      />
                    </View>
                    <Text style={styles.groupKpiValue}>
                      {formatCurrency(groupTotalBorrowed)}
                    </Text>
                    <Text style={styles.groupKpiSub}>
                      {activeGroupLoans.length} loans included
                    </Text>
                  </LinearGradient>

                  <LinearGradient
                    colors={["#4c0519", "#881337"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.groupKpiCard}
                  >
                    <View style={styles.groupKpiTop}>
                      <Text style={styles.groupKpiLabel}>OUTSTANDING</Text>
                      <Ionicons
                        name="wallet-outline"
                        size={15}
                        color="#fda4af"
                      />
                    </View>
                    <Text
                      style={[
                        styles.groupKpiValue,
                        {
                          color:
                            groupTotalRemaining === 0 ? "#34d399" : "#fda4af",
                        },
                      ]}
                    >
                      {formatCurrency(groupTotalRemaining)}
                    </Text>
                    <Text style={styles.groupKpiSub}>
                      {groupTotalRemaining === 0
                        ? "Fully cleared 🎉"
                        : "Pending balance"}
                    </Text>
                  </LinearGradient>

                  <LinearGradient
                    colors={["#064e3b", "#065f46"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.groupKpiCard, styles.groupKpiCardFull]}
                  >
                    <View style={styles.groupKpiTop}>
                      <Text style={styles.groupKpiLabel}>GROUP PROGRESS</Text>
                      <Ionicons
                        name="checkmark-done-circle-outline"
                        size={15}
                        color="#6ee7b7"
                      />
                    </View>
                    <View style={styles.groupProgressRow}>
                      <Text style={styles.groupKpiValue}>
                        {Math.round(groupProgress)}%
                      </Text>
                      <Text style={styles.groupRepaidText}>
                        Repaid {formatCurrency(groupTotalPaid)} of{" "}
                        {formatCurrency(groupTotalOwed)}
                      </Text>
                    </View>
                    <View style={styles.groupProgressBarTrack}>
                      <View
                        style={[
                          styles.groupProgressBarFill,
                          {
                            width: `${Math.min(100, Math.max(0, groupProgress))}%`,
                          },
                        ]}
                      />
                    </View>
                  </LinearGradient>
                </View>

                {/* If no loans assigned to this group yet */}
                {activeGroupLoans.length === 0 && (
                  <View style={styles.noLoansInGroupCard}>
                    <Ionicons
                      name="information-circle-outline"
                      size={22}
                      color="#38bdf8"
                    />
                    <Text style={styles.noLoansInGroupText}>
                      No loans assigned to this group yet.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleOpenEditCustomGroup(activeCustomGroup)
                      }
                      style={styles.btnAssignLoans}
                    >
                      <Text style={styles.btnAssignLoansText}>
                        Select Loans
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}
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
              getGroupedLoans().map((section) => (
                <React.Fragment key={section.label}>
                  {selectedGroupId !== "all" && (
                    <View style={styles.loanGroupHeader}>
                      <Text style={styles.loanGroupTitle}>
                        {section.label}
                      </Text>
                      <Text style={styles.loanGroupCount}>
                        {section.items.length}
                      </Text>
                    </View>
                  )}
                  {section.items.length === 0 ? (
                    <View style={[styles.emptyContainer, { paddingVertical: 24 }]}>
                      <Text style={styles.emptyText}>
                        No loans found in this section.
                      </Text>
                    </View>
                  ) : (
                    section.items.map((loan) => {
                const isExpanded = expandedLoanId === loan._id;
                const remaining = Math.max(
                  0,
                  Number(loan.totalAmount || 0) - Number(loan.amountPaid || 0),
                );
                const loanProgress =
                  Number(loan.totalAmount || 0) > 0
                    ? (loan.amountPaid || 0) / Number(loan.totalAmount || 0)
                    : 0;
                const interestAdded =
                  Number(loan.totalAmount || 0) -
                  Number(loan.principalAmount || loan.totalAmount || 0);
                const firstLetter = (loan.lenderName || "L")
                  .charAt(0)
                  .toUpperCase();
                const currentMonthName = new Date().toLocaleString("default", {
                  month: "long",
                });

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
                      colors={
                        remaining === 0
                          ? ["#334155", "#1e293b"]
                          : ["#0d9488", "#115e59"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.newCardHeaderBanner}
                    >
                      {/* Decorative circles */}
                      <View
                        style={[
                          styles.cardCircle,
                          {
                            right: -20,
                            top: -20,
                            width: 90,
                            height: 90,
                            borderRadius: 45,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.cardCircle,
                          {
                            right: 30,
                            top: 40,
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                          },
                        ]}
                      />

                      <View style={styles.headerRow}>
                        {/* Left part: Avatar and Lender details */}
                        <View style={styles.headerLeft}>
                          <View style={styles.lenderAvatar}>
                            <Text style={styles.lenderAvatarText}>
                              {firstLetter}
                            </Text>
                          </View>
                          <View style={styles.lenderInfo}>
                            <Text style={styles.lenderLabel}>LENDER</Text>
                            <Text style={styles.lenderTitle} numberOfLines={1}>
                              {loan.lenderName}
                            </Text>
                          </View>
                        </View>

                        {/* Right part: status and actions */}
                        <View style={styles.headerRight}>
                          <View
                            style={[
                              styles.statusBadgePill,
                              remaining === 0
                                ? styles.statusBadgeRepaid
                                : styles.statusBadgeActive,
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>
                              {remaining === 0 ? "Repaid" : "Active"}
                            </Text>
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
                            <Ionicons
                              name="trash-outline"
                              size={12}
                              color="#e2e8f0"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>

                    {/* Floating Stats Panel */}
                    <View style={styles.floatingStatsPanel}>
                      <View style={styles.floatingStatCol}>
                        <Text style={styles.floatingStatLabel}>REMAINING</Text>
                        <Text style={styles.floatingStatValCyan}>
                          {formatCurrency(remaining)}
                        </Text>
                        <Text style={styles.floatingStatSubtext}>
                          excl. interest:{" "}
                          <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                            {formatCurrency(
                              loan.principalAmount || loan.totalAmount,
                            )}
                          </Text>
                        </Text>
                      </View>

                      {/* Divider */}
                      <View style={styles.floatingDivider} />

                      <View style={styles.floatingStatCol}>
                        <Text style={styles.floatingStatLabel}>PAID</Text>
                        <Text style={styles.floatingStatValGreen}>
                          {formatCurrency(loan.amountPaid)}
                        </Text>
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
                          <Text style={styles.threeColVal}>
                            {formatCurrency(
                              loan.principalAmount || loan.totalAmount,
                            )}
                          </Text>
                        </View>
                        <View
                          style={[styles.threeColItem, styles.interestAddedBox]}
                        >
                          <Text style={styles.interestBoxLabel}>
                            INTEREST ADDED
                          </Text>
                          <Text style={styles.interestBoxVal}>
                            +{formatCurrency(interestAdded)}
                          </Text>
                        </View>
                        <View style={styles.threeColItem}>
                          <Text style={styles.threeColLabel}>SINCE</Text>
                          <Text style={styles.threeColVal}>
                            {formatDateShort(loan.startDate)}
                          </Text>
                        </View>
                      </View>

                      {/* Dynamic Interest Quick Button */}
                      {loan.monthlyInterest > 0 && remaining > 0 && (
                        <TouchableOpacity
                          style={styles.quickInterestBtn}
                          onPress={() => handleQuickAddInterest(loan)}
                        >
                          <Ionicons
                            name="trending-up"
                            size={14}
                            color="#f87171"
                          />
                          <Text style={styles.quickInterestBtnText}>
                            Add {currentMonthName} Interest —{" "}
                            {formatCurrency(loan.monthlyInterest)}
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
                              <Text style={styles.btnRecordRepaymentText}>
                                Record Repayment
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.btnRecordInterest}
                              onPress={() => handleOpenInterestModal(loan)}
                            >
                              <Ionicons
                                name="trending-up"
                                size={14}
                                color="#f87171"
                              />
                              <Text style={styles.btnRecordInterestText}>
                                Interest
                              </Text>
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
                            <ActivityIndicator
                              size="small"
                              color="#0d9488"
                              style={{ marginVertical: 12 }}
                            />
                          ) : !repaymentsMap[loan._id] ||
                            repaymentsMap[loan._id].length === 0 ? (
                            <Text style={styles.noHistoryText}>
                              No transactions recorded.
                            </Text>
                          ) : (
                            Object.entries(
                              groupRepayments(repaymentsMap[loan._id]),
                            ).map(([monthYear, weeks]: [string, any]) => (
                              <View
                                key={monthYear}
                                style={styles.ledgerMonthGroup}
                              >
                                <Text style={styles.ledgerMonthTitle}>
                                  {monthYear.toUpperCase()}
                                </Text>
                                {Object.entries(weeks).map(
                                  ([weekLabel, txs]: [string, any]) => (
                                    <View
                                      key={weekLabel}
                                      style={styles.ledgerWeekGroup}
                                    >
                                      {/* Green vertical bar indicator alongside week name */}
                                      <View style={styles.weekHeaderContainer}>
                                        <View style={styles.weekIndicatorBar} />
                                        <Text style={styles.ledgerWeekTitle}>
                                          {weekLabel.toUpperCase()}
                                        </Text>
                                      </View>

                                      {/* Transaction Box containing rows */}
                                      <View style={styles.ledgerTxsBox}>
                                        {txs.map((tx: any, idx: number) => {
                                          const isInterest =
                                            tx.type === "Interest";
                                          return (
                                            <React.Fragment key={tx._id}>
                                              <View
                                                style={[
                                                  styles.ledgerTxRow,
                                                  idx > 0 &&
                                                    styles.ledgerTxRowBorder,
                                                ]}
                                              >
                                                <View
                                                  style={styles.ledgerTxLeft}
                                                >
                                                  <Ionicons
                                                    name={
                                                      isInterest
                                                        ? "trending-up"
                                                        : "card-outline"
                                                    }
                                                    size={14}
                                                    color={
                                                      isInterest
                                                        ? "#f87171"
                                                        : "#34d399"
                                                    }
                                                  />
                                                  <Text
                                                    style={
                                                      isInterest
                                                        ? styles.ledgerTxAmountInterest
                                                        : styles.ledgerTxAmountRepay
                                                    }
                                                  >
                                                    {isInterest ? "+" : "-"}
                                                    {formatCurrency(tx.amount)}
                                                  </Text>
                                                </View>
                                                <Text
                                                  style={styles.ledgerTxDate}
                                                >
                                                  {formatDateShort(tx.date)}
                                                </Text>
                                                <View
                                                  style={
                                                    styles.ledgerTxRightActions
                                                  }
                                                >
                                                  {!isInterest && (
                                                    <TouchableOpacity
                                                      onPress={() =>
                                                        handleOpenRepaymentModal(
                                                          loan,
                                                          tx,
                                                        )
                                                      }
                                                      style={
                                                        styles.ledgerActionIconBtn
                                                      }
                                                    >
                                                      <Ionicons
                                                        name="pencil"
                                                        size={12}
                                                        color="#94a3b8"
                                                      />
                                                    </TouchableOpacity>
                                                  )}
                                                  <TouchableOpacity
                                                    onPress={() =>
                                                      handleDeleteRepayment(
                                                        loan._id,
                                                        tx._id,
                                                      )
                                                    }
                                                    style={
                                                      styles.ledgerActionIconBtn
                                                    }
                                                  >
                                                    <Ionicons
                                                      name="trash-outline"
                                                      size={12}
                                                      color="#ef4444"
                                                    />
                                                  </TouchableOpacity>
                                                </View>
                                              </View>
                                            </React.Fragment>
                                          );
                                        })}
                                      </View>
                                    </View>
                                  ),
                                )}
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                    );
                  })
                )}
                </React.Fragment>
              ))
            )}
            </View>
          </ScrollView>
      )}

      {/* Modal: Add / Edit Loan */}
      <FormModal
        visible={showLoanModal}
        title={selectedLoan ? "Edit Loan Account" : "Add Loan Account"}
        onClose={() => setShowLoanModal(false)}
      >
            <LoanForm
              initialData={selectedLoan}
              onSubmit={submitLoanForm}
              onCancel={() => setShowLoanModal(false)}
            />
      </FormModal>

      {/* Modal: Record Repayment */}
      <FormModal
        visible={showRepaymentModal}
        title={editingRepayment ? "Edit Repayment" : "Record Repayment"}
        subtitle={selectedLoan?.lenderName ? `to ${selectedLoan.lenderName}` : undefined}
        onClose={() => setShowRepaymentModal(false)}
      >
            {showRepaymentModal ? (
              <RepaymentForm
                loan={selectedLoan}
                initialData={editingRepayment}
                formatCurrency={formatCurrency}
                onSubmit={submitRepaymentForm}
                onCancel={() => setShowRepaymentModal(false)}
              />
            ) : null}
      </FormModal>

      {/* Modal: Add Interest Charge */}
      <FormModal
        visible={showInterestModal}
        title="Add Interest Charge"
        subtitle={selectedLoan?.lenderName ? `for ${selectedLoan.lenderName}` : undefined}
        onClose={() => setShowInterestModal(false)}
      >
            <InterestForm
              onSubmit={submitInterestForm}
              onCancel={() => setShowInterestModal(false)}
            />
      </FormModal>

      {/* Modal: Create / Edit Custom Group */}
      <FormModal
        visible={showCustomGroupModal}
        title={editingCustomGroup ? "Edit Custom Group" : "New Custom Group"}
        onClose={() => setShowCustomGroupModal(false)}
      >
            <FormField label="Group Name *">
              <FormInput
                value={customGroupNameInput}
                onChangeText={setCustomGroupNameInput}
                placeholder="e.g. Family Loans, Vehicle Debt, Personal"
              />
            </FormField>

            <FormField label="Description (optional)">
              <FormInput
                value={customGroupDescInput}
                onChangeText={setCustomGroupDescInput}
                placeholder="Group notes or purpose"
              />
            </FormField>

            <View style={{ marginTop: 6, marginBottom: 16 }}>
              <Text style={styles.formLabel}>
                Select Loans for this Group ({customGroupLoanIdsInput.length}{" "}
                selected)
              </Text>
              {loans.length === 0 ? (
                <Text style={styles.noLoansWarningText}>
                  No loan accounts found. Add loans first.
                </Text>
              ) : (
                <View style={styles.loanChecklistContainer}>
                  {loans.map((loan) => {
                    const isChecked = customGroupLoanIdsInput.includes(
                      loan._id,
                    );
                    const remaining = Math.max(
                      0,
                      Number(loan.totalAmount || 0) -
                        Number(loan.amountPaid || 0),
                    );
                    return (
                      <TouchableOpacity
                        key={loan._id}
                        onPress={() => handleToggleLoanInGroup(loan._id)}
                        style={[
                          styles.loanCheckItem,
                          isChecked && styles.loanCheckItemChecked,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            isChecked && styles.checkboxBoxChecked,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#ffffff"
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.loanCheckLender}>
                            {loan.lenderName}
                          </Text>
                          <Text style={styles.loanCheckSub}>
                            Principal:{" "}
                            {formatCurrency(
                              loan.principalAmount || loan.totalAmount,
                            )}{" "}
                            · Remaining: {formatCurrency(remaining)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <FormActions
              submitLabel={
                editingCustomGroup ? "Update Group" : "Create Group"
              }
              onSubmit={handleSaveCustomGroup}
              onCancel={() => setShowCustomGroupModal(false)}
            />
      </FormModal>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAddLoanModal}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  formLabel: { color: "#cbd5e1", fontSize: 13, fontWeight: "600", marginBottom: 7 },
  summary: {
    backgroundColor: "#172233",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: { color: "#cbd5e1", fontWeight: "700" },

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
  loanGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#2b3a4e",
    paddingBottom: 8,
    marginTop: 4,
  },
  loanGroupTitle: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
  },
  loanGroupCount: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
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
  // Custom Groups Styles
  customGroupSection: {
    marginBottom: 20,
  },
  groupChipsRow: {
    marginBottom: 16,
  },
  groupChipsScroll: {
    gap: 8,
    alignItems: "center",
  },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
  },
  groupChipActive: {
    backgroundColor: "#0c4a6e",
    borderColor: "#38bdf8",
  },
  groupChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  groupChipTextActive: {
    color: "#f0f9ff",
    fontWeight: "700",
  },
  groupChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  groupChipBadgeActive: {
    backgroundColor: "rgba(56, 189, 248, 0.25)",
  },
  groupChipBadgeText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  groupChipBadgeTextActive: {
    color: "#38bdf8",
  },
  newGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderStyle: "dashed",
  },
  newGroupBtnText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyGroupCard: {
    backgroundColor: "#111a2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2b3a4e",
    padding: 24,
    alignItems: "center",
    marginBottom: 8,
  },
  emptyGroupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyGroupTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  emptyGroupSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  createGroupPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  createGroupPrimaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  activeGroupContainer: {
    backgroundColor: "#111a2e",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2b3a4e",
    padding: 16,
  },
  activeGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  activeGroupName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  activeGroupDesc: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  activeGroupCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  activeGroupCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#38bdf8",
  },
  activeGroupActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    justifyContent: "center",
    alignItems: "center",
  },
  groupActionBtnDelete: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  groupKpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  groupKpiCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  groupKpiCardFull: {
    width: "100%",
  },
  groupKpiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  groupKpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.6,
  },
  groupKpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },
  groupKpiSub: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 3,
  },
  groupProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 2,
    marginBottom: 8,
  },
  groupRepaidText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  groupProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  groupProgressBarFill: {
    height: "100%",
    backgroundColor: "#34d399",
    borderRadius: 3,
  },
  noLoansInGroupCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    alignItems: "center",
    gap: 6,
  },
  noLoansInGroupText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
  btnAssignLoans: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#0284c7",
  },
  btnAssignLoansText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  loanChecklistContainer: {
    gap: 8,
    marginTop: 4,
  },
  loanCheckItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0f1d2d",
    borderWidth: 1,
    borderColor: "#2b3a4e",
  },
  loanCheckItemChecked: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#172233",
  },
  checkboxBoxChecked: {
    backgroundColor: "#0284c7",
    borderColor: "#38bdf8",
  },
  loanCheckLender: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  loanCheckSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  noLoansWarningText: {
    fontSize: 12,
    color: "#f59e0b",
    fontStyle: "italic",
    paddingVertical: 8,
  },
});
