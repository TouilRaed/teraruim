import { useCallback, useState } from "react";
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Linking } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { COLORS, ORDER_STATUSES, STATUS_META, API_BASE_URL } from "@/lib/constants";
import { api, OrderFull } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtTND } from "@/lib/format";

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.order(id);
      setOrder(r);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function changeStatus(next: string) {
    if (!order || updating) return;
    setUpdating(true);
    try {
      await api.updateOrderStatus(order.id, next);
      setOrder({ ...order, status: next });
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  function confirmDelete() {
    if (!order) return;
    Alert.alert("Supprimer la commande ?", "Action irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteOrder(order.id);
            router.back();
          } catch (e) {
            Alert.alert("Erreur", (e as Error).message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return <Screen><View style={s.center}><ActivityIndicator color={COLORS.primary} /></View></Screen>;
  }
  if (!order) {
    return <Screen><Text style={s.dim}>Introuvable</Text></Screen>;
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={s.h1}>Commande</Text>
        <Text style={s.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
        <View style={{ marginTop: 8 }}><StatusBadge status={order.status} /></View>

        <View style={s.card}>
          <Row label="Date" value={fmtDate(order.createdAt)} />
          <Row label="Total" value={fmtTND(order.total)} bold />
          <Row label="Téléphone" value={order.shipPhone ?? "—"} />
          <Row label="Adresse" value={`${order.shipAddress ?? ""}, ${order.shipCity ?? ""}, ${order.shipGovernorate ?? ""}`} />
          {order.adexBarcode && <Row label="ADEX" value={order.adexBarcode} />}
          {order.trackingStatus && <Row label="Suivi" value={order.trackingStatus} />}
        </View>

        {order.shipPhone ? (() => {
          const phone = order.shipPhone;
          const digits = phone.replace(/[^\d]/g, "");
          const wa = digits.startsWith("216") ? digits : `216${digits}`;
          return (
            <View style={s.callRow}>
              <TouchableOpacity
                style={[s.callBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => Linking.openURL(`tel:${phone}`)}
              >
                <Text style={s.callText}>📞 Appeler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.callBtn, { backgroundColor: "#25D366" }]}
                onPress={() => Linking.openURL(`https://wa.me/${wa}`)}
              >
                <Text style={s.callText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          );
        })() : null}

        <Text style={s.h2}>Articles</Text>
        <View style={s.card}>
          {order.items.map((it, i) => (
            <View key={it.id} style={[s.itemRow, i > 0 && s.divider]}>
              {it.product?.image ? (
                <Image source={{ uri: absUrl(it.product.image) }} style={s.thumb} />
              ) : (
                <View style={[s.thumb, { backgroundColor: COLORS.cardAlt }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle} numberOfLines={2}>{it.product?.title ?? it.productId}</Text>
                <Text style={s.dim}>{it.qty} × {fmtTND(it.price)}</Text>
              </View>
              <Text style={s.itemSub}>{fmtTND(it.qty * it.price)}</Text>
            </View>
          ))}
          {order.addOnsSummary ? (
            <View style={[s.itemRow, order.items.length > 0 && s.divider]}>
              <View style={[s.thumb, { backgroundColor: COLORS.cardAlt, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 20 }}>🎁</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle} numberOfLines={3}>{order.addOnsSummary}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text style={s.h2}>Changer le statut</Text>
        <View style={s.statusGrid}>
          {ORDER_STATUSES.filter((st) => st !== "cart_abandoned").map((st) => {
            const meta = STATUS_META[st];
            const active = order.status === st;
            return (
              <TouchableOpacity
                key={st}
                disabled={active || updating}
                onPress={() => changeStatus(st)}
                style={[s.statusBtn, active && { backgroundColor: meta.color, borderColor: meta.color }]}
              >
                <Text style={[s.statusBtnText, active && { color: "#fff" }]}>{meta.icon} {meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={s.dangerBtn} onPress={confirmDelete}>
          <Text style={s.dangerText}>Supprimer la commande</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && { fontWeight: "800", color: COLORS.accent }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function absUrl(u: string): string {
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return u;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { marginBottom: 8 },
  backText: { color: COLORS.textDim, fontSize: 14 },
  h1: { color: COLORS.text, fontSize: 26, fontWeight: "800" },
  h2: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  orderId: { color: COLORS.textDim, fontFamily: "monospace", marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 14, gap: 8 },
  callRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  callBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  callText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  rowLabel: { color: COLORS.textDim, fontSize: 13, width: 100 },
  rowValue: { color: COLORS.text, fontSize: 14, flex: 1, textAlign: "right" },
  itemRow: { flexDirection: "row", paddingVertical: 8, alignItems: "center", gap: 10 },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  itemTitle: { color: COLORS.text, fontWeight: "600" },
  itemSub: { color: COLORS.accent, fontWeight: "700" },
  dim: { color: COLORS.textDim, fontSize: 12 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  statusBtnText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  dangerBtn: {
    marginTop: 28, paddingVertical: 14, borderRadius: 12, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.danger + "55",
  },
  dangerText: { color: COLORS.danger, fontWeight: "700" },
});
