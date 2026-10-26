import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, StyleSheet, ActivityIndicator, View, Alert, Image } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { ProductForm } from "@/components/ProductForm";
import { COLORS, API_BASE_URL } from "@/lib/constants";
import { api, Product } from "@/lib/api";

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.product(id);
      setP(r);
    } catch {
      setP(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading) {
    return <Screen><View style={s.center}><ActivityIndicator color={COLORS.primary} /></View></Screen>;
  }
  if (!p) {
    return <Screen><Text style={{ color: COLORS.textDim, textAlign: "center", marginTop: 40 }}>Produit introuvable</Text></Screen>;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: COLORS.textDim }}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.h1}>Modifier produit</Text>
        {p.image && <Image source={{ uri: absUrl(p.image) }} style={s.preview} />}
        <ProductForm
          initial={{
            title: p.title,
            description: p.description,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            image: p.image,
            gallery: parseGallery(p.gallery),
            category: p.category,
            stock: p.stock,
            weight: p.weight,
            sku: p.sku,
          }}
          submitLabel="Enregistrer"
          onSubmit={async (data) => { await api.updateProduct(p.id, data); router.back(); }}
          onDelete={() => {
            Alert.alert("Supprimer ?", "Action irréversible.", [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: "destructive", onPress: async () => {
                  try { await api.deleteProduct(p.id); router.back(); }
                  catch (e) { Alert.alert("Erreur", (e as Error).message); }
                } },
            ]);
          }}
        />
      </ScrollView>
    </Screen>
  );
}

function absUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return u;
}

function parseGallery(g: string | null): string[] {
  if (!g) return [];
  try {
    const arr = JSON.parse(g);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { color: COLORS.text, fontSize: 26, fontWeight: "800", marginBottom: 14 },
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 14, backgroundColor: COLORS.card },
});
