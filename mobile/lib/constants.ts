import Constants from "expo-constants";

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) || "https://teraruim.vercel.app";

export const COLORS = {
  bg: "#1C130B",
  card: "#241910",
  cardAlt: "#2E2114",
  border: "#3A2A1A",
  text: "#FBF7F0",
  textDim: "#C8B79F",
  textMuted: "#968574",
  primary: "#B45309",
  primaryDark: "#92400E",
  accent: "#C8A04A",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
} as const;

export const ORDER_STATUSES = [
  "cart_abandoned",
  "pending",
  "confirmed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "return_not_received",
  "cancelled",
  "return_received",
  "paid",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  cart_abandoned:      { label: "Panier abandonné",   color: "#71717a", icon: "🛒" },
  pending:             { label: "En attente",         color: "#f59e0b", icon: "⏳" },
  confirmed:           { label: "Confirmée",          color: "#10b981", icon: "✅" },
  ready_to_ship:       { label: "Prêt à expédier",    color: "#0ea5e9", icon: "📦" },
  shipped:             { label: "Expédiée",           color: "#3b82f6", icon: "🚚" },
  delivered:           { label: "Livrée",             color: "#22c55e", icon: "🎁" },
  return_not_received: { label: "Retour non reçu",    color: "#f97316", icon: "↩️" },
  cancelled:           { label: "Annulée",            color: "#ef4444", icon: "✖️" },
  return_received:     { label: "Retour reçu",        color: "#a855f7", icon: "↩️" },
  paid:                { label: "Payée",              color: "#6366f1", icon: "💵" },
};
