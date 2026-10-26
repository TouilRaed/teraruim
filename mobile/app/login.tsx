import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { COLORS } from "@/lib/constants";
import { api, ApiError } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { registerForPushAndSync } from "@/lib/push";

export default function LoginScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [need2fa, setNeed2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!password) { setError("Mot de passe requis"); return; }
    setLoading(true);
    try {
      const r = await api.login(password, code || undefined);
      await saveToken(r.token);
      registerForPushAndSync().catch(() => null);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      if (e instanceof ApiError) {
        const payload = e.payload as { need2fa?: boolean } | null;
        if (payload?.need2fa) {
          setNeed2fa(true);
          setError("Code 2FA requis");
        } else {
          setError(e.message);
        }
      } else {
        setError("Erreur réseau");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
        <View style={s.brand}>
          <Text style={s.title}>
            <Text style={{ color: COLORS.primary }}>Koto</Text>
            <Text style={{ color: COLORS.accent }}>bi</Text>
          </Text>
          <Text style={s.subtitle}>Console Admin</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Mot de passe admin"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {need2fa && (
            <TextInput
              style={[s.input, s.code]}
              placeholder="Code 2FA"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
          )}
          {error && <Text style={s.error}>{error}</Text>}
          <TouchableOpacity style={s.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Se connecter</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  brand: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 42, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 4, textTransform: "uppercase", letterSpacing: 2 },
  form: { gap: 12 },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  code: { textAlign: "center", letterSpacing: 8, fontVariant: ["tabular-nums"] },
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: COLORS.danger, fontSize: 13, textAlign: "center" },
});
