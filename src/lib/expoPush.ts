import { db } from "@/lib/db";
import { GoogleAuth } from "google-auth-library";

// Firebase Cloud Messaging HTTP v1 sender.
// Reads a service-account JSON from FCM_SERVICE_ACCOUNT (stringified) and
// sends a push to every registered admin device (native FCM tokens).

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

function getServiceAccount(): { project_id: string; client_email: string; private_key: string } | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("FCM_SERVICE_ACCOUNT is not valid JSON");
    return null;
  }
}

let cachedAuth: GoogleAuth | null = null;
function getAuth(sa: { client_email: string; private_key: string }): GoogleAuth {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
      scopes: [FCM_SCOPE],
    });
  }
  return cachedAuth;
}

export function fcmEnabled(): boolean {
  return Boolean(process.env.FCM_SERVICE_ACCOUNT);
}

/**
 * Send a push to every registered admin device. Fire-and-forget.
 * Removes tokens FCM reports as unregistered.
 */
export async function notifyAdmins(payload: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const sa = getServiceAccount();
  if (!sa) {
    console.warn("FCM not configured (FCM_SERVICE_ACCOUNT missing) — skipping push");
    return;
  }

  const devices = await db.adminDevice.findMany({ select: { token: true } }).catch(() => []);
  if (devices.length === 0) return;

  let accessToken: string | null = null;
  try {
    const auth = getAuth(sa);
    const client = await auth.getClient();
    const tok = await client.getAccessToken();
    accessToken = typeof tok === "string" ? tok : tok?.token ?? null;
  } catch (e) {
    console.error("FCM auth failed:", (e as Error).message);
    return;
  }
  if (!accessToken) {
    console.error("FCM: no access token");
    return;
  }

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  // Data values must be strings.
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload.data ?? {})) data[k] = String(v);

  const deadTokens: string[] = [];
  await Promise.all(
    devices.map(async (d) => {
      const message = {
        message: {
          token: d.token,
          notification: { title: payload.title, body: payload.body },
          data,
          android: {
            priority: "high" as const,
            notification: {
              channelId: "orders-v2",
              sound: "order",
              notificationPriority: "PRIORITY_MAX" as const,
              defaultVibrateTimings: false,
              vibrateTimings: ["0s", "0.4s", "0.2s", "0.4s"],
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: "order.wav",
                "interruption-level": "time-sensitive",
              },
            },
          },
        },
      };
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          // UNREGISTERED / invalid token → prune
          if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) {
            deadTokens.push(d.token);
          }
          console.error("FCM send failed", res.status, text.slice(0, 200));
        }
      } catch (e) {
        console.error("FCM send error:", (e as Error).message);
      }
    })
  );

  if (deadTokens.length) {
    await db.adminDevice.deleteMany({ where: { token: { in: deadTokens } } }).catch(() => null);
  }
}
