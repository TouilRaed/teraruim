import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { COLORS, API_BASE_URL } from "@/lib/constants";
import { clearToken } from "@/lib/auth";
import { registerForPushAndSync } from "@/lib/push";

export default function Settings() {
  const router = useRouter();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushOk, setPushOk] = useState<boolean | null>(null);

  async function testPush() {
    setPushBusy(true);
    setPushStatus(null);
    const r = await registerForPushAndSync();
    setPushOk(r.ok);
    if (r.ok) {
      setPushStatus(`Activé ✓ token ...${(r.token ?? "").slice(-12)}`);
      Alert.alert("Notifications activées", "Appareil enregistré. Vous recevrez les nouvelles commandes.");
    } else {
      setPushStatus(r.error ?? "Échec inconnu");
      Alert.alert("Notifications", r.error ?? "Échec");
    }
    setPushBusy(false);
  }

  function logout() {
    Alert.alert("Déconnexion ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.h1}>Réglages</Text>

        <Text style={s.section}>Notifications</Text>
        <View style={s.card}>
          <Text style={s.dim}>
            Recevez une alerte à chaque nouvelle commande. Appuyez pour activer / vérifier.
          </Text>
          <TouchableOpacity style={s.pushBtn} onPress={testPush} disabled={pushBusy}>
            {pushBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.pushBtnText}>Activer / Tester les notifications</Text>}
          </TouchableOpacity>
          {pushStatus && (
            <Text style={[s.status, { color: pushOk ? COLORS.success : COLORS.danger }]}>{pushStatus}</Text>
          )}
        </View>

        <Text style={s.section}>Compte</Text>
        <View style={s.card}>
          <Row label="API" value={API_BASE_URL} />
          <Row label="Version" value="1.0.0" />
        </View>

        <TouchableOpacity style={s.logout} onPress={logout}>
          <Text style={s.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "800", marginBottom: 16 },
  section: { color: COLORS.textDim, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: COLORS.textDim, fontSize: 13 },
  rowValue: { color: COLORS.text, fontSize: 13, maxWidth: 220 },
  dim: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },
  pushBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  pushBtnText: { color: "#fff", fontWeight: "700" },
  status: { fontSize: 12, fontWeight: "600" },
  logout: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.danger + "55" },
  logoutText: { color: COLORS.danger, fontWeight: "700" },
});
