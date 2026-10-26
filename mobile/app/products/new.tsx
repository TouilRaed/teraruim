import { ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { ProductForm } from "@/components/ProductForm";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";

export default function NewProduct() {
  const router = useRouter();
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: COLORS.textDim }}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.h1}>Nouveau produit</Text>
        <ProductForm
          submitLabel="Créer"
          onSubmit={async (data) => { await api.createProduct(data); router.back(); }}
        />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  h1: { color: COLORS.text, fontSize: 26, fontWeight: "800", marginBottom: 18 },
});
