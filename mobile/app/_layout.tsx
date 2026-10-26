import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { View, ActivityIndicator } from "react-native";
import { loadToken, useAuthToken } from "@/lib/auth";
import { registerForPushAndSync } from "@/lib/push";
import { COLORS } from "@/lib/constants";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { token } = useAuthToken();
  const authed = Boolean(token);
  const router = useRouter();
  const segments = useSegments();

  // Load persisted token once on mount.
  useEffect(() => {
    loadToken().finally(() => setReady(true));
  }, []);

  // React to auth changes AND navigation. `authed` is reactive (store-backed),
  // so login/logout flip it immediately and this effect re-routes correctly.
  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "login";
    if (!authed && !inAuthGroup) router.replace("/login");
    else if (authed && inAuthGroup) router.replace("/(tabs)/dashboard");
  }, [ready, authed, segments, router]);

  // Re-sync push token on every authenticated launch (covers already-logged-in users).
  useEffect(() => {
    if (ready && authed) registerForPushAndSync().catch(() => {});
  }, [ready, authed]);

  // Tap-to-open order from notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as { type?: string; orderId?: string };
      if (data?.type === "new_order" && data.orderId) {
        router.push(`/orders/${data.orderId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="orders/[id]" />
          <Stack.Screen name="products/new" />
          <Stack.Screen name="products/[id]" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
