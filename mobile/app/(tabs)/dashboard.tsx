import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { COLORS, API_BASE_URL } from "@/lib/constants";
import { api, StatsResp } from "@/lib/api";
import { fmtTND } from "@/lib/format";

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<StatsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const r = await api.stats();
      setData(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <Screen><View style={s.center}><ActivityIndicator color={COLORS.primary} /></View></Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        <Text style={s.h1}>Tableau de bord</Text>
        {err && <Text style={s.err}>{err}</Text>}

        {data && (
          <>
            <View style={s.row}>
              <Kpi label="Aujourd'hui" value={fmtTND(data.revenue.today)} sub={`${data.counts.ordersToday} cmd.`} accent={COLORS.primary} />
              <Kpi label="En attente" value={String(data.counts.pending)} sub="à confirmer" accent={COLORS.warning} />
            </View>
            <View style={s.row}>
              <Kpi label="7 jours" value={fmtTND(data.revenue.week)} sub={`${data.counts.orders7d} cmd.`} accent={COLORS.info} />
              <Kpi label="30 jours" value={fmtTND(data.revenue.month)} sub={`${data.counts.orders30d} cmd.`} accent={COLORS.success} />
            </View>

            <Text style={s.h2}>Top produits (30j)</Text>
            <View style={s.card}>
              {data.topProducts.length === 0 && <Text style={s.dim}>Aucune vente pour l'instant</Text>}
              {data.topProducts.map((p, i) => (
                <TouchableOpacity key={p.id} style={[s.topRow, i > 0 && s.divider]} onPress={() => router.push(`/products/${p.id}`)}>
                  {p.image ? <Image source={{ uri: absUrl(p.image) }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: COLORS.cardAlt }]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={s.dim}>{p.qty} vendus · {fmtTND(p.revenue)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.h2}>Stock faible</Text>
            <View style={s.card}>
              {data.lowStock.length === 0 && <Text style={s.dim}>Tout va bien 👍</Text>}
              {data.lowStock.map((p, i) => (
                <TouchableOpacity key={p.id} style={[s.topRow, i > 0 && s.divider]} onPress={() => router.push(`/products/${p.id}`)}>
                  {p.image ? <Image source={{ uri: absUrl(p.image) }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: COLORS.cardAlt }]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={[s.dim, { color: p.stock === 0 ? COLORS.danger : COLORS.warning }]}>Stock: {p.stock}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <View style={[s.kpi, { borderLeftColor: accent }]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {sub && <Text style={s.kpiSub}>{sub}</Text>}
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
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "800", marginBottom: 16 },
  h2: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderColor: COLORS.border,
  },
  kpiLabel: { color: COLORS.textDim, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  kpiSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 4 },
  topRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  itemTitle: { color: COLORS.text, fontWeight: "600" },
  dim: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  err: { color: COLORS.danger, marginBottom: 8 },
});
