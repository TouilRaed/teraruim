import { API_BASE_URL } from "./constants";
import { getToken, clearToken } from "./auth";
import { router } from "expo-router";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean };

export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };

  const auth = opts.auth ?? true;
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...opts, headers, body });

  if (res.status === 401 && auth) {
    await clearToken();
    router.replace("/login");
    throw new ApiError(401, "Session expirée");
  }

  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;

  if (!res.ok) {
    const msg = (json as { error?: string } | null)?.error || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, json);
  }
  return json as T;
}

// Typed wrappers
export const api = {
  login: (password: string, code?: string) =>
    apiFetch<{ ok: true; token: string }>("/api/admin/mobile/login", {
      method: "POST",
      body: { password, code },
      auth: false,
    }),
  stats: () => apiFetch<StatsResp>("/api/admin/mobile/stats"),
  orders: (params: { status?: string; q?: string; cursor?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    const tail = qs.toString();
    return apiFetch<OrdersResp>(`/api/admin/mobile/orders${tail ? `?${tail}` : ""}`);
  },
  order: (id: string) => apiFetch<OrderFull>(`/api/admin/mobile/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    apiFetch<{ ok: true }>(`/api/admin/orders/${id}`, { method: "PATCH", body: { status } }),
  deleteOrder: (id: string) =>
    apiFetch<{ ok: true }>(`/api/admin/orders/${id}`, { method: "DELETE" }),
  product: (id: string) => apiFetch<Product>(`/api/admin/mobile/products/${id}`),
  products: (params: { q?: string; cursor?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    const tail = qs.toString();
    return apiFetch<ProductsResp>(`/api/admin/mobile/products${tail ? `?${tail}` : ""}`);
  },
  createProduct: (data: ProductInput) =>
    apiFetch<{ ok: true; id: string }>("/api/admin/products", { method: "POST", body: data }),
  updateProduct: (id: string, data: ProductInput) =>
    apiFetch<{ ok: true }>(`/api/admin/products/${id}`, { method: "PATCH", body: data }),
  deleteProduct: (id: string) =>
    apiFetch<{ ok: true }>(`/api/admin/products/${id}`, { method: "DELETE" }),
  registerDevice: (token: string, platform: "ios" | "android", deviceName?: string) =>
    apiFetch<{ ok: true }>("/api/admin/mobile/devices", {
      method: "POST",
      body: { token, platform, deviceName },
    }),
  unregisterDevice: (token: string) =>
    apiFetch<{ ok: true }>(`/api/admin/mobile/devices?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    }),
};

// Types
export type StatsResp = {
  counts: { ordersToday: number; orders7d: number; orders30d: number; pending: number; productsCount: number };
  revenue: { today: number; week: number; month: number };
  topProducts: { id: string; title: string; image: string | null; qty: number; revenue: number }[];
  lowStock: { id: string; title: string; stock: number; image: string }[];
};

export type OrderItem = {
  id: string;
  productId: string;
  qty: number;
  price: number;
  product?: { id: string; title: string; image: string; price?: number } | null;
};

export type Order = {
  id: string;
  guestName: string | null;
  total: number;
  status: string;
  addOnsSummary: string | null;
  shipperOrderId: number | null;
  trackingStatus: string | null;
  adexBarcode: string | null;
  adexLabelUrl: string | null;
  shipAddress: string | null;
  shipCity: string | null;
  shipGovernorate: string | null;
  shipPhone: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OrderFull = Order;
export type OrdersResp = { orders: Order[]; nextCursor: string | null };

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  gallery: string | null;
  category: string;
  stock: number;
  weight: number;
  sku: string | null;
  shipperProductId: number | null;
  createdAt: string;
};

export type ProductsResp = { products: Product[]; nextCursor: string | null };

export type ProductInput = {
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  gallery?: string[];
  category: string;
  stock: number;
  weight: number;
  sku?: string | null;
};
