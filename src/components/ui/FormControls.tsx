import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function FormInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#64748b"
      style={[styles.input, props.style]}
    />
  );
}

export function FormChoices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => onChange(option)}
          style={[styles.choice, value === option && styles.choiceActive]}
        >
          <Text
            style={[
              styles.choiceText,
              value === option && styles.choiceTextActive,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function FormActions({
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
    <View style={styles.actions}>
      <TouchableOpacity
        disabled={submitting}
        onPress={onCancel}
        style={styles.cancel}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={submitting}
        onPress={onSubmit}
        style={[styles.submit, submitting && styles.disabled]}
      >
        <Text style={styles.submitText}>
          {submitting ? "Saving…" : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  submitText: { color: "#ffffff", fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
