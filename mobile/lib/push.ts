import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushResult = {
  ok: boolean;
  token?: string;
  error?: string;
};

export async function registerForPushAndSync(): Promise<PushResult> {
  if (!Device.isDevice) {
    return { ok: false, error: "Émulateur détecté — les push ne marchent que sur un vrai téléphone." };
  }

  try {
    if (Platform.OS === "android") {
      // Channel id bumped to force recreation — Android channels are immutable
      // after first create, so changing the sound on an existing channel is a no-op.
      await Notifications.setNotificationChannelAsync("orders-v2", {
        name: "Nouvelles commandes",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: "#dc2626",
        sound: "order.wav",
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") {
      return { ok: false, error: "Permission notifications refusée. Activez-la dans Réglages Android." };
    }

    // Native device token (FCM on Android). Backend sends via FCM HTTP v1.
    let token: string;
    try {
      const tokenResp = await Notifications.getDevicePushTokenAsync();
      token = tokenResp.data as string;
    } catch (e) {
      return { ok: false, error: `Token push échoué: ${(e as Error).message}. (google-services.json manquant ?)` };
    }

    try {
      await api.registerDevice(
        token,
        Platform.OS === "ios" ? "ios" : "android",
        Device.modelName ?? undefined,
      );
    } catch (e) {
      return { ok: false, token, error: `Enregistrement serveur échoué: ${(e as Error).message}` };
    }

    return { ok: true, token };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
