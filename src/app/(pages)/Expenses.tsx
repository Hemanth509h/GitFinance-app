import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
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
import { ListSkeleton } from "../../components/ui/Skeleton";
import { showAlertToast } from "../../components/ui/Toast";
import { useAuth } from "../../context/AuthContext";

const Alert = { alert: showAlertToast };

const formToday = () => new Date().toISOString().slice(0, 10);
function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </View>
  );
}
function FormInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#64748b"
      style={[formStyles.input, props.style]}
    />
  );
}
function FormChoices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={formStyles.choices}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => onChange(option)}
          style={[
            formStyles.choice,
            value === option && formStyles.choiceActive,
          ]}
        >
          <Text
            style={[
              formStyles.choiceText,
              value === option && formStyles.choiceTextActive,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
function FormActions({
  submitLabel,
  onSubmit,
  onCancel,
  submitting = false,
}: {
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  return (
    <View style={formStyles.actions}>
      <TouchableOpacity
        disabled={submitting}
        onPress={onCancel}
        style={formStyles.cancel}
      >
        <Text style={formStyles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={submitting}
        onPress={onSubmit}
        style={[formStyles.submit, submitting && formStyles.disabled]}
      >
        <Text style={formStyles.submitText}>
          {submitting ? "Saving…" : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
function ExpenseForm({ initialData, onSubmit, onCancel }: any) {
  const [data, setData] = useState(() => ({
    date: initialData?.date?.slice(0, 10) || formToday(),
    category: initialData?.category || "Other",
    amount: String(initialData?.amount || ""),
    merchant: initialData?.merchant || "",
    paymentMethod: initialData?.paymentMethod || "Cash",
    description: initialData?.description || "",
  }));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const set = (key: string, value: string) =>
    setData((d) => ({ ...d, [key]: value }));
  const submit = async () => {
    if (!data.date || Number(data.amount) <= 0)
      return setError("Enter a valid date and amount greater than zero.");
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        ...data,
        amount: Number(data.amount),
        merchant: data.merchant.trim(),
        description: data.description.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <FormField label="Expense date *" error={error}>
        <FormInput
          value={data.date}
          onChangeText={(v) => set("date", v)}
          placeholder="YYYY-MM-DD"
        />
      </FormField>
      <FormField label="Amount *">
        <FormInput
          keyboardType="decimal-pad"
          value={data.amount}
          onChangeText={(v) => set("amount", v)}
          placeholder="Amount spent"
        />
      </FormField>
      <FormField label="Merchant">
        <FormInput
          value={data.merchant}
          onChangeText={(v) => set("merchant", v)}
          placeholder="Shop, vendor, or person"
        />
      </FormField>
      <FormField label="Category *">
        <FormChoices
          value={data.category}
          options={EXPENSE_CATEGORIES}
          onChange={(v) => set("category", v)}
        />
      </FormField>
      <FormField label="Payment method">
        <FormChoices
          value={data.paymentMethod}
          options={PAYMENT_METHODS}
          onChange={(v) => set("paymentMethod", v)}
        />
      </FormField>
      <FormField label="Description">
        <FormInput
          multiline
          value={data.description}
          onChangeText={(v) => set("description", v)}
          placeholder="Expense notes"
          style={{ height: 82, textAlignVertical: "top", paddingTop: 12 }}
        />
      </FormField>
      <FormActions
        submitLabel={initialData ? "Update expense" : "Add expense"}
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

  // Use categories for styling badge backgrounds
  const redCategories = ["failed", "expense", "Taxes", "Equipment", "Bills"];
  const greenCategories = ["success", "income", "Software", "Office"];
  const yellowCategories = ["pending", "Travel", "Food", "Other"];

  if (greenCategories.includes(status) || status === "Paid") {
    bg = "rgba(16, 185, 129, 0.15)";
    fg = "#10b981";
  } else if (yellowCategories.includes(status) || status === "Pending") {
    bg = "rgba(245, 158, 11, 0.15)";
    fg = "#f59e0b";
  } else if (redCategories.includes(status) || status === "Unpaid") {
    bg = "rgba(239, 68, 68, 0.15)";
    fg = "#ef4444";
  }
  return (
    <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{status}</Text>
    </View>
  );
}

const EXPENSE_CATEGORIES = [
  "Travel",
  "Food",
  "Bills",
  "Software",
  "Equipment",
  "Taxes",
  "Office",
  "Other",
];

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "UPI"];

export default function Expenses() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState<{
    [key: string]: boolean;
  }>({});

  // Month Selector State
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7), // "YYYY-MM"
  );

  // Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Form inputs
  const [dateInput, setDateInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Other");
  const [amountInput, setAmountInput] = useState("");
  const [merchantInput, setMerchantInput] = useState("");
  const [paymentMethodInput, setPaymentMethodInput] = useState("Cash");
  const [descriptionInput, setDescriptionInput] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedExpenses((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchExpenses = async () => {
    try {
      const { data } = await api.getExpenses();
      setExpenses(data || []);
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Filtered expenses for selected month
  const filteredExpenses = expenses.filter((exp) => {
    if (!exp || !exp.date) return false;
    const expMonth = new Date(exp.date).toISOString().substring(0, 7);
    return expMonth === selectedMonth;
  });

  // Stats calculations
  const expenseCount = filteredExpenses.length;
  const totalSpend = filteredExpenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0,
  );

  // Top Category calculation
  const categoryTotals = filteredExpenses.reduce((totals: any, exp) => {
    const cat = exp.category || "Other";
    totals[cat] = (totals[cat] || 0) + Number(exp.amount || 0);
    return totals;
  }, {} as any);
  const sortedCategories = Object.entries(categoryTotals).sort(
    (a: any, b: any) => b[1] - a[1],
  );
  const topCategoryName = sortedCategories[0]?.[0] || "None";
  const topCategoryAmount = Number(sortedCategories[0]?.[1] || 0);

  // Average daily calculation (based on days in month or today's date if filtering current month)
  const isCurrentMonth =
    new Date().toISOString().substring(0, 7) === selectedMonth;
  const daysDivider = isCurrentMonth ? Math.max(1, new Date().getDate()) : 30;
  const averageDaily = totalSpend / daysDivider;

  const formatCurrency = (amount: number) => {
    const value = Number(amount || 0);
    const locale =
      currency === "INR" ? "en-IN" : currency === "USD" ? "en-US" : "en-US";
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

  // Group expenses by date
  const groupExpensesByDate = (expenseList: any[]) => {
    const sorted = [...expenseList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return sorted.reduce((groups: any, exp) => {
      const dateStr = new Date(exp.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(exp);
      return groups;
    }, {});
  };

  // CRUD actions
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setDateInput(new Date().toISOString().substring(0, 10));
    setCategoryInput("Other");
    setAmountInput("");
    setMerchantInput("");
    setPaymentMethodInput("Cash");
    setDescriptionInput("");
    setShowModal(true);
  };

  const handleOpenEditModal = (exp: any) => {
    setEditingExpense(exp);
    setDateInput(exp.date ? exp.date.split("T")[0] : "");
    setCategoryInput(exp.category || "Other");
    setAmountInput(String(exp.amount || ""));
    setMerchantInput(exp.merchant || "");
    setPaymentMethodInput(exp.paymentMethod || "Cash");
    setDescriptionInput(exp.description || "");
    setShowModal(true);
  };

  const handleSaveExpense = async () => {
    if (!amountInput.trim() || isNaN(Number(amountInput))) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    if (!categoryInput) {
      Alert.alert("Error", "Please choose a category.");
      return;
    }

    const payload = {
      date: dateInput || new Date().toISOString(),
      category: categoryInput,
      amount: Number(amountInput),
      merchant: merchantInput.trim(),
      paymentMethod: paymentMethodInput,
      description: descriptionInput.trim(),
    };

    try {
      setLoading(true);
      if (editingExpense) {
        await api.updateExpense(editingExpense._id, payload);
      } else {
        await api.createExpense(payload);
      }
      setShowModal(false);
      fetchExpenses();
    } catch (error) {
      console.error("Failed to save expense", error);
      Alert.alert("Error", "Failed to save expense entry.");
      setLoading(false);
    }
  };

  const submitExpenseForm = async (payload: any) => {
    try {
      setLoading(true);
      if (editingExpense) await api.updateExpense(editingExpense._id, payload);
      else await api.createExpense(payload);
      setShowModal(false);
      fetchExpenses();
    } catch (error) {
      console.error("Failed to save expense", error);
      Alert.alert("Error", "Failed to save expense.");
      setLoading(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteExpense(id);
              fetchExpenses();
            } catch (error) {
              console.error("Failed to delete expense", error);
              Alert.alert("Error", "Failed to delete expense.");
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Expenses</Text>
          <Text style={styles.headerSubtitle}>Daily Spend Tracking</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={18} color="#ef4444" />
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
              tintColor="#ef4444"
            />
          }
        >
          {/* Month Navigator Row */}
          <View style={styles.monthSelectorRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.monthNavBtn}
            >
              <Ionicons name="chevron-back-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.monthNameLabel}>{getSelectedMonthName()}</Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.monthNavBtn}
            >
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.metricsGrid}>
            <MetricTile
              title="Monthly Spend"
              value={formatCurrency(totalSpend)}
              subtext={`${expenseCount} records`}
              subtextColor="error"
              icon="receipt-outline"
              gradientFrom="#7f1d1d"
              gradientTo="#ef4444"
            />
            <MetricTile
              title="Top Category"
              value={topCategoryName}
              subtext={
                topCategoryAmount > 0
                  ? formatCurrency(topCategoryAmount)
                  : "No spend"
              }
              subtextColor="primary"
              icon="pricetags-outline"
              gradientFrom="#0c4a6e"
              gradientTo="#0284c7"
            />
            <MetricTile
              title="Average Daily"
              value={formatCurrency(averageDaily)}
              subtext="Based on current filter"
              subtextColor="muted"
              icon="wallet-outline"
              gradientFrom="#3f3f46"
              gradientTo="#71717a"
              isFullWidth={true}
            />
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={16} color="#94a3b8" />
            <Text style={styles.sectionTitle}>Expense Log</Text>
          </View>

          {/* Expenses List Grouped by Date */}
          <View style={styles.listContainer}>
            {filteredExpenses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No expenses found for this month.
                </Text>
              </View>
            ) : (
              Object.entries(groupExpensesByDate(filteredExpenses)).map(
                ([dateLabel, dayExpenses]: [string, any]) => {
                  const dailyTotal = dayExpenses.reduce(
                    (sum: number, e: any) => sum + Number(e.amount || 0),
                    0,
                  );

                  return (
                    <View key={dateLabel} style={styles.dateGroup}>
                      <View style={styles.dateHeader}>
                        <Text style={styles.dateLabel}>{dateLabel}</Text>
                        <Text style={styles.dateTotal}>
                          Total: {formatCurrency(dailyTotal)}
                        </Text>
                      </View>

                      {dayExpenses.map((expense: any) => {
                        const isExpanded = !!expandedExpenses[expense._id];
                        const expDateObj = new Date(expense.date);
                        const expDay = expDateObj.getDate();
                        const expMonthShort = expDateObj.toLocaleString(
                          "default",
                          { month: "short" },
                        );

                        return (
                          <View key={expense._id} style={styles.logCard}>
                            <TouchableOpacity
                              style={styles.logCardMain}
                              activeOpacity={0.9}
                              onPress={() => toggleExpand(expense._id)}
                            >
                              {/* Date Badge */}
                              <LinearGradient
                                colors={["#7f1d1d", "#ef4444"]}
                                style={styles.dateBadge}
                              >
                                <Text style={styles.dateBadgeMonth}>
                                  {expMonthShort}
                                </Text>
                                <Text style={styles.dateBadgeDay}>
                                  {expDay}
                                </Text>
                              </LinearGradient>

                              <View style={styles.logCardLeft}>
                                <Text
                                  style={styles.logClient}
                                  numberOfLines={1}
                                >
                                  {expense.merchant || expense.category}
                                </Text>
                                <Text style={styles.logSubText}>
                                  {expense.category} · {expense.paymentMethod}
                                </Text>
                              </View>

                              <View style={styles.logCardRight}>
                                <Text style={styles.amountTextNegative}>
                                  -{formatCurrency(expense.amount)}
                                </Text>
                                <View style={styles.cardActionsRow}>
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(expense);
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
                                      handleDeleteExpense(expense._id);
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
                                  isExpanded ? "chevron-up" : "chevron-down"
                                }
                                size={18}
                                color="#94a3b8"
                                style={{ marginLeft: 6 }}
                              />
                            </TouchableOpacity>

                            {isExpanded && (
                              <View style={styles.expandedPanel}>
                                <Text style={styles.expandedTitle}>
                                  EXPENSE DETAILS
                                </Text>

                                <View style={styles.expandedDetailsGroup}>
                                  <View style={styles.expandedDetailRow}>
                                    <Text style={styles.expandedDetailLabel}>
                                      Date:{" "}
                                    </Text>
                                    <Text style={styles.expandedDetailValue}>
                                      {new Date(
                                        expense.date,
                                      ).toLocaleDateString(undefined, {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </Text>
                                  </View>
                                  <View style={styles.expandedDetailRow}>
                                    <Text style={styles.expandedDetailLabel}>
                                      Amount:{" "}
                                    </Text>
                                    <Text style={styles.expandedDetailValue}>
                                      {formatCurrency(expense.amount)}
                                    </Text>
                                  </View>
                                  <View style={styles.expandedDetailRow}>
                                    <Text style={styles.expandedDetailLabel}>
                                      Payment Method:{" "}
                                    </Text>
                                    <Text style={styles.expandedDetailValue}>
                                      {expense.paymentMethod}
                                    </Text>
                                  </View>
                                  {expense.merchant ? (
                                    <View style={styles.expandedDetailRow}>
                                      <Text style={styles.expandedDetailLabel}>
                                        Merchant:{" "}
                                      </Text>
                                      <Text style={styles.expandedDetailValue}>
                                        {expense.merchant}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={styles.categoryBadgeWrapper}>
                                    <Text style={styles.expandedDetailLabel}>
                                      Category:{" "}
                                    </Text>
                                    <Badge status={expense.category} />
                                  </View>
                                </View>

                                <View style={styles.descriptionBox}>
                                  <View style={styles.descriptionAccentBar} />
                                  <View style={styles.descriptionTextWrapper}>
                                    <Text style={styles.descriptionLabel}>
                                      Description / Notes
                                    </Text>
                                    <Text style={styles.descriptionContent}>
                                      {expense.description ||
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
                },
              )
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal: Log / Edit Expense */}
      <Modal visible={showModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingExpense ? "Edit Expense" : "Add Expense"}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close-circle" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ExpenseForm
                initialData={editingExpense}
                onSubmit={submitExpenseForm}
                onCancel={() => setShowModal(false)}
              />

              {false && (
                <>
                  <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={dateInput}
                    onChangeText={setDateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>Amount ({currency})</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={amountInput}
                    onChangeText={setAmountInput}
                    placeholder="Amount spent"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>Merchant (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={merchantInput}
                    onChangeText={setMerchantInput}
                    placeholder="Where did you spend this?"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.categoriesWrap}>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catBtn,
                          categoryInput === cat && styles.catBtnActive,
                        ]}
                        onPress={() => setCategoryInput(cat)}
                      >
                        <Text
                          style={[
                            styles.catBtnText,
                            categoryInput === cat && styles.catBtnTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.statusButtonsRow}>
                    {PAYMENT_METHODS.map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.statusSelectorBtn,
                          paymentMethodInput === method &&
                            styles.statusSelectorBtnActive,
                        ]}
                        onPress={() => setPaymentMethodInput(method)}
                      >
                        <Text
                          style={[
                            styles.statusSelectorBtnText,
                            paymentMethodInput === method &&
                              styles.statusSelectorBtnTextActive,
                          ]}
                        >
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Description / Notes</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { height: 80, textAlignVertical: "top" },
                    ]}
                    multiline={true}
                    value={descriptionInput}
                    onChangeText={setDescriptionInput}
                    placeholder="Expense notes"
                    placeholderTextColor="#64748b"
                  />

                  <View style={[styles.modalButtonsRow, { marginTop: 16 }]}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setShowModal(false)}
                    >
                      <Text style={styles.modalCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalSubmitBtn}
                      onPress={handleSaveExpense}
                    >
                      <Text style={styles.modalSubmitBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  field: { marginBottom: 16 },
  label: { color: "#cbd5e1", fontSize: 13, fontWeight: "600", marginBottom: 7 },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2b3a4e",
    color: "#f8fafc",
    backgroundColor: "#0f1d2d",
    paddingHorizontal: 13,
    fontSize: 15,
  },
  error: { color: "#fca5a5", fontSize: 12, marginTop: 6 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#172233",
    borderWidth: 1,
    borderColor: "#2b3a4e",
  },
  choiceActive: { backgroundColor: "#0c4a6e", borderColor: "#38bdf8" },
  choiceText: { color: "#94a3b8", fontSize: 12 },
  choiceTextActive: { color: "#e0f2fe", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cancelText: { color: "#cbd5e1", fontWeight: "700" },
  submit: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#0ea5e9",
  },
  submitText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.6 },
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
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 3,
    borderColor: "#ef4444",
    paddingLeft: 10,
    marginVertical: 10,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
    letterSpacing: 0.2,
  },
  dateTotal: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  logCard: {
    backgroundColor: "#111c2d",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginBottom: 12,
  },
  logCardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateBadgeMonth: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 1,
  },
  logCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  logClient: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  logSubText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    fontWeight: "500",
  },
  logCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amountTextNegative: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
    marginRight: 4,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtnSecondary: {
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  expandedPanel: {
    padding: 16,
    backgroundColor: "#0d1726",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  expandedTitle: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  expandedDetailsGroup: {
    marginBottom: 12,
  },
  expandedDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  expandedDetailLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
    width: 140,
  },
  expandedDetailValue: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "600",
    flex: 1,
  },
  categoryBadgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  descriptionBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#152238",
    borderRadius: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  descriptionAccentBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#ef4444",
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
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  catBtn: {
    backgroundColor: "#0d1724",
    borderWidth: 1,
    borderColor: "#2b3a4e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catBtnActive: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  catBtnText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  catBtnTextActive: {
    color: "#ef4444",
    fontWeight: "700",
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
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  statusSelectorBtnText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  statusSelectorBtnTextActive: {
    color: "#ef4444",
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
    backgroundColor: "#ef4444",
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
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
