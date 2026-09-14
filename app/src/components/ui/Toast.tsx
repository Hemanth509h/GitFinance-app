import React, { useCallback, useRef, useState } from "react";
import { Alert as NativeAlert, Animated, StyleSheet, Text } from "react-native";

type ToastKind = "success" | "error" | "info";

let showGlobalToast:
  | ((message: string, kind?: ToastKind) => void)
  | undefined;

export const toast = {
  success: (message: string) => showGlobalToast?.(message, "success"),
  error: (message: string) => showGlobalToast?.(message, "error"),
  info: (message: string) => showGlobalToast?.(message, "info"),
};

export function showAlertToast(
  title: string,
  message?: string,
  buttons?: Parameters<typeof NativeAlert.alert>[2],
) {
  if (buttons?.length) return NativeAlert.alert(title, message, buttons);
  const text = message || title;
  if (title === "Success" || title === "Deleted") return toast.success(text);
  if (title === "Info") return toast.info(text);
  return toast.error(text);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<{
    message: string;
    kind: ToastKind;
  } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setCurrent({ message, kind });
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start(() => setCurrent(null));
      }, 3200);
    },
    [opacity],
  );

  showGlobalToast = show;

  return (
    <>
      {children}
      {current ? (
        <Animated.View
          style={[
            styles.container,
            styles[current.kind],
            { opacity, pointerEvents: "none" },
          ]}
        >
          <Text style={styles.text}>{current.message}</Text>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  text: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  success: { backgroundColor: "#059669" },
  error: { backgroundColor: "#dc2626" },
  info: { backgroundColor: "#2563eb" },
});
