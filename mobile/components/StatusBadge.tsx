import { View, Text, StyleSheet } from "react-native";
import { STATUS_META, OrderStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as OrderStatus] ?? { label: status, color: "#71717a", icon: "•" };
  return (
    <View style={[styles.badge, { backgroundColor: meta.color + "22", borderColor: meta.color + "55" }]}>
      <Text style={styles.icon}>{meta.icon}</Text>
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 4,
  },
  icon: { fontSize: 11 },
  label: { fontSize: 11, fontWeight: "600" },
});
