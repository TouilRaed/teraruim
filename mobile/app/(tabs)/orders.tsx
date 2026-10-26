import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { COLORS, ORDER_STATUSES } from "@/lib/constants";
import { api, Order } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtRelative, fmtTND } from "@/lib/format";

export default function OrdersTab() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (reset = false) => {
    try {
      const r = await api.orders({ q: q || undefined, status: status || undefined, cursor: reset ? undefined : cursor || undefined });
      setOrders((prev) => reset ? r.orders : [...prev, ...r.orders]);
      setCursor(r.nextCursor);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [q, status, cursor]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load(true);
  }, [status])); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen padded={false}>
      <View style={s.header}>
        <Text style={s.h1}>Commandes</Text>
        <TextInput
          style={s.search}
          placeholder="Rechercher (nom, tél, id)…"
          placeholderTextColor={COLORS.textMuted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => { setLoading(true); load(true); }}
          returnKeyType="search"
        />
        <View style={s.filterRow}>
          <FilterChip label="Toutes" active={status === null} onPress={() => setStatus(null)} />
          {(["pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((st) => (
            <FilterChip key={st} label={st} active={status === st} onPress={() => setStatus(st)} />
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setCursor(null); load(true); }} tintColor={COLORS.primary} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (cursor && !loadingMore) { setLoadingMore(true); load(); }
          }}
          ListEmptyComponent={<Text style={s.empty}>Aucune commande</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/orders/${item.id}`)}>
              <View style={s.cardTop}>
                <Text style={s.name} numberOfLines={1}>{item.guestName ?? "Client"}</Text>
                <Text style={s.total}>{fmtTND(item.total)}</Text>
              </View>
              <View style={s.cardMid}>
                <Text style={s.dim} numberOfLines={1}>
                  {item.shipPhone ?? "—"} · {item.shipCity ?? item.shipGovernorate ?? "—"}
                </Text>
                <Text style={s.dim}>{fmtRelative(item.createdAt)}</Text>
              </View>
              <View style={s.cardBot}>
                <StatusBadge status={item.status} />
                <Text style={s.dim}>{item.items.length} article{item.items.length > 1 ? "s" : ""}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "800" },
  search: {
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 15,
  },
  filterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: COLORS.textDim, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardMid: { flexDirection: "row", justifyContent: "space-between" },
  cardBot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: COLORS.text, fontWeight: "700", fontSize: 16, flex: 1, marginRight: 8 },
  total: { color: COLORS.accent, fontWeight: "800", fontSize: 16 },
  dim: { color: COLORS.textDim, fontSize: 12 },
});
