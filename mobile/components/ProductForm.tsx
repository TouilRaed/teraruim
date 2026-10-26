import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { COLORS } from "@/lib/constants";
import { ProductInput } from "@/lib/api";

type Props = {
  initial?: Partial<ProductInput>;
  submitLabel: string;
  onSubmit: (data: ProductInput) => Promise<void>;
  onDelete?: () => void;
};

export function ProductForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [compareAt, setCompareAt] = useState(initial?.compareAtPrice != null ? String(initial.compareAtPrice) : "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [stock, setStock] = useState(String(initial?.stock ?? "100"));
  const [weight, setWeight] = useState(String(initial?.weight ?? "0.5"));
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!title.trim()) { Alert.alert("Titre requis"); return; }
    if (!description.trim()) { Alert.alert("Description requise"); return; }
    if (!image.trim() || (!image.startsWith("https://") && !image.startsWith("/uploads/"))) {
      Alert.alert("Image", "URL https:// ou /uploads/ requise");
      return;
    }
    const priceN = parseFloat(price);
    if (!isFinite(priceN) || priceN < 0) { Alert.alert("Prix invalide"); return; }
    const stockN = parseInt(stock, 10);
    if (!isFinite(stockN) || stockN < 0) { Alert.alert("Stock invalide"); return; }
    const weightN = parseFloat(weight);
    if (!isFinite(weightN) || weightN < 0) { Alert.alert("Poids invalide"); return; }
    const compareN = compareAt.trim() ? parseFloat(compareAt) : null;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        price: priceN,
        compareAtPrice: compareN,
        image: image.trim(),
        category: category.trim() || "Autre",
        stock: stockN,
        weight: weightN,
        sku: sku.trim() || null,
      });
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Field label="Titre" value={title} onChangeText={setTitle} />
      <Field label="Description" value={description} onChangeText={setDescription} multiline />
      <View style={s.row}>
        <View style={{ flex: 1 }}><Field label="Prix (TND)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Prix barré" value={compareAt} onChangeText={setCompareAt} keyboardType="decimal-pad" /></View>
      </View>
      <Field label="Image (URL https:// ou /uploads/…)" value={image} onChangeText={setImage} autoCapitalize="none" />
      <Field label="Catégorie" value={category} onChangeText={setCategory} />
      <View style={s.row}>
        <View style={{ flex: 1 }}><Field label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View>
      </View>
      <Field label="SKU (optionnel)" value={sku ?? ""} onChangeText={setSku} autoCapitalize="characters" />

      <TouchableOpacity style={s.submit} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{submitLabel}</Text>}
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity style={s.danger} onPress={onDelete} disabled={loading}>
          <Text style={s.dangerText}>Supprimer le produit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "characters";
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        placeholderTextColor={COLORS.textMuted}
        style={[s.input, multiline && { minHeight: 90, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  label: { color: COLORS.textDim, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 15,
  },
  submit: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 6 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  danger: { paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.danger + "55", marginTop: 8 },
  dangerText: { color: COLORS.danger, fontWeight: "700" },
});
