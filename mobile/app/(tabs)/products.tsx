import { useCallback, useState } from "react";
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { COLORS, API_BASE_URL } from "@/lib/constants";
import { api, Product } from "@/lib/api";
import { fmtTND } from "@/lib/format";

export default function ProductsTab() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (reset = false) => {
    try {
      const r = await api.products({ q: q || undefined, cursor: reset ? undefined : cursor || undefined });
      setItems((prev) => reset ? r.products : [...prev, ...r.products]);
      setCursor(r.nextCursor);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [q, cursor]);

  useFocusEffect(useCallback(() => { setLoading(true); load(true); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen padded={false}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.h1}>Produits</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push("/products/new")}>
            <Text style={s.addBtnText}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={s.search}
          placeholder="Rechercher…"
          placeholderTextColor={COLORS.textMuted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => { setLoading(true); load(true); }}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setCursor(null); load(true); }} tintColor={COLORS.primary} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => { if (cursor && !loadingMore) { setLoadingMore(true); load(); } }}
          ListEmptyComponent={<Text style={s.empty}>Aucun produit</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/products/${item.id}`)}>
              <Image source={{ uri: absUrl(item.image) }} style={s.thumb} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <Text style={s.cat}>{item.category}</Text>
                <View style={s.priceRow}>
                  <Text style={s.price}>{fmtTND(item.price)}</Text>
                  <Text style={[s.stock, { color: item.stock === 0 ? COLORS.danger : item.stock < 5 ? COLORS.warning : COLORS.textDim }]}>
                    Stock: {item.stock}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

function absUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return u;
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "800" },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  search: {
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 15,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: COLORS.textDim, textAlign: "center", marginTop: 40 },
  card: { flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 14, padding: 10, gap: 12, alignItems: "center" },
  thumb: { width: 70, height: 70, borderRadius: 10, backgroundColor: COLORS.cardAlt },
  title: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  cat: { color: COLORS.textDim, fontSize: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  price: { color: COLORS.accent, fontWeight: "800" },
  stock: { fontSize: 12, fontWeight: "600" },
});
